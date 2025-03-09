import axios, { AxiosInstance } from 'axios';
import { API_URL, API_HEADERS, LoginRequest, RegisterRequest, ApiResponse } from '../config/api';

export interface AuthResponse {
    token: string;
    userId: number;
}

class ApiService {
    private authToken: string | null = null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_URL,
            headers: API_HEADERS
        });

        // Add interceptor to add auth token to requests
        this.axiosInstance.interceptors.request.use((config) => {
            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }
            return config;
        });
    }

    async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/Auth/login', data);
            
            if (response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                localStorage.setItem('authToken', response.data.data.token);
            }
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data);
            
            if (response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                localStorage.setItem('authToken', response.data.data.token);
            }
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Ошибка регистрации'
            };
        }
    }

    async registerCompanyInfo(data: Pick<RegisterRequest, 'companyName' | 'companyPosition'>): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register-company-info', data);
            
            if (response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                localStorage.setItem('authToken', response.data.data.token);
            }
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Ошибка регистрации компании'
            };
        }
    }

    initializeAuth() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
        }
    }

    logout() {
        this.authToken = null;
        localStorage.removeItem('authToken');
    }
}

export const apiService = new ApiService();

// Инициализируем токен при импорте сервиса
apiService.initializeAuth(); 