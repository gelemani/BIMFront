"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/app/services/api.service";
import { Project } from "@/app/config/api";

interface ProjectsPageProps {
    isAuthenticated: boolean;
    onSelectProject: (project: string) => void;
    companyName: string;
    registerData: { companyName: string };
}

const ProjectsPage = ({ onSelectProject }: ProjectsPageProps) => {
    // const searchParams = useSearchParams();
    // const companyName = searchParams.get("companyName");

    const router = useRouter();
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const filteredProjects = projects.filter((proj) =>
        proj.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const fetchProjects = async () => {
            const userIdRaw = localStorage.getItem("userId");
            // const userId = userIdRaw ? Number(userIdRaw) : 0; // fallback ID
            const userId =  0; // ------------------------------------------------------ заглушка
            console.log("userId raw:", userIdRaw);
            console.log("Parsed userId:", userId);

            const response = await apiService.getUserProjects(userId);
            console.log("Полученные проекты:", response);

            if (Array.isArray(response)) {
                setProjects(response);
                console.log("Установка проектов:", response);
            } else {
                console.warn("Проекты не в формате массива:", response);
            }

            setIsLoading(false);
        };
        fetchProjects();
    }, []);

    const handleSelectProject = (project: string) => {
        setSelectedProject(project);
        if (typeof onSelectProject === "function") {
            onSelectProject(project);
        } else {
            console.warn("onSelectProject не передан или не является функцией.");
        }
        router.push(`/projectFiles?project=${encodeURIComponent(project)}`);
    };

    console.log(projects)

    return (
       <div className="p-8 bg-background-color text-text-color">
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
                <span style={{ marginLeft: '4px' }}>SodaBIM</span>
            </div>
           <main className="mt-8">
               <div className="flex justify-center items-center mb-8" style={{marginTop: "44px"}}>
                       <input
                           type="text"
                           placeholder="Поиск проекта..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="px-4 py-2 pr-10 w-full rounded-lg border border-gray-300 text-black"
                       />
               </div>
               {isLoading ? (
                   <p className="text-center text-xl text-blue-500">Загрузка проектов...</p>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {filteredProjects.length === 0 ? (
                           <div className="flex justify-center col-span-full">
                               <p className="text-center text-lg">Проекты не найдены</p>
                           </div>
                       ) : (
                           filteredProjects.map((proj) => (
                               <div
                                   key={proj.id}
                                   className="bg-button-bg border border-button-hover p-6 rounded-lg cursor-pointer transition transform hover:scale-105"
                                   onClick={() => handleSelectProject(proj.title)}
                               >
                                   <h3 className="text-2xl font-semibold">{proj.title}</h3>
                                   <p className="text-sm text-gray-600">ID пользователя: {proj.userId}</p>
                                   <div className="mt-4 text-sm text-gray-300">
                                       <p><b>Создан:</b> {new Date(proj.createdAt).toLocaleDateString()}</p>
                                       <p><b>Изменён:</b> {new Date(proj.lastModified).toLocaleDateString()}</p>
                                       <p><b>Доступ:</b> {proj.accessLevel}</p>
                                       <p><b>Файлов:</b> {proj.projectFiles.length}</p>
                                   </div>
                               </div>
                           ))
                       )}
                   </div>
               )}
               {selectedProject && (
                   <p className="text-center text-xl font-semibold mt-6">
                       Выбран проект: <b>{selectedProject}</b>
                   </p>
               )}
           </main>
       </div>
    );
};

export default ProjectsPage;