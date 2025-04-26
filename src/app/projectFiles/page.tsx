"use client";

import React, {useState} from "react";
import {useSearchParams} from "next/navigation";
import dynamic from "next/dynamic";

interface ViewerProps {
    file?: File | null
}

const Viewer = dynamic(({file}: ViewerProps) => import("@/app/components/viewer"), {ssr: false});

const files = [
    {name: "BuildingModel.ifc", type: "IFC"},
    {name: "Budget.xlsx", type: "Excel"},
    {name: "ProjectPlan.docx", type: "Word"},
    {name: "SitePhotos.zip", type: "Archive"},
];

const getFileIcon = (type: string) => {
    switch (type) {
        case "IFC":
            return "🏗️";
        case "Excel":
            return "📊";
        case "Word":
            return "📄";
        case "Archive":
            return "🗜️";
        default:
            return "📁";
    }
};

const Page = (): React.JSX.Element => {
    const searchParams = useSearchParams();
    const projectName = searchParams.get("project");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    return (
        <div style={{padding: "2rem", fontFamily: "Arial"}}>
            <h1>Каталог файлов проекта</h1>
            <h2>Проект: {projectName || "не выбран"}</h2>
            <div style={{marginBottom: "2rem"}}>
                <label style={{display: "block", marginBottom: "0.5rem"}}>Загрузить новый файл:</label>
                <input
                    type="file"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedFile(file);
                    }}
                />
                {uploadedFile && (
                    <div style={{marginTop: "0.5rem"}}>
                        Выбранный файл: <strong>{uploadedFile.name}</strong>
                    </div>
                )}
            </div>
            {uploadedFile?.name.toLowerCase().endsWith(".ifc") && (
                <div style={{marginTop: "2rem"}}>
                    <Viewer isAuthenticated={true} file={uploadedFile}/>
                </div>
            )}
            <ul style={{listStyle: "none", padding: 0}}>
                {files.map((file, index) => (
                    <li
                        key={index}
                        style={{
                            marginBottom: "1rem",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "1.2rem",
                        }}
                    >
                        <span style={{marginRight: "0.5rem"}}>{getFileIcon(file.type)}</span>
                        {file.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Page;