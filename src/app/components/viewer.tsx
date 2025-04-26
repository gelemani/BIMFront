"use client";

import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
// import { Color } from "three";
// import "./styles/ThemeToggler.css";
// import { apiService } from "@services/api.service"; // Здесь ты подставляешь свой правильный путь

interface Comment {
    text: string;
    elementName: string;
    elementId: number;
}

interface IfcElementProperties {
    id: number;
    Name?: { value: string };
    [key: string]: string | number | boolean | null | undefined | { value: string } | { [key: string]: string };
}

const Viewer = ({isAuthenticated}: { isAuthenticated: boolean, selectedProject?: string }) => {
    const [selectedElement, setSelectedElement] = useState<IfcElementProperties | null>(null);
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [newComment, setNewComment] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const viewer = useRef<IfcViewerAPI | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

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

    useEffect(() => {
        if (isAuthenticated && containerRef.current && !viewer.current) {
            viewer.current = new IfcViewerAPI({ container: containerRef.current });
            viewer.current.grid.setGrid();
            viewer.current.axes.setAxes();
            viewer.current.IFC.setWasmPath("../../../");

            return () => {
                if (viewer.current) {
                    viewer.current.dispose();
                    viewer.current = null;
                }
            };
        }
    }, [isAuthenticated]);

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
        await viewer.current.IFC.loadIfcUrl(fileURL);
    };

    const handleClick = async () => {
        if (!viewer.current) return;
        const result = await viewer.current.IFC.selector.pickIfcItem();
        if (result) {
            const properties = await viewer.current.IFC.loader.ifcManager.getItemProperties(result.modelID, result.id);
            setNewComment("");
            setSelectedElement(properties);
            setIsModalOpen(true);
        }
    };

    const clearSelection = () => {
        if (viewer.current) viewer.current.IFC.unpickIfcItems();
        setSelectedElement(null);
        setIsModalOpen(false);
        setNewComment("");
    };

    const saveComment = () => {
        if (!selectedElement) return;
        const elementId = selectedElement.id;
        const commentText = newComment.trim();
        if (!commentText) return;

        let elementName = "Unknown Element";
        if (selectedElement.Name && typeof selectedElement.Name === "object" && "value" in selectedElement.Name) {
            elementName = selectedElement.Name.value as string;
        }

        setComments((prevComments) => {
            const updated = { ...prevComments };
            if (!updated[elementId]) {
                updated[elementId] = [];
            }
            if (!updated[elementId].some((c) => c.text === commentText)) {
                updated[elementId].push({ text: commentText, elementName, elementId });
            }
            return updated;
        });
        setNewComment("");
    };

    const openSelectedElementJsonWindow = () => {
        if (!selectedElement) return;
        const newWindow = window.open("", "SelectedElementData", "width=600,height=400");
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>Данные выбранного элемента (JSON)</title>
                        <style>
                            body { font-family: sans-serif; padding: 10px; background: #fff; color: #000; }
                            pre { white-space: pre-wrap; word-wrap: break-word; }
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

    return (
        <>
            {isAuthenticated && (
                <>
                    <div className="header-container">
                        <button className="button blue-button">Обычный режим</button>
                        <button className="button">Режим просмотра элементов</button>
                    </div>
                    <label className="custom-file-upload">
                        <input type="file" accept=".ifc" onChange={handleFileUpload} />
                        Загрузить файл
                    </label>
                    <div ref={containerRef} className="viewer-container" onClick={handleClick}></div>
                    {isModalOpen && selectedElement && (
                        <div
                            className="modal-container"
                            style={{ left: modalPosition.x, top: modalPosition.y }}
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
                                <button className="button modal-json-button" onClick={openSelectedElementJsonWindow}>
                                    Открыть JSON
                                </button>
                            </div>
                            <div className="modal-comments">
                                <h4>Комментарии:</h4>
                                <ul>
                                    {comments[selectedElement.id]?.map((comment, index) => (
                                        <li key={index}>
                                            <strong>{comment.elementName}</strong>: {comment.text}
                                        </li>
                                    )) || <li>Нет комментариев</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default Viewer;