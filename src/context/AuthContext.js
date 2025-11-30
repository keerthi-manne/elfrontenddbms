import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE = 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load token + decode userId from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setAuthToken(token);
      setUserRole(role);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub || payload.user_id || payload.identity);
      } catch (e) {
        console.error('Failed to decode JWT:', e);
      }
    }
    setLoading(false);
  }, []);

  // ✅ FIXED: Match YOUR backend response EXACTLY
  const loginUser = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, { 
        username: identifier,
        password 
      });
      
      // ✅ YOUR backend format: response.data.user.role
      const { access_token, user } = response.data;
      const role = user?.role || response.data.role;  // Fallback
      
      // ✅ Save ALL data
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', user?.userId);
      
      setAuthToken(access_token);
      setUserRole(role);
      setUserId(user?.userId);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // ✅ Login.js expects this format
      return { 
        success: true, 
        role: role,  // ✅ From user.role
        userId: user?.userId 
      };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setAuthToken(null);
    setUserRole(null);
    setUserId(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const getAuthToken = () => authToken;

  const value = {
    authToken,
    userRole,
    userId,
    loginUser,
    logoutUser,
    getAuthToken,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
