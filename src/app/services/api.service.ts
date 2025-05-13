import axios, { AxiosInstance } from 'axios';
import {
    API_URL,
    API_HEADERS,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    ApiResponse,
    Project,
    ProjectFile
} from '../config/api';


const isClient = typeof window !== 'undefined';

class ApiService {
    private authToken: string | null = null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_URL,
            headers: API_HEADERS
        });
        console.log("API_URL:", API_URL);

        // Добавляем интерсептор для добавления токена авторизации
        this.axiosInstance.interceptors.request.use((config) => {
            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }
            return config;
        });
    }

    async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            console.log("Отправка запроса на сервер с данными:", data);
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/Auth/login', data);
            console.log("Сырой ответ от сервера:", response);

            if (!response || !response.data) {
                console.error("Ошибка: сервер не вернул данных!");
                return { success: false, error: "Ошибка сервера: пустой ответ" };
            }

            console.log("Обработанный ответ:", response.data);

            if (response.data.success && response.data.data) {
                this.authToken = response.data.data.token;
                if (isClient) {
                    localStorage.setItem('authToken', response.data.data.token);
                    localStorage.setItem('userId', String(response.data.data.userId)); // Сохраняем userId в localStorage
                }
            }

            return response.data;
        } catch (error: unknown) {
            console.error("Ошибка при запросе:", error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    return {
                        success: false,
                        error: "Неавторизованный доступ. Пожалуйста, проверьте свои учетные данные."
                    };
                }
            }
            return {
                success: false,
                error: axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Неизвестная ошибка'
            };
        }
    }

    async register(
        userData: RegisterRequest,
        companyData?: { companyName: string; companyPosition: string }
    ): Promise<ApiResponse<{ userId: number; token?: string }>> {
        try {
            // Регистрация пользователя
            console.log("Данные для регистрации пользователя:", userData);
            const userResponse = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', userData);
            console.log("Ответ от сервера (пользователь):", userResponse.data);

            if (!userResponse.data.success || !userResponse.data.data?.token) {
                return { success: false, error: userResponse.data.error || "Ошибка регистрации пользователя" };
            }

            this.authToken = userResponse.data.data.token;
            if (isClient) {
                localStorage.setItem('authToken', this.authToken);
            }

            // Если данные компании предоставлены, регистрируем компанию
            if (companyData) {
                console.log("Данные для регистрации компании:", companyData);
                const companyResponse = await this.axiosInstance.post<ApiResponse<{ userId: number }>>('/company/register', companyData);
                console.log("Ответ от сервера (компания):", companyResponse.data);

                if (!companyResponse.data.success || !companyResponse.data.data?.userId) {
                    return { success: false, error: companyResponse.data.error || "Ошибка регистрации компании" };
                }

                return { success: true, data: { userId: companyResponse.data.data.userId, token: this.authToken } };
            }

            return { success: true, data: { userId: userResponse.data.data.userId, token: this.authToken } };
        } catch (error) {
            console.log("Ошибка при регистрации:", error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) {
                    return {
                        success: false,
                        error: "Пользователь с таким email уже существует"
                    };
                } else if (error.response?.status === 401) {
                    return {
                        success: false,
                        error: "Неавторизованный доступ. Пожалуйста, войдите в систему."
                    };
                }
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Ошибка регистрации'
            };
        }
    }

    // Инициализация аутентификации на клиентской стороне
    initializeAuth() {
        if (isClient) {
            const token = localStorage.getItem('authToken');
            if (token) {
                this.authToken = token;
            }
        }
    }

    // Метод для выхода
    logout() {
        this.authToken = null;
        if (isClient) {
            localStorage.removeItem('authToken');
        }
    }

    async getUserProjects(userId: number): Promise<ApiResponse<Project[]>> {
        try {
            const response = await this.axiosInstance.get<ApiResponse<Project[]>>(`/Project?userId=${userId}`);
            console.log("Полученные проекты:", response.data);
            return response.data;
        } catch (error) {
            console.error("Ошибка при получении проектов:", error);
            return {
                success: false,
                error: axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Неизвестная ошибка',
            };
        }
    }

    async PostProjectFile(
        projectId: number,
        file: File,
        userId: number
    ): Promise<ApiResponse<ProjectFile>> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', String(userId));

            const response = await this.axiosInstance.post<ApiResponse<ProjectFile>>(
                `/Project/${projectId}/files`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            console.log("Полученный файл:", response.data);
            return response.data;
        } catch (error) {
            console.error("Ошибка при загрузке файла:", error);
            return {
                success: false,
                error: axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Неизвестная ошибка',
            };
        }
    }

    async getUserProjectFiles(userId: number, projectId: number): Promise<ApiResponse<ProjectFile[]>> {
        try {
            const response = await this.axiosInstance.get(`/Project/${projectId}/files?userId=${userId}`);
            const data = response.data;

            console.log("Полученные файлы проекта:", data);

            // Если API вернул просто массив файлов, оборачиваем вручную
            if (Array.isArray(data)) {
                return {
                    success: true,
                    data,
                };
            }

            // Если API вернул стандартный ApiResponse
            if (data.success !== undefined) {
                return data;
            }

            // Иначе формат неожиданный
            return {
                success: false,
                error: "Неверный формат ответа от сервера",
            };
        } catch (error: unknown) {
            console.error("Ошибка при получении файлов проекта:", error);

            if (axios.isAxiosError(error)) {
                console.error("Server error details:", error.response);
                return {
                    success: false,
                    error: error.message || "Неизвестная ошибка",
                };
            }

            return {
                success: false,
                error: "Неизвестная ошибка",
            };
        }
    }

    async DownloadFile(fileId: number): Promise<ApiResponse<string>> {
        try {
            const response = await this.axiosInstance.get<ApiResponse<string>>(`/ProjectFile/${fileId}/download`);
            console.log("Полученный файл:", response.data);
            return response.data;
        } catch (error) {
            console.error("Ошибка при загрузке файла:", error);
            return {
                success: false,
                error: axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Неизвестная ошибка',
            };
        }
    }
}

export const apiService = new ApiService();

// Инициализация аутентификации только на клиентской стороне
if (isClient) {
    apiService.initializeAuth();
}
