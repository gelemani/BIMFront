"use client";

import React, {useEffect, useRef, useState} from "react";
import { IfcViewerAPI } from "web-ifc-viewer";

interface IfcElementProperties {
    [key: string]: string | number | boolean | null;
}

export default function Viewer() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewer = useRef<IfcViewerAPI | null>(null);
    const [viewMode, setViewMode] = useState<"normal" | "elementView">("normal");
    const [selectedElement, setSelectedElement] = useState<IfcElementProperties | null>(null);

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
        await viewer.current.IFC.loadIfcUrl(fileURL);

        viewer.current.axes.dispose();
        viewer.current.grid.dispose();
        console.log("IFC file loaded:", file.name);
    };

    const handleClick = async () => {
        if (!viewer.current || viewMode === "normal") return;

        // const bounds = containerRef.current?.getBoundingClientRect();
        // const x = event.clientX - (bounds?.left || 0);
        // const y = event.clientY - (bounds?.top || 0);

        // Assuming `pickIfcItem` takes an object with `x` and `y` properties
        // const result = await viewer.current.IFC.pickIfcItem({ x, y }); // Corrected usage
        const result = await viewer.current.IFC.selector.pickIfcItem();
        if (result) {
            const properties = await viewer.current.IFC.loader.ifcManager.getItemProperties(
                result.modelID,
                result.id
            );
            setSelectedElement(properties);
        } else {
            clearSelection();
        }
    };


    const clearSelection = () => {
        if (viewer.current) {
            viewer.current.IFC.unpickIfcItems();
        }
        setSelectedElement(null);
    };

    const changeViewMode = (mode: "normal" | "elementView") => {
        setViewMode(mode);
        if (mode === "normal") {
            clearSelection();
        }
    };

    const closeProperties = () => setSelectedElement(null);

    return (
        <div>
            <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
                <button
                    className={`button ${viewMode === "normal" ? "active" : ""}`}
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

            {/* Кастомная кнопка для загрузки файла */}
            <label className="custom-file-upload">
                <input type="file" accept=".ifc" onChange={handleFileUpload} />
                Загрузить файл
            </label>

            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "80vh",
                    border: "1px solid #ccc",
                }}
                onClick={() => handleClick()}
            ></div>

            {viewMode === "elementView" && selectedElement && (
                <div
                    style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        padding: "10px",
                        border: "1px solid black",
                        backgroundColor: "white",
                        zIndex: 1000,
                    }}
                >
                    <h3>Свойства элемента</h3>
                    <pre style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {JSON.stringify(selectedElement, null, 2)}
                    </pre>
                    <button onClick={closeProperties}>Закрыть</button>
                </div>
            )}
        </div>
    );
}