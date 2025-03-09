"use client";

import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Color } from "three";
import "./styles/ThemeToggler.css";
import { apiService } from './services/api.service';

interface IfcElementProperties {
    id: number;
    [key: string]: string | number | boolean | null;
}

interface Comment {
    text: string;
}

type TabType = "auth" | "register" | "register-company-info" | "projects" | "viewer";

export default function Viewer() {
    const [activeTab, setActiveTab] = useState<TabType>("auth");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // userID для идентификации на бэкенде
    // const [userID, setUserID] = useState<number | null>(null);
    const [, setUserID] = useState<number | null>(null);

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
        companyName: "",
        companyPosition: "",
    });
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterData((prev: typeof registerData) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Авторизация
    const handleLogin = async () => {
        if (loginData.username.trim() && loginData.password.trim()) {
            const response = await apiService.login(loginData);
            if (response.success && response.data) {
                setUserID(response.data.userId);
                setIsAuthenticated(true);
                setActiveTab("projects");
            } else {
                alert(response.error || "Ошибка авторизации");
            }
        } else {
            alert("Введите имя пользователя и пароль");
        }
    };

    // Регистрация
    const handleRegister = async () => {
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

        const response = await apiService.register(registerData);
        if (response.success) {
            setActiveTab("register-company-info");
        } else {
            alert(response.error || "Ошибка регистрации");
        }
    };

    const handleRegisterCompanyInfo = async () => {
        if (registerData.companyName.trim() && registerData.companyPosition.trim()) {
            const response = await apiService.registerCompanyInfo({
                companyName: registerData.companyName,
                companyPosition: registerData.companyPosition
            });
            
            if (response.success && response.data) {
                setUserID(response.data.userId);
                setIsAuthenticated(true);
                setActiveTab("projects");
            } else {
                alert(response.error || "Ошибка регистрации компании");
            }
        } else {
            alert("Заполните все поля для регистрации компании");
        }
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
        <div className="theme-toggler-container">
            <label className={`theme-switch ${isDarkMode ? "active" : ""}`}>
                <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={() => setIsDarkMode((prev) => !prev)}
                    className="theme-checkbox"
                    aria-label="Toggle dark mode"
                    title="Toggle between light and dark mode"
                />
                <span className="slider"></span>
            </label>
            <span className="theme-text">
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
            <div className="header-container">
                <button
                    onClick={() => setActiveTab("auth")}
                    className={`header-button ${activeTab === "auth" ? "active" : ""}`}
                >
                    Войти
                </button>
                <button
                    onClick={() => setActiveTab("register")}
                    className={`header-button ${activeTab === "register" ? "active" : ""}`}
                >
                    Регистрация
                </button>
                <button
                    onClick={() => setActiveTab("projects")}
                    className={`header-button ${activeTab === "projects" ? "active" : ""}`}
                >
                    Проекты
                </button>
                <button
                    onClick={() => setActiveTab("viewer")}
                    className={`header-button ${activeTab === "viewer" ? "active" : ""}`}
                >
                    Viewer
                </button>
                <ThemeToggler />
            </div>

            {/* Вкладка "Авторизация" (центрирована) */}
            {activeTab === "auth" && (
                <div className="auth-container">
                    <div className="auth-form">
                        <h2>Авторизация</h2>
                        <div>
                            <input
                                type="text"
                                name="username"
                                value={loginData.username}
                                onChange={handleLoginChange}
                                placeholder="Почта или логин"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                name="password"
                                value={loginData.password}
                                onChange={handleLoginChange}
                                placeholder="Пароль"
                                className="form-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLogin();
                                    }
                                }}
                            />
                        </div>
                        <button onClick={handleLogin} className="form-button">
                            Войти
                        </button>
                    </div>
                </div>
            )}

            {/* Вкладка "Регистрация" (центрирована) */}
            {activeTab === "register" && (
                <div className="auth-container">
                    <div className="auth-form">
                        <h2>Регистрация</h2>
                        <div>
                            <input
                                type="text"
                                name="login"
                                value={registerData.login}
                                onChange={handleRegisterChange}
                                placeholder="Логин"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                name="userName"
                                value={registerData.userName}
                                onChange={handleRegisterChange}
                                placeholder="Имя"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                name="userSurname"
                                value={registerData.userSurname}
                                onChange={handleRegisterChange}
                                placeholder="Фамилия"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                name="email"
                                value={registerData.email}
                                onChange={handleRegisterChange}
                                placeholder="Email"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                name="password"
                                value={registerData.password}
                                onChange={handleRegisterChange}
                                placeholder="Пароль"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={registerData.confirmPassword}
                                onChange={handleRegisterChange}
                                placeholder="Подтверждение пароля"
                                className="form-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleRegister();
                                    }
                                }}
                            />
                        </div>
                        <button onClick={handleRegister} className="form-button">
                            Зарегистрироваться
                        </button>
                    </div>
                </div>
            )}

            {/* Вкладка "Регистрация компании" (центрирована) */}
            {activeTab === "register-company-info" && (
                <div className="auth-container">
                    <div className="auth-form">
                        <h2>Регистрация компании</h2>
                        <div>
                            <input
                                type="text"
                                name="companyName"
                                value={registerData.companyName}
                                onChange={handleRegisterChange}
                                placeholder="Название компании"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                name="companyPosition"
                                value={registerData.companyPosition}
                                onChange={handleRegisterChange}
                                placeholder="Должность"
                                className="form-input"
                            />
                        </div>
                        <button
                            onClick={handleRegisterCompanyInfo}
                            className="form-button"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRegisterCompanyInfo();
                                }
                            }}
                            tabIndex={0}
                        >
                            Зарегистрироваться
                        </button>
                    </div>
                </div>
            )}
            {/* Вкладка "Проекты" (центрирована) */}
            {activeTab === "projects" && isAuthenticated && (
                <div className="auth-container">
                    <div className="auth-form">
                        <h2>Выбор проекта</h2>
                        <p>
                            Текущий пользователь: <b>{loginData.username}</b>
                        </p>
                        <ul>
                            {projects.map((proj) => (
                                <li key={proj}>
                                    <button
                                        onClick={() => handleSelectProject(proj)}
                                        className={`header-button ${selectedProject === proj ? "active" : ""}`}
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
                    <div className="header-container">
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
                        className="viewer-container"
                        onClick={handleClick}
                    ></div>
                    {isModalOpen && selectedElement && (
                        <div
                            className="modal-container"
                            style={{
                                left: modalPosition.x,
                                top: modalPosition.y,
                            }}
                        >
                            <div className="modal-header" onMouseDown={startDrag}>
                                <div className="modal-title">
                                    <h3>Комментарии</h3>
                                    <button className="modal-close" onClick={clearSelection}>
                                        &times;
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Введите комментарий..."
                                className="modal-textarea"
                            />
                            <div className="modal-buttons">
                                <button className="save" onClick={saveComment}>
                                    Сохранить
                                </button>
                                <button
                                    className="button modal-json-button"
                                    onClick={openSelectedElementJsonWindow}
                                >
                                    Открыть JSON
                                </button>
                            </div>
                            <div className="modal-comments">
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
