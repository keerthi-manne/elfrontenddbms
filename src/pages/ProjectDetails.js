import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function ProjectDetails() {
  const { projectId } = useParams();
  const { authToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  // Fetch main project details
  useEffect(() => {
    if (!authToken || !projectId) return;

    const fetchProjectDetails = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/projects/${projectId}/details`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setData(response.data);
      } catch (err) {
        console.error('Project details error:', err);
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    const fetchTeamMembers = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/projects/${projectId}/team_members`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setTeamMembers(response.data);
      } catch (err) {
        console.error('Team members error:', err);
      }
    };

    fetchProjectDetails();
    fetchTeamMembers();
  }, [authToken, projectId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>
        Loading project details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#dc3545' }}>
        <h3>Error</h3>
        <p>{error}</p>
        <Link to="/projects" style={{ color: '#667eea' }}>← Back to Projects</Link>
      </div>
    );
  }

  const statusColor = data.project.Status === 'Approved' ? '#28a745' : 
                     data.project.Status === 'Rejected' ? '#dc3545' : '#ffc107';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '2rem' }}>
        <Link 
          to="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 500
          }}
        >
          ← Back to Projects
        </Link>
      </div>

      {/* PROJECT HEADER */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '2.5rem', 
        borderRadius: '16px', 
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{data.project.ProjectName}</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: '0.5rem 0 1rem 0' }}>
          {data.project.Description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <strong>Theme:</strong> {data.project.ThemeName}
          </div>
          <div style={{ color: statusColor, fontWeight: 600 }}>
            <strong>Status:</strong> {data.project.Status}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        
        {/* TEAM MEMBERS */}
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Team Members ({teamMembers.length})</h3>
          {teamMembers.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {teamMembers.map(member => (
                <li key={member.UserID} style={{ padding: '0.75rem', background: 'white', marginBottom: '0.5rem', borderRadius: '8px' }}>
                  👤 {member.Name} ({member.UserID})
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No team members assigned</p>
          )}
        </div>

        {/* SUBMISSIONS */}
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Submissions ({data.submissions.length})</h3>
          {data.submissions.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.submissions.map(s => (
                <li key={s.SubmissionID} style={{ padding: '1rem', background: 'white', marginBottom: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                    {s.SubmissionType} 
                    {s.SubmissionContent && (
                      <a 
                        href={s.SubmissionContent} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          marginLeft: '1rem', 
                          color: '#667eea', 
                          textDecoration: 'none',
                          fontWeight: 500 
                        }}
                      >
                        📎 View File
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    By {s.StudentUserID} on {s.SubmittedAt}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No submissions yet</p>
          )}
        </div>

        {/* EVALUATIONS */}
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Evaluations ({data.evaluations.length})</h3>
          {data.evaluations.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.evaluations.map(e => (
                <li key={e.EvaluationID} style={{ padding: '1rem', background: 'white', marginBottom: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{e.Phase}</span>
                    <span style={{ 
                      color: e.Score ? (e.Score >= 7 ? '#28a745' : '#ffc107') : '#6c757d',
                      fontSize: '1.2rem', 
                      fontWeight: 700 
                    }}>
                      {e.Score ? `${e.Score}/10` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    Faculty: {e.FacultyUserID} • {e.CreatedAt}
                  </div>
                  {e.Comments && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#e9ecef', borderRadius: '6px', fontSize: '0.9rem' }}>
                      "{e.Comments}"
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No evaluations yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;
