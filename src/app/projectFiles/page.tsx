"use client";

import React, {useEffect, useState} from "react";
import { apiService } from "@/app/services/api.service";
import {Project, ProjectFile} from "@/app/config/api";
import Viewer from "../components/viewer";

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

            <div className="relative w-full flex items-center justify-center mb-8" style={{ marginTop: "44px" }}>
                <h3 className="absolute left-0 text-xl font-semibold">
                    Проект: {projects.find(p => p.id === 1)?.title || "#1"}
                </h3>
                <div className="mx-auto flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Поиск объекта..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 pr-10 w-full max-w-md rounded-lg border border-gray-300 text-black"
                    />
                    <div className="mt-0 flex items-center">
                        <label
                            htmlFor="file-upload"
                            title="Добавить файл"
                            style={{
                                cursor: "pointer",
                                fontSize: "28px",
                                color: "#3B82F6",
                                position: "relative",
                                top: "-2px"
                            }}
                        >
                            +
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setUploadedFile(file);
                            }}
                        />
                    </div>
                </div>
            </div>
                {Object.entries(projectGroups).length === 0 ? (
                    <p className="text-red-500 mb-6">Нет файлов, соответствующих поиску.</p>
                ) : (
                    Object.entries(projectGroups).map(([projectId, files]) => {
                        // const numericProjectId = Number(projectId);
                        // const projectTitle = projects.find(p => p.id === numericProjectId)?.title || `#${numericProjectId}`;

                        return (
                            <div key={projectId} className="mb-8">
                                {/*<h3 className="text-xl font-semibold mb-3" style={{marginTop: "44px"}}>*/}
                                {/*    Проект: {projectTitle}*/}
                                {/*</h3>*/}
                                <div>
                                    <div className="grid grid-cols-4 font-semibold border-b pb-2 mb-2">
                                        <div>Имя файла</div>
                                        <div>Дата изменения</div>
                                        <div>Тип</div>
                                        <div>Данные</div>
                                    </div>
                                    {files.length === 0 ? (
                                        <p className="text-red-500 mb-6">Нет файлов в этом проекте.</p>
                                    ) : (
                                        files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-4 items-center p-2 rounded-lg border hover:bg-gray-100 transition"
                                                style={{
                                                    backgroundColor: "var(--button-bg)",
                                                    borderColor: "var(--button-hover)",
                                                }}
                                            >
                                                <div>{file.fileName}</div>
                                                <div>{new Date(file.lastModified).toLocaleString()}</div>
                                                <div>{file.contentType}</div>
                                                <div className="truncate">{file.fileData}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {uploadedFile?.name.toLowerCase().endsWith(".ifc") && (
                    <div className="mt-10">
                        <Viewer isAuthenticated={true} file={uploadedFile}/>
                    </div>
                )}
            </div>
            );
            };

            export default Page;