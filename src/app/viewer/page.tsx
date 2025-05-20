'use client';
import { useEffect, useState } from "react";
import Viewer from "@/app/components/viewer";

const ViewerPage = () => {
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const data = sessionStorage.getItem("viewerFile");
        if (!data) return;

        try {
            const parsed = JSON.parse(data);
            const blob = new Blob([Uint8Array.from(parsed.data)], { type: parsed.type });
            const fileFromSession = new File([blob], parsed.name, { type: parsed.type });
            setFile(fileFromSession);
        } catch (e) {
            console.error("Ошибка при расшифровке файла из sessionStorage:", e);
        }
    }, []);

    return <Viewer isAuthenticated={true} file={file} />;
};

export default ViewerPage;