import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';  // ✅ NEW IMPORT
import { getProjects } from '../api/projects';
import { useAuth } from '../context/AuthContext';

function Projects() {
  const { authToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) return;

    getProjects(authToken)
      .then((res) => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Projects fetch error:', err);
        setError('Failed to fetch projects');
        setLoading(false);
      });
  }, [authToken]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading projects...</div>;
  if (error) return <div style={{ color: 'red', padding: '2rem', textAlign: 'center' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>All Projects</h2>
      
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
        {projects.map((p) => (
          <div 
            key={p.ProjectID} 
            style={{ 
              padding: '1.5rem', 
              border: '1px solid #ddd', 
              borderRadius: '12px', 
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: '#667eea' }}>{p.Title}</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              {p.Abstract ? `${p.Abstract.substring(0, 100)}...` : 'No abstract available'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                background: '#e9ecef', 
                borderRadius: '20px', 
                fontSize: '0.85rem',
                color: p.Status === 'Approved' ? '#28a745' : '#ffc107'
              }}>
                {p.Status}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                Theme ID: {p.ThemeID}
              </span>
              <Link 
                to={`/projects/${p.ProjectID}`}  // ✅ NAVIGATES TO DETAILS
                style={{
                  padding: '0.5rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          <h3>No projects found</h3>
          <p>Create or join a team to see projects!</p>
        </div>
      )}
    </div>
  );
}

export default Projects;
