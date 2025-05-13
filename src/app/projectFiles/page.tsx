"use client";

import React, {useEffect, useState} from "react";
import { apiService } from "@/app/services/api.service";
import {Project, ProjectFile} from "@/app/config/api";
import Viewer from "../components/viewer";

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
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const userId = typeof window !== "undefined" ? Number(localStorage.getItem("userId")) : 0;
    const projectId = 1; // временно, заменить по необходимости

    useEffect(() => {
        if (!userId) return;

        const fetchProjects = async () => {
            const projectsResult = await apiService.getUserProjects(userId);
            if (projectsResult.success && projectsResult.data) {
                setProjects(projectsResult.data);
            }
        };

        fetchProjects();
    }, [userId]);

    useEffect(() => {
        let isMounted = true;

        console.log("🔁 useEffect запущен", { userId, projectId });

        const fetchFiles = async () => {
            if (!userId || !projectId) {
                console.log("⛔ Не хватает userId/projectId", { userId, projectId });
                return;
            }

            const result = await apiService.getUserProjectFiles(userId, projectId);

            if (isMounted) {
                if (result.success && result.data) {
                    const files: ProjectFile[] = result.data;
                    setProjectFiles(files);
                    console.log("✅ Файлы проекта получены:", files);
                } else {
                    console.error("❌ Ошибка при загрузке файлов проекта:", result.error);
                }
            }
        };

        fetchFiles();

        return () => {
            isMounted = false;
        };
    }, [userId, projectId]);

    useEffect(() => {
        console.log("📦 projectFiles обновились:", projectFiles);
    }, [projectFiles]);

    useEffect(() => {
        const handleFileUpload = async () => {
            if (uploadedFile) {

                console.log("Загружаемый файл:", uploadedFile);
            }
        };

        handleFileUpload();
    }, []);

    const filteredFiles = projectFiles.filter(file =>
        file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const projectGroups = filteredFiles.reduce((acc, file) => {
        const pid = file.projectId || 1;
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(file);
        return acc;
    }, {} as Record<number, ProjectFile[]>);

    return (
        <div className="p-8 bg-background-color text-text-color">
            {/*<div>*/}
            {/*    <p className="mb-4 text-sm">Debug info: {JSON.stringify(projectFiles)}</p>*/}
            {/*</div>*/}
            <div
                style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    backgroundColor: '#242B35',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white',
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                }}
            >
                <span style={{marginLeft: '4px'}}>SodaBIM</span>
            </div>
            <div className="flex justify-center mb-8">
                <input
                    style={{marginTop: "44px"}}
                    type="text"
                    placeholder="Поиск объекта..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 pr-10 w-full rounded-lg border border-gray-300 text-black"
                />
            </div>
            {filteredFiles.length === 0 && (
                <p className="text-red-500">Нет загруженных файлов или произошла ошибка загрузки.</p>
            )}
            {Object.entries(projectGroups).map(([projectId, files]) => {
                const numericProjectId = Number(projectId);
                const projectTitle = projects.find(p => p.id === numericProjectId)?.title || `#${numericProjectId}`;
                return (
                    <div key={projectId} className="mb-8">
                        <h3 className="text-xl font-semibold mb-3">Проект: {projectTitle}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-lg border"
                                    style={{
                                        backgroundColor: "var(--button-bg)",
                                        borderColor: "var(--button-hover)",
                                    }}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{getFileIcon(file.contentType)}</span>
                                        <div>
                                            <h3 className="text-lg font-semibold">{file.fileName}</h3>
                                            <p className="text-sm"
                                               style={{color: "var(--secondary-color)"}}>{file.contentType}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div className="mt-10">
                <label className="block mb-2 text-lg font-medium">Загрузить новый файл:</label>
                <input
                    type="file"
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0 file:text-sm file:font-semibold
                               file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedFile(file);
                    }}
                />
                {uploadedFile && (
                    <div className="mt-3 text-sm">
                        Выбранный файл: <strong>{uploadedFile.name}</strong>
                    </div>
                )}
            </div>

            {uploadedFile?.name.toLowerCase().endsWith(".ifc") && (
                <div className="mt-10">
                    <Viewer isAuthenticated={true} file={uploadedFile}/>
                </div>
            )}
        </div>
    );
};

export default Page;