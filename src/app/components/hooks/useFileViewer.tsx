'use client';

import { useRouter } from 'next/navigation';

const useFileViewer = () => {
    const router = useRouter();

    const openFileInViewer = ({ file, url }: { file: File; url: string }) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const target = ['ifc'].includes(ext || '') ? 'viewer' : 'docsViewer';

        // Сначала открываем окно, чтобы избежать блокировки всплывающих окон браузером
        const viewerWindow = window.open(`/${target}`, '_blank');
        if (!viewerWindow) {
            alert("Браузер заблокировал всплывающее окно. Разрешите его вручную.");
            return;
        }

        // Затем сохраняем только метаданные и URL Blob в sessionStorage
        sessionStorage.setItem('viewerFileUrl', url);
        sessionStorage.setItem('viewerFileName', file.name);
        sessionStorage.setItem('viewerFileType', file.type);
    };

    return { openFileInViewer };
};

export default useFileViewer;