import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';  // ✅ Fixed import
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        // ✅ Redirect based on role
        if (result.role === 'Admin') {
          navigate('/admin');
        } else if (result.role === 'Faculty') {
          navigate('/faculty');
        } else if (result.role === 'Student') {
          navigate('/student');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '50px auto', 
      padding: '2rem', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      borderRadius: '8px',
      background: 'white'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
        El-Management Login
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="Email (admin@rvce.edu.in)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ 
            padding: '0.75rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '1rem'
          }}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password (admin123)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ 
            padding: '0.75rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '1rem'
          }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '0.75rem', 
            background: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      {error && (
        <p style={{ 
          color: '#dc3545', 
          textAlign: 'center', 
          marginTop: '1rem',
          background: '#f8d7da',
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </p>
      )}
      
      <div style={{ 
        marginTop: '1.5rem', 
        textAlign: 'center', 
        fontSize: '0.9rem', 
        color: '#666' 
      }}>
        <p><strong>Admin:</strong> admin@rvce.edu.in / admin123</p>
        <p><strong>Faculty:</strong> faculty@rvce.edu.in / faculty123</p>
      </div>
    </div>
  );
}

export default Login;
