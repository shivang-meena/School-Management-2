import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';
import { UserProfile, LoginInput, LoginSchema } from '@erp/contracts';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user session was stored in localStorage
    if (typeof localStorage !== 'undefined') {
      const savedToken = localStorage.getItem('erp_auth_token');
      const savedUser = localStorage.getItem('erp_auth_user');
      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setAuthToken(savedToken);
        } catch {
          // ignore corrupted local storage
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (input: LoginInput) => {
    LoginSchema.parse(input); // Client-side Zod validation
    const response = await api.post('/auth/login', input);
    const { accessToken, user: profile } = response.data;
    setToken(accessToken);
    setUser(profile);
    setAuthToken(accessToken);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('erp_auth_token', accessToken);
      localStorage.setItem('erp_auth_user', JSON.stringify(profile));
    }
    return profile as UserProfile;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('erp_auth_token');
      localStorage.removeItem('erp_auth_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
