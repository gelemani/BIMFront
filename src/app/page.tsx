"use client";

import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
// Импортируем Color из three для установки фонового цвета напрямую
import { Color } from "three";

interface IfcElementProperties {
    id: number;
    [key: string]: string | number | boolean | null;
}

interface Comment {
    text: string;
}

// Возможные вкладки
type TabType = "auth" | "register" | "projects" | "viewer";

export default function Viewer() {
    // ====================== Состояния для вкладок и авторизации ======================
    const [activeTab, setActiveTab] = useState<TabType>("auth");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Авторизационные данные
    const [loginData, setLoginData] = useState({ username: "", password: "" });
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Данные для регистрации
    const [registerData, setRegisterData] = useState({ username: "", password: "", email: "" });
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Авторизация
    const handleLogin = () => {
        // Простая проверка: поля не должны быть пустыми
        if (loginData.username.trim() && loginData.password.trim()) {
            setIsAuthenticated(true);
            setActiveTab("projects"); // после авторизации идём на вкладку "выбор проекта"
        } else {
            alert("Введите имя пользователя и пароль");
        }
    };

    // Регистрация
    const handleRegister = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Регулярка для проверки email

        if (!registerData.username.trim() || !registerData.password.trim() || !registerData.email.trim()) {
            alert("Заполните все поля для регистрации");
            return;
        }

        if (!emailRegex.test(registerData.email)) {
            alert("Введите корректный email");
            return;
        }

        alert("Регистрация прошла успешно!");
        setActiveTab("auth"); // Переход на вкладку авторизации
    };


    // ====================== Состояния и логика IFC Viewer ======================
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewer = useRef<IfcViewerAPI | null>(null);

    // Режим просмотра
    const [viewMode, setViewMode] = useState<"normal" | "elementView">("normal");

    // Тёмная/светлая тема
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Выбранный элемент
    const [selectedElement, setSelectedElement] = useState<IfcElementProperties | null>(null);

    // Комментарии
    const [comments, setComments] = useState<Record<number, Comment[]>>({});

    // Модальное окно комментариев
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Текст нового комментария
    const [newComment, setNewComment] = useState("");

    // JSON модели (если нужно)
    const [, setModelJson] = useState<string>("");

    // Перетаскивание окна
    const [modalPosition, setModalPosition] = useState(() => {
        if (typeof window !== "undefined") {
            return { x: window.innerWidth - 320, y: 100 };
        }
        return { x: 100, y: 100 };
    });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // ====================== Инициализация IFC Viewer ======================
    useEffect(() => {
        // Инициализируем только если:
        // 1) вкладка "viewer"
        // 2) пользователь авторизован
        // 3) viewer ещё не создан
        if (activeTab !== "viewer" || !isAuthenticated) return;
        if (!containerRef.current || viewer.current) return;

        viewer.current = new IfcViewerAPI({
            container: containerRef.current,
        });

        viewer.current.grid.setGrid();
        viewer.current.axes.setAxes();

        // Задаём путь к wasm
        const wasmUrl: string = "../../../";
        viewer.current.IFC.setWasmPath(wasmUrl);

        // Пробуем установить голубой фон
        // viewer.current.context.renderer.renderer.setClearColor("#efeaea", 1);

        // Также напрямую меняем фон сцены (на случай, если что-то мешает)
        viewer.current.context.getScene().background = new Color("#efeaea");

        // Если есть environment, обнуляем
        viewer.current.context.getScene().environment = null;

        return () => {
            if (viewer.current) {
                viewer.current.dispose();
                viewer.current = null;
            }
        };
    }, [activeTab, isAuthenticated]);

    // ====================== Логика перетаскивания модалки ======================
    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!isDragging || !dragStart) return;
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            setModalPosition({ x: newX, y: newY });
        }
        function onMouseUp() {
            setIsDragging(false);
        }
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [isDragging, dragStart]);

    // ====================== Загрузка файла .ifc ======================
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !viewer.current) return;

        const fileURL = URL.createObjectURL(file);
        const model = await viewer.current.IFC.loadIfcUrl(fileURL);

        // Удаляем сетку и оси (по желанию)
        viewer.current.axes.dispose();
        viewer.current.grid.dispose();

        console.log("IFC file loaded:", file.name);

        const ifcManager = viewer.current.IFC.loader.ifcManager;
        const modelID = model.modelID;
        const IFC_BUILDING_ELEMENT_TYPE = 300;

        // Получаем все элементы типа IFC_BUILDING_ELEMENT
        const allItems = await ifcManager.getAllItemsOfType(modelID, IFC_BUILDING_ELEMENT_TYPE, false);
        console.log("Все элементы модели:", allItems);

        // Собираем их свойства
        const allProperties = [];
        for (const id in allItems) {
            const numericId = parseInt(id, 10);
            const properties = await ifcManager.getItemProperties(modelID, numericId);
            allProperties.push(properties);
        }
        console.log("Свойства всех элементов модели:", allProperties);

        // Сохраняем в JSON (если нужно)
        setModelJson(JSON.stringify(allProperties, null, 2));
    };

    // ====================== Клик по сцене ======================
    const handleClick = async () => {
        if (!viewer.current || viewMode === "normal") return;

        const result = await viewer.current.IFC.selector.pickIfcItem();
        if (result) {
            const properties = await viewer.current.IFC.loader.ifcManager.getItemProperties(
                result.modelID,
                result.id
            );
            // Если выбрали другой элемент, сбрасываем ввод
            if (selectedElement?.id !== properties.id) {
                setNewComment("");
            }
            setSelectedElement(properties);
            setIsModalOpen(true);
        } else {
            clearSelection();
        }
    };

    // Снять выделение
    const clearSelection = () => {
        if (viewer.current) {
            viewer.current.IFC.unpickIfcItems();
        }
        setSelectedElement(null);
        setIsModalOpen(false);
    };

    // Переключение режима
    const changeViewMode = (mode: "normal" | "elementView") => {
        setViewMode(mode);
        if (mode === "normal") {
            clearSelection();
        }
    };

    // Переключение темы
    const toggleTheme = () => {
        setIsDarkMode((prevMode) => !prevMode);
        document.documentElement.setAttribute("data-theme", !isDarkMode ? "dark" : "light");
    };

    // Работа с комментариями
    const handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewComment(event.target.value);
    };
    const saveComment = () => {
        if (!selectedElement) return;
        const elementId = selectedElement.id;
        const commentText = newComment.trim();
        if (!commentText) return;

        setComments((prevComments) => {
            const updatedComments = { ...prevComments };
            if (!updatedComments[elementId]) {
                updatedComments[elementId] = [];
            }
            updatedComments[elementId].push({ text: commentText });
            return updatedComments;
        });
        setNewComment("");
    };

    // Открыть JSON
    const openSelectedElementJsonWindow = () => {
        if (!selectedElement) return;
        const newWindow = window.open("", "SelectedElementData", "width=600,height=400");
        if (newWindow) {
            newWindow.document.write(`
        <html>
          <head>
            <title>Данные выбранного элемента (JSON)</title>
            <style>
              body {
                font-family: sans-serif;
                padding: 10px;
                background: ${isDarkMode ? "#333" : "#fff"};
                color: ${isDarkMode ? "#fff" : "#000"};
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <h4>Данные выбранного элемента (JSON):</h4>
            <pre>${JSON.stringify(selectedElement, null, 2)}</pre>
          </body>
        </html>
      `);
            newWindow.document.close();
        }
    };

    // Начало перетаскивания
    const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - modalPosition.x,
            y: e.clientY - modalPosition.y,
        });
    };

    // ====================== Вкладка выбора проекта (заглушка) ======================
    const [selectedProject, setSelectedProject] = useState("");
    const projects = ["Проект A", "Проект B", "Проект C"];

    const handleSelectProject = (project: string) => {
        setSelectedProject(project);
        setActiveTab("viewer");
    };

    return (
        <div className={isDarkMode ? "dark-theme" : "light-theme"}>
            {/* Кнопки вкладок справа */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginBottom: "10px",
                }}
            >
                {selectedProject && (
                    <p style={{margin: "7px 0 0 13px", position: "relative", flexGrow: 1}}>
                        <b>{selectedProject}</b>
                    </p>
                )}
                <button
                    onClick={() => setActiveTab("auth")}
                    className={activeTab === "auth" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Авторизация
                </button>
                <button
                    onClick={() => setActiveTab("register")}
                    className={activeTab === "register" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Регистрация
                </button>
                <button
                    onClick={() => setActiveTab("projects")}
                    className={activeTab === "projects" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Выбор проекта
                </button>
                <button
                    onClick={() => setActiveTab("viewer")}
                    className={activeTab === "viewer" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Viewer
                </button>
            </div>

            {/* Вкладка Авторизация */}
            {activeTab === "auth" && (
                <div style={{ padding: "20px" }}>
                    <h2>Авторизация</h2>
                    <div style={{ marginBottom: "10px" }}>
                        <input
                            type="text"
                            name="username"
                            value={loginData.username}
                            onChange={handleLoginChange}
                            placeholder="Имя пользователя"
                            style={{ padding: "8px", width: "200px" }}
                        />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                        <input
                            type="password"
                            name="password"
                            value={loginData.password}
                            onChange={handleLoginChange}
                            placeholder="Пароль"
                            style={{ padding: "8px", width: "200px" }}
                        />
                    </div>
                    <button onClick={handleLogin} style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "#fff" }}>
                        Войти
                    </button>
                </div>
            )}

            {/* Вкладка Регистрация */}
            {activeTab === "register" && (
                <div style={{ padding: "20px" }}>
                    <h2>Регистрация</h2>
                    <div style={{ marginBottom: "10px" }}>
                        <input
                            type="text"
                            name="username"
                            value={registerData.username}
                            onChange={handleRegisterChange}
                            placeholder="Имя пользователя"
                            style={{ padding: "8px", width: "200px" }}
                        />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                        <input
                            type="password"
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            placeholder="Пароль"
                            style={{ padding: "8px", width: "200px" }}
                        />
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                        <input
                            type="email"
                            name="email"
                            value={registerData.email}
                            onChange={handleRegisterChange}
                            placeholder="Email"
                            style={{ padding: "8px", width: "200px" }}
                        />
                    </div>
                    <button onClick={handleRegister} style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "#fff" }}>
                        Зарегистрироваться
                    </button>
                </div>
            )}

            {/* Вкладка Выбор проекта */}
            {activeTab === "projects" && isAuthenticated && (
                <div style={{ padding: "20px" }}>
                    <h2>Выбор проекта</h2>
                    <p>Текущий пользователь: <b>{loginData.username}</b></p>
                    <ul>
                        {projects.map((proj) => (
                            <li key={proj}>
                                <button
                                    onClick={() => handleSelectProject(proj)}
                                    style={{
                                        backgroundColor: selectedProject === proj ? "#ccc" : "",
                                        padding: "6px 10px",
                                        margin: "4px 0",
                                    }}
                                >
                                    {proj}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {selectedProject && (
                        <p>
                            Выбран проект: <b>{selectedProject}</b>
                        </p>
                    )}
                </div>
            )}

            {/* Вкладка 3D Viewer */}
            {activeTab === "viewer" && isAuthenticated && (
                <>
                    {/* Панель управления */}
                    <div
                        style={{
                            marginBottom: "10px",
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                        }}
                    >
                        <button
                            className={`button blue-button ${viewMode === "normal" ? "active" : ""}`}
                            onClick={() => changeViewMode("normal")}
                        >
                            Обычный режим
                        </button>
                        <button
                            className={`button ${viewMode === "elementView" ? "active" : ""}`}
                            onClick={() => changeViewMode("elementView")}
                        >
                            Режим просмотра элементов
                        </button>
                        <div className="theme-toggler">
                            <label className={`theme-switch ${isDarkMode ? "active" : ""}`}>
                                <input
                                    type="checkbox"
                                    checked={isDarkMode}
                                    onChange={toggleTheme}
                                    className="theme-checkbox"
                                />
                                <span className="slider"></span>
                            </label>
                            <span className="theme-text">
                {isDarkMode ? "Тёмная тема" : "Светлая тема"}
              </span>
                        </div>
                    </div>

                    {/* Загрузка IFC-файла */}
                    <label className="custom-file-upload">
                        <input type="file" accept=".ifc" onChange={handleFileUpload} />
                        Загрузить файл
                    </label>

                    {/* Контейнер для 3D-просмотра */}
                    <div
                        ref={containerRef}
                        style={{
                            position: "absolute",
                            right: "12px",
                            width: "calc(100% - 24px)",
                            height: "80vh",
                            border: "1px solid #ccc",
                        }}
                        onClick={handleClick}
                    ></div>

                    {/* Модальное окно комментариев */}
                    {isModalOpen && selectedElement && (
                        <div
                            className="comment-modal"
                            style={{
                                position: "absolute",
                                left: modalPosition.x,
                                top: modalPosition.y,
                                width: 300,
                                backgroundColor: isDarkMode ? "#444" : "#fff",
                                color: isDarkMode ? "#fff" : "#000",
                                border: "1px solid #ccc",
                                borderRadius: 8,
                                padding: "10px",
                                zIndex: 9999,
                            }}
                        >
                            <div
                                style={{
                                    cursor: "move",
                                    padding: "5px",
                                    borderBottom: "1px solid #ccc",
                                    marginBottom: "5px",
                                }}
                                onMouseDown={startDrag}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <h3 style={{ margin: "10px" }}>Комментарии</h3>
                                    <button
                                        className="close"
                                        onClick={clearSelection}
                                        style={{
                                            border: "none",
                                            fontSize: "16px",
                                            cursor: "pointer",
                                            padding: "1.1em",
                                            margin: "0 10px 0 0",
                                            width: "20px",
                                            height: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>

                            <textarea
                                value={newComment}
                                onChange={handleCommentChange}
                                placeholder="Введите комментарий..."
                                style={{
                                    width: "100%",
                                    minHeight: "50px",
                                    marginBottom: "5px",
                                }}
                            />
                            <div style={{ display: "flex", gap: "5px" }}>
                                <button className="save" onClick={saveComment}>
                                    Сохранить
                                </button>
                                <button className="button" onClick={openSelectedElementJsonWindow}>
                                    Открыть JSON
                                </button>
                            </div>
                            <div style={{ marginTop: "10px" }}>
                                <h4>Комментарии:</h4>
                                <ul>
                                    {comments[selectedElement.id]?.map((comment, index) => (
                                        <li key={index}>{comment.text}</li>
                                    )) || <li>Нет комментариев</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}