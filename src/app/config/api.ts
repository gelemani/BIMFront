export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bim-back.vercel.app/api/';

export const API_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    login: string;
    userName: string;
    userSurname: string;
    email: string;
    password: string;
    companyName: string;
    companyPosition: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
} 