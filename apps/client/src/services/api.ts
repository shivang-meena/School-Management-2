import axios from 'axios';
import { Platform } from 'react-native';

const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('erp_auth_token', token);
    }
  } else {
    delete api.defaults.headers.common['Authorization'];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('erp_auth_token');
    }
  }
};

// Initialize token on web load if available
if (typeof localStorage !== 'undefined') {
  const saved = localStorage.getItem('erp_auth_token');
  if (saved) {
    setAuthToken(saved);
  }
}
