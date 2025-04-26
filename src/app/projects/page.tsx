"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectsPageProps {
    isAuthenticated: boolean;
    onSelectProject: (project: string) => void;
    companyName: string;  // Добавим companyName как пропс
    registerData: { companyName: string }; // Пропс для registerData
}
import { useSearchParams } from 'next/navigation';

const ProjectsPage = ({ onSelectProject }: ProjectsPageProps) => {
    const searchParams = useSearchParams();
    const companyName = searchParams.get("companyName");
    // console.log("Company Name from URL:", companyName);

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
            <div
                style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    backgroundColor: '#242B35', // Цвет фона полоски
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'white', // Цвет текста
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    zIndex: 1000, // Чтобы полоска была сверху
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Легкая тень для эффекта
                }}
            >
                <span style={{marginLeft: '4px'}}>SodaBIM</span>
                <p>{companyName}</p>
            </div>
            <div className="auth-form">
            <h2>Выбор проекта</h2>
                {/*<p>Текущий пользователь: <b>/!* Вывести имя пользователя *!/</b></p>*/}
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