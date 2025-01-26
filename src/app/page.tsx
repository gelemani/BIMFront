"use client";

import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";

interface IfcElementProperties {
    id: number;
    [key: string]: string | number | boolean | null;
}

interface Comment {
    text: string;
}

export default function Viewer() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewer = useRef<IfcViewerAPI | null>(null);
    const [viewMode, setViewMode] = useState<"normal" | "elementView">("normal");
    const [selectedElement, setSelectedElement] = useState<IfcElementProperties | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        if (!containerRef.current || viewer.current) return;

        viewer.current = new IfcViewerAPI({
            container: containerRef.current,
        });

        viewer.current.grid.setGrid();
        viewer.current.axes.setAxes();

        const wasmUrl: string = "../../../";
        viewer.current.IFC.setWasmPath(wasmUrl);

        return () => {
            if (viewer.current) {
                viewer.current.dispose();
                viewer.current = null;
            }
        };
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !viewer.current) return;

        const fileURL = URL.createObjectURL(file);
        const model = await viewer.current.IFC.loadIfcUrl(fileURL);

        viewer.current.axes.dispose();
        viewer.current.grid.dispose();
        console.log("IFC file loaded:", file.name);

        const ifcManager = viewer.current.IFC.loader.ifcManager;
        const modelID = model.modelID;
        const IFC_BUILDING_ELEMENT_TYPE = 300;

// Получение всех элементов указанного типа
        const allItems = await ifcManager.getAllItemsOfType(modelID, IFC_BUILDING_ELEMENT_TYPE, false);

        console.log("Все элементы модели:", allItems);

// Преобразование ключей (id) в числа и получение их свойств
        const allProperties = [];
        for (const id in allItems) {
            const numericId = parseInt(id, 10); // Преобразование id из строки в число
            const properties = await ifcManager.getItemProperties(modelID, numericId);
            allProperties.push(properties);
        }

        console.log("Свойства всех элементов модели:", allProperties);

    };

    const handleClick = async () => {
        if (!viewer.current || viewMode === "normal") return;

        const result = await viewer.current.IFC.selector.pickIfcItem();
        if (result) {
            const properties = await viewer.current.IFC.loader.ifcManager.getItemProperties(
                result.modelID,
                result.id
            );
            if (selectedElement?.id !== properties.id) {
                setNewComment(""); // Очистка ввода комментария
            }
            setSelectedElement(properties);
            setIsModalOpen(true);
        } else {
            clearSelection();
        }
    };

    const clearSelection = () => {
        if (viewer.current) {
            viewer.current.IFC.unpickIfcItems();
        }
        setSelectedElement(null);
        setIsModalOpen(false);
    };

    const changeViewMode = (mode: "normal" | "elementView") => {
        setViewMode(mode);
        if (mode === "normal") {
            clearSelection();
        }
    };

    const toggleTheme = () => {
        setIsDarkMode((prevMode) => !prevMode);
        document.documentElement.setAttribute("data-theme", !isDarkMode ? "dark" : "light");
    };

    const handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewComment(event.target.value);
    };

    const saveComment = () => {
        if (!selectedElement) return;

        const elementId = selectedElement.id;
        const newCommentObj: Comment = { text: newComment };

        setComments((prevComments) => {
            const updatedComments = { ...prevComments };
            if (!updatedComments[elementId]) {
                updatedComments[elementId] = [];
            }
            updatedComments[elementId].push(newCommentObj);
            return updatedComments;
        });
        setNewComment("");
    };

    return (
        <div className={isDarkMode ? "dark-theme" : "light-theme"}>
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
                onClick={() => handleClick()}
            ></div>

            {isModalOpen && selectedElement && (
                <div className="comment-modal">
                    <h3>Заметки для элемента</h3>
                    <textarea
                        value={newComment}
                        onChange={handleCommentChange}
                        placeholder="Введите комментарий..."
                    ></textarea>
                    <button className="save" onClick={saveComment}>Сохранить</button>
                    <button className="close" onClick={clearSelection}>Закрыть</button>
                    <div style={{marginTop: "10px"}}>
                        <h4>Комментарии:</h4>
                        <ul>
                            {comments[selectedElement.id]?.map((comment, index) => (
                                <li key={index}>{comment.text}</li>
                            )) || <li>Нет комментариев</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
