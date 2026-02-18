"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import axios from "axios";

interface User {
    id: string;
    email: string;
    name: string;
    photoURL?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    checkUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: () => { },
    logout: () => { },
    checkUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkUser = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Call /api/auth/user/me with the JWT token
            const response = await axios.get("/api/auth/user/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Map backend response (pictureUrl) to frontend expectation (photoURL)
            const userData = response.data;
            setUser({
                ...userData,
                photoURL: userData.pictureUrl || userData.photoURL
            });
        } catch (error) {
            // Not logged in or token expired
            setUser(null);
            localStorage.removeItem("token");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUser();
    }, [checkUser]);

    const login = useCallback(() => {
        // Redirect to the backend OAuth2 endpoint
        // Using relative path so it goes through Nginx -> Auth Service
        window.location.href = "/api/auth/oauth2/authorization/google";
    }, []);

    const logout = useCallback(async () => {
        try {
            localStorage.removeItem("token");
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
