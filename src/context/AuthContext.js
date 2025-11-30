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
    const userId = localStorage.getItem('userId');
    
    if (token && role) {
      setAuthToken(token);
      setUserRole(role);
      setUserId(userId);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Decode JWT payload for verification
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔑 JWT payload:', payload); // DEBUG
        // Backend might store userId in sub, user_id, or identity
        const decodedUserId = payload.sub || payload.user_id || payload.identity;
        if (decodedUserId && decodedUserId !== userId) {
          setUserId(decodedUserId);
          localStorage.setItem('userId', decodedUserId);
        }
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
      
      // ✅ Handle different backend response formats
      const { access_token, user, role } = response.data;
      
      // Extract role from various possible locations
      const userRole = role || user?.role || user?.Role;
      
      // Extract userId from various possible locations
      const userIdFromResponse = user?.userId || user?.UserID || user?.id;
      
      console.log('Login response:', response.data); // DEBUG
      
      // ✅ Save ALL data to localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('userId', userIdFromResponse);
      
      // ✅ Set context state
      setAuthToken(access_token);
      setUserRole(userRole);
      setUserId(userIdFromResponse);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // ✅ Return expected format for Login.js
      return { 
        success: true, 
        role: userRole,
        userId: userIdFromResponse 
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
    userId,        // ✅ NOW AVAILABLE for NotificationBell
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
