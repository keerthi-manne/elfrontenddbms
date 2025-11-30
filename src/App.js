import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Projects from './pages/Projects';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProjectDetails from './pages/ProjectDetails';  // ✅ NEW IMPORT
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/layout/ProtectedRoute';
import NotificationBell from './components/layout/NotificationBell';
import { useAuth } from './context/AuthContext';

// Navbar Component
function Navbar() {
  const { userRole, logoutUser } = useAuth();

  if (!userRole) return null;

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem 2rem',
      color: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>El-Management</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="/projects" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Projects</a>
            {userRole === 'Admin' && <a href="/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Admin</a>}
            {userRole === 'Faculty' && <a href="/faculty" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Faculty</a>}
            {userRole === 'Student' && <a href="/student" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Student</a>}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 500 }}>👤 {userRole}</span>
            <NotificationBell />
            <button 
              onClick={logoutUser}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1, paddingTop: '1rem' }}>
            <Routes>
              {/* Default root -> /login */}
              <Route path="/" element={<Navigate to="/login" />} />

              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Student Dashboard */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['Student', 'Admin']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Projects page + DETAILS ROUTE ✅ NEW */}
              <Route
                path="/projects"
                element={
                  <ProtectedRoute allowedRoles={['Student', 'Admin', 'Faculty']}>
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId"  // ✅ NEW PROJECT DETAILS ROUTE
                element={
                  <ProtectedRoute allowedRoles={['Student', 'Admin', 'Faculty']}>
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only dashboard */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Faculty dashboard */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['Faculty', 'Admin']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
