import axios, { AxiosInstance } from 'axios';
import { API_URL, API_HEADERS, LoginRequest, RegisterRequest, ApiResponse } from '../config/api';

export interface AuthResponse {
    token: string;
    userId: number;
}

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

            console.log("Сырой ответ от сервера:", response); // Логируем весь response

            if (!response || !response.data) {
                console.error("Ошибка: сервер не вернул данных!");
                return { success: false, error: "Ошибка сервера: пустой ответ" };
            }

            console.log("Обработанный ответ:", response.data);

            if (response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                if (isClient) {
                    localStorage.setItem('authToken', response.data.data.token);
                }
            }

            return response.data;
        } catch (error: unknown) {
            console.error("Ошибка при запросе:", error);
            return {
                success: false,
                error: axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'Неизвестная ошибка'
            };
        }
    }

    // Метод для регистрации
    async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            console.log("Данные для регистрации:", data); // Логируем данные для регистрации
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data);
            console.log("Ответ от сервера:", response.data);

            if (response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                if (isClient) {
                    localStorage.setItem('authToken', response.data.data.token);
                }
            }

            return response.data;
        } catch (error) {
            console.log("Ошибка регистрации:", error);
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

    async registerCompanyInfo(data: { companyName: string; companyPosition: string }): Promise<ApiResponse<{ userId: number }>> {
        try {
            console.log("Данные для регистрации компании:", data);
            const response = await this.axiosInstance.post<ApiResponse<{ userId: number }>>('/company/register', data);
            console.log("Ответ от сервера:", response.data);

            return response.data;
        } catch (error) {
            console.log("Ошибка регистрации компании:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Ошибка регистрации компании'
            };
        }
    }

}

export const apiService = new ApiService();

// Инициализация аутентификации только на клиентской стороне
if (isClient) {
    apiService.initializeAuth();
}
