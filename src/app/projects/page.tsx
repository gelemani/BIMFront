"use client";

import React, { useState } from "react";
import {useRouter} from "next/navigation";

interface ProjectsPageProps {
    isAuthenticated: boolean;
    onSelectProject: (project: string) => void;
}

const ProjectsPage = ({ isAuthenticated, onSelectProject }: ProjectsPageProps) => {
    const router = useRouter();
    const [selectedProject, setSelectedProject] = useState<string>("");
    const projects = ["Проект A", "Проект B", "Проект C"];

    const handleSelectProject = (project: string) => {
        setSelectedProject(project);
        if (typeof onSelectProject === "function") {
            onSelectProject(project);
        } else {
            console.warn("onSelectProject не передан или не является функцией.");
        }
        router.push(`/projectFiles?project=${encodeURIComponent(project)}`);

    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>Выбор проекта</h2>
                <p>Текущий пользователь: <b>{/* Вывести имя пользователя */}</b></p>
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
                    <p>Выбран проект: <b>{selectedProject}</b></p>
                )}
            </div>
        </div>
    );
};

export default ProjectsPage;