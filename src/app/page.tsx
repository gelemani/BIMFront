"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import Viewer from "@/app/components/viewer";
// import ProjectsPage from "@/app/projects";

const Page = (): React.JSX.Element => {
    const router = useRouter();
    const [, setIsAuthenticated] = useState(false);
    // const [isAuthenticated, setIsAuthenticated] = useState(false);
    // const [selectedProject, setSelectedProject] = useState<string | null>(null);

    useEffect(() => {
        const isLoggedIn = localStorage.getItem("token") !== null;
        setIsAuthenticated(isLoggedIn);

        if (!isLoggedIn) {
            router.push("/auth/");
        }
    }, [router]);

    return (
        <>
        </>
    );
};

export default Page;