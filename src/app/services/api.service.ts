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
            // const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/Auth/login', data);
            const response: ApiResponse<AuthResponse> = {
                success: true,
                data: {
                    token: "test_token",
                    userId: 1
                }
            }
            console.log("Сырой ответ от сервера:", response); // Логируем весь response

            if (!response || !response.data) {
                console.error("Ошибка: сервер не вернул данных!");
                return { success: false, error: "Ошибка сервера: пустой ответ" };
            }

            console.log("Обработанный ответ:", response.data);

            if (response.success && response.data.token) {
                this.authToken = response.data.token;
                if (isClient) {
                    localStorage.setItem('authToken', response.data.token);
                }
            }

            return response;
        } catch (error: unknown) {
            console.error("Ошибка при запросе:", error);
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
}

export const apiService = new ApiService();

// Инициализация аутентификации только на клиентской стороне
if (isClient) {
    apiService.initializeAuth();
}
