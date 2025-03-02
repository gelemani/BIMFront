"use client";

import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Color } from "three";

interface IfcElementProperties {
    id: number;
    [key: string]: string | number | boolean | null;
}

interface Comment {
    text: string;
}

type TabType = "auth" | "register" | "projects" | "viewer";

export default function Viewer() {
    const [activeTab, setActiveTab] = useState<TabType>("auth");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // userID для идентификации на бэкенде
    const [userID, setUserID] = useState<number | null>(null);

    // Данные для авторизации
    const [loginData, setLoginData] = useState({ username: "", password: "" });
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Данные для регистрации
    const [registerData, setRegisterData] = useState({
        login: "",
        userName: "",
        userSurname: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Авторизация
    const handleLogin = () => {
        if (loginData.username.trim() && loginData.password.trim()) {
            // Здесь запрос к бэкенду...
            setUserID(1); // Пример ID
            setIsAuthenticated(true);
            setActiveTab("projects");
        } else {
            alert("Введите имя пользователя и пароль");
        }
    };

    // Регистрация
    const handleRegister = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (
            !registerData.login.trim() ||
            !registerData.userName.trim() ||
            !registerData.userSurname.trim() ||
            !registerData.email.trim() ||
            !registerData.password.trim() ||
            !registerData.confirmPassword.trim()
        ) {
            alert("Заполните все поля для регистрации");
            return;
        }
        if (!emailRegex.test(registerData.email)) {
            alert("Введите корректный email");
            return;
        }
        if (registerData.password !== registerData.confirmPassword) {
            alert("Пароли не совпадают");
            return;
        }
        // Успешная регистрация (запрос к бэкенду)
        setUserID(2); // Пример ID
        setIsAuthenticated(true);
        setActiveTab("projects");
    };

    // Viewer
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewer = useRef<IfcViewerAPI | null>(null);

    const [viewMode, setViewMode] = useState<"normal" | "elementView">("normal");
    const [isDarkMode, setIsDarkMode] = useState(false);

    // При смене isDarkMode выставляем атрибут data-theme
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    // Изменяем фон сцены при переключении темы (если Viewer инициализирован)
    useEffect(() => {
        if (viewer.current) {
            viewer.current.context.getScene().background = new Color(isDarkMode ? "#333333" : "#efeaea");
        }
    }, [isDarkMode]);

    // Компонент переключателя темы
    const ThemeToggler = () => (
        <div style={{ display: "flex", alignItems: "center" }}>
            <label className={`theme-switch ${isDarkMode ? "active" : ""}`}>
                <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={() => setIsDarkMode((prev) => !prev)}
                    className="theme-checkbox"
                />
                <span className="slider"></span>
            </label>
            <span style={{ marginLeft: "8px" }} className="theme-text">
        {isDarkMode ? "Тёмная тема" : "Светлая тема"}
      </span>
        </div>
    );

    // Выбранный элемент
    const [selectedElement, setSelectedElement] = useState<IfcElementProperties | null>(null);

    // Комментарии
    const [comments, setComments] = useState<Record<number, Comment[]>>({});

    // Поле для ввода нового комментария
    const [newComment, setNewComment] = useState("");

    // Для отладки (хранение JSON свойств модели)
    const [, setModelJson] = useState<string>("");

    // Модальное окно
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Позиция модального окна и переменные для «перетаскивания»
    const [modalPosition, setModalPosition] = useState(() => {
        if (typeof window !== "undefined") {
            return { x: window.innerWidth - 340, y: 100 };
        }
        return { x: 100, y: 100 };
    });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Загрузка модели
    useEffect(() => {
        if (activeTab !== "viewer" || !isAuthenticated) return;
        if (!containerRef.current || viewer.current) return;

        viewer.current = new IfcViewerAPI({ container: containerRef.current });
        viewer.current.grid.setGrid();
        viewer.current.axes.setAxes();
        viewer.current.IFC.setWasmPath("../../../");
        // Учитываем тему при первом рендере Viewer
        viewer.current.context.getScene().background = new Color(isDarkMode ? "#333333" : "#efeaea");

        return () => {
            if (viewer.current) {
                viewer.current.dispose();
                viewer.current = null;
            }
        };
    }, [activeTab, isAuthenticated, isDarkMode]);

    // Логика перетаскивания модального окна
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

    const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - modalPosition.x,
            y: e.clientY - modalPosition.y,
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !viewer.current) return;
        const fileURL = URL.createObjectURL(file);
        const model = await viewer.current.IFC.loadIfcUrl(fileURL);

        viewer.current.axes.dispose();
        viewer.current.grid.dispose();

        const ifcManager = viewer.current.IFC.loader.ifcManager;
        const modelID = model.modelID;
        const IFC_BUILDING_ELEMENT_TYPE = 300;

        const allItems = await ifcManager.getAllItemsOfType(modelID, IFC_BUILDING_ELEMENT_TYPE, false);
        console.log("Все элементы модели:", allItems);

        const allProperties = [];
        for (const id in allItems) {
            const numericId = parseInt(id, 10);
            const properties = await ifcManager.getItemProperties(modelID, numericId);
            allProperties.push(properties);
        }
        console.log("Свойства всех элементов модели:", allProperties);
        setModelJson(JSON.stringify(allProperties, null, 2));
    };

    // Клик по сцене (выбор элемента)
    const handleClick = async () => {
        if (!viewer.current || viewMode === "normal") return;
        const result = await viewer.current.IFC.selector.pickIfcItem();
        if (result) {
            const properties = await viewer.current.IFC.loader.ifcManager.getItemProperties(
                result.modelID,
                result.id
            );
            setNewComment("");
            setSelectedElement(properties);
            setIsModalOpen(true);
        } else {
            clearSelection();
        }
    };

    // Сброс выбора элемента
    const clearSelection = () => {
        if (viewer.current) {
            viewer.current.IFC.unpickIfcItems();
        }
        setSelectedElement(null);
        setIsModalOpen(false);
        setNewComment("");
    };

    // Смена режима просмотра
    const changeViewMode = (mode: "normal" | "elementView") => {
        setViewMode(mode);
        if (mode === "normal") {
            clearSelection();
        }
    };

    // Добавление комментария
    const saveComment = () => {
        if (!selectedElement) return;
        const elementId = selectedElement.id;
        const commentText = newComment.trim();
        if (!commentText) return;

        setComments((prevComments) => {
            const updated = { ...prevComments };
            if (!updated[elementId]) {
                updated[elementId] = [];
            }
            if (!updated[elementId].some((c) => c.text === commentText)) {
                updated[elementId].push({ text: commentText });
            }
            return updated;
        });
        setNewComment("");
    };

    // Открыть JSON выбранного элемента
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

    // Выбор проекта
    const [selectedProject, setSelectedProject] = useState("");
    const projects = ["Проект A", "Проект B", "Проект C"];
    const handleSelectProject = (project: string) => {
        setSelectedProject(project);
        setActiveTab("viewer");
    };

    return (
        <div className={isDarkMode ? "dark-theme" : "light-theme"}>
            {/* ШАПКА: кнопки и toggler справа */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end", // все вправо
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "10px",
                }}
            >
                <button
                    onClick={() => setActiveTab("auth")}
                    className={activeTab === "auth" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Войти
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
                    Проекты
                </button>
                <button
                    onClick={() => setActiveTab("viewer")}
                    className={activeTab === "viewer" ? "active" : ""}
                    style={{ padding: "8px 16px" }}
                >
                    Viewer
                </button>
                {/* Тогглер темы */}
                <ThemeToggler />
            </div>

            {/* Вкладка "Авторизация" (центрирована) */}
            {activeTab === "auth" && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "calc(100vh - 60px)",
                    }}
                >
                    <div style={{ padding: "20px" }}>
                        <h2>Авторизация</h2>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                name="username"
                                value={loginData.username}
                                onChange={handleLoginChange}
                                placeholder="Почта или логин"
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
                        <button onClick={handleLogin} style={{ padding: "8px 16px", color: "#fff" }}>
                            Войти
                        </button>
                    </div>
                </div>
            )}

            {/* Вкладка "Регистрация" (центрирована) */}
            {activeTab === "register" && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "calc(100vh - 60px)",
                    }}
                >
                    <div style={{ padding: "20px" }}>
                        <h2>Регистрация</h2>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                name="login"
                                value={registerData.login}
                                onChange={handleRegisterChange}
                                placeholder="Логин"
                                style={{ padding: "8px", width: "200px" }}
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                name="userName"
                                value={registerData.userName}
                                onChange={handleRegisterChange}
                                placeholder="Имя"
                                style={{ padding: "8px", width: "200px" }}
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <input
                                type="text"
                                name="userSurname"
                                value={registerData.userSurname}
                                onChange={handleRegisterChange}
                                placeholder="Фамилия"
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
                                type="password"
                                name="confirmPassword"
                                value={registerData.confirmPassword}
                                onChange={handleRegisterChange}
                                placeholder="Подтверждение пароля"
                                style={{ padding: "8px", width: "200px" }}
                            />
                        </div>
                        <button onClick={handleRegister} style={{ padding: "8px 16px", color: "#fff" }}>
                            Зарегистрироваться
                        </button>
                    </div>
                </div>
            )}

            {/* Вкладка "Проекты" (центрирована) */}
            {activeTab === "projects" && isAuthenticated && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "calc(100vh - 60px)",
                    }}
                >
                    <div style={{ padding: "20px" }}>
                        <h2>Выбор проекта</h2>
                        <p>
                            Текущий пользователь: <b>{loginData.username}</b>
                        </p>
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
                </div>
            )}

            {/* Viewer */}
            {activeTab === "viewer" && isAuthenticated && (
                <>
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
                    </div>
                    <label className="custom-file-upload">
                        <input type="file" accept=".ifc" onChange={handleFileUpload} />
                        Загрузить файл
                    </label>
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
                                            padding: "1.25em",
                                            margin: "0 10px 0 0",
                                            width: "20px",
                                            height: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "white",
                                            backgroundColor: "rgb(227,79,79)",
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Введите комментарий..."
                                style={{
                                    width: "100%",
                                    minHeight: "50px",
                                    marginBottom: "5px",
                                }}
                            />
                            <div style={{ display: "flex", gap: "1px" }}>
                                <button className="save" onClick={saveComment}>
                                    Сохранить
                                </button>
                                <button
                                    className="button"
                                    onClick={openSelectedElementJsonWindow}
                                    style={{ marginLeft: "9px", position: "relative" }}
                                >
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
