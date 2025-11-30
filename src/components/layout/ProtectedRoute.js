// src/components/layout/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { authToken, userRole } = useAuth();

  // Redirect to login if not authenticated
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  // If user role is not allowed, redirect to default projects page
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/projects" replace />;
  }

  // Otherwise, render the children components
  return children;
}

export default ProtectedRoute;
