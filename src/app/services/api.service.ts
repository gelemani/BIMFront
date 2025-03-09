import { API_URL, API_HEADERS, LoginRequest, RegisterRequest, ApiResponse } from '../config/api';

export interface AuthResponse {
    token: string;
    userId: number;
}

class ApiService {
    private authToken: string | null = null;

    private getHeaders() {
        return {
            ...API_HEADERS,
            ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {})
        };
    }

    async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка авторизации');
            }

            const result = await response.json();
            if (result.success && result.data?.token) {
                this.authToken = result.data.token;
                // Сохраняем токен в localStorage для сохранения сессии
                localStorage.setItem('authToken', result.data.token);
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка регистрации');
            }

            const result = await response.json();
            if (result.success && result.data?.token) {
                this.authToken = result.data.token;
                localStorage.setItem('authToken', result.data.token);
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    async registerCompanyInfo(data: Pick<RegisterRequest, 'companyName' | 'companyPosition'>): Promise<ApiResponse<AuthResponse>> {
        try {
            const response = await fetch(`${API_URL}/auth/register-company`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка регистрации компании');
            }

            const result = await response.json();
            if (result.success && result.data?.token) {
                this.authToken = result.data.token;
                localStorage.setItem('authToken', result.data.token);
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    // Инициализация токена при загрузке приложения
    initializeAuth() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
        }
    }

    // Выход из системы
    logout() {
        this.authToken = null;
        localStorage.removeItem('authToken');
    }
}

export const apiService = new ApiService();

// Инициализируем токен при импорте сервиса
apiService.initializeAuth(); 