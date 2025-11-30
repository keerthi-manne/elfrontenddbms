// src/pages/StudentDashboard.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import NotificationBell from '../components/layout/NotificationBell';

const API_BASE = 'http://localhost:5000';

function StudentDashboard() {
  const { authToken, userRole } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [myEvaluations, setMyEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ AbortController refs for cancelling pending requests
  const abortControllerRef = useRef(null);
  const pollControllerRef = useRef(null);

  // ✅ Extract userId from JWT (use once)
  useEffect(() => {
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setCurrentUserId(payload.sub || payload.user_id || payload.identity);
      } catch (e) {
        console.error('JWT decode failed:', e);
        setCurrentUserId('unknown');
      }
    }
  }, [authToken]);

  // ✅ FIXED: loadMyProjects with AbortController (NO pending!)
  const loadMyProjects = useCallback(async (signal = null) => {
    if (!authToken || !currentUserId) return;
    
    try {
      const response = await axios.get(`${API_BASE}/projects/student`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal  // ✅ Cancel pending requests
      });
      
      setMyProjects(response.data.projects || []);
      setLoading(false);
    } catch (err) {
      if (axios.isCancel(err)) return;  // ✅ Ignore cancelled requests
      
      console.error('Projects error:', err);
      setLoading(false);
      setMessage('Error loading projects.');
    }
  }, [authToken, currentUserId]);

  // ✅ Initial load + cleanup
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    loadMyProjects(abortControllerRef.current.signal);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadMyProjects]);

  // ✅ FIXED: handleViewProject with AbortController
  const handleViewProject = useCallback(async (projectId, signal = null) => {
    if (!currentUserId || !authToken) return;
    
    setLoading(true);
    try {
      setMessage('');
      
      const { data } = await axios.get(`${API_BASE}/projects/${projectId}/details`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal  // ✅ Cancel pending
      });
      
      setSelectedProject(data.project);
      setSelectedSubs(data.submissions || []);
      setMyEvaluations(data.evaluations.filter(ev => ev.StudentUserID === currentUserId) || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      
      console.error('Project details error:', err);
      setMessage('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [authToken, currentUserId]);

  // ✅ FIXED: handleSubmitDoc with AbortController
  const handleSubmitDoc = async () => {
    if (!submissionLink.trim() || !selectedProject || !currentUserId) {
      setMessage('Enter submission link.');
      return;
    }
    
    setSubmitting(true);
    const controller = new AbortController();
    
    try {
      await axios.post(`${API_BASE}/projectsubmissions/create`, {
        ProjectID: selectedProject.ProjectID,
        StudentUserID: currentUserId,
        SubmissionType: submissionLink.trim()
      }, { 
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal
      });
      
      setMessage('✅ Submission saved! Waiting for faculty evaluation.');
      setSubmissionLink('');
      
      // Reload project data
      await handleViewProject(selectedProject.ProjectID, controller.signal);
    } catch (err) {
      if (axios.isCancel(err)) return;
      
      setMessage('Failed to submit link: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Loading spinner
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        fontSize: '1.2rem', 
        color: '#666' 
      }}>
        🔄 Loading your dashboard...
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>
            Student Dashboard
          </h2>
          <p style={{ color: '#666', margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
            Logged in as: <strong>{userRole}</strong> ({currentUserId})
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Messages */}
      {message && (
        <div style={{
          color: message.includes('✅') ? '#155724' : '#721c24',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          borderLeft: `4px solid ${message.includes('✅') ? '#28a745' : '#dc3545'}`,
          fontWeight: 500
        }}>
          {message}
        </div>
      )}

      {/* Your Projects */}
      <section>
        <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.4rem' }}>
          Your Projects ({myProjects.length})
        </h3>
        
        {myProjects.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            background: '#f8f9fa', 
            borderRadius: '12px', 
            textAlign: 'center', 
            color: '#666',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h4>No projects assigned yet</h4>
            <p>Check with your faculty or wait for project allocation.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {myProjects.map(project => (
              <div
                key={project.ProjectID}
                style={{
                  padding: '1.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                onClick={() => handleViewProject(project.ProjectID)}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <h4 style={{ 
                  margin: '0 0 0.75rem 0', 
                  color: '#333', 
                  fontSize: '1.2rem' 
                }}>
                  {project.ProjectName}
                </h4>
                <p style={{ 
                  margin: '0 0 1.25rem 0', 
                  color: '#666', 
                  lineHeight: 1.5 
                }}>
                  {project.Description}
                </p>
                <span style={{
                  padding: '0.4rem 0.8rem',
                  background: project.Status === 'Approved' ? '#28a745' : 
                             project.Status === 'Rejected' ? '#dc3545' : '#ffc107',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {project.Status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected Project Details */}
      {selectedProject && (
        <section style={{ 
          marginTop: '3rem', 
          padding: '2rem', 
          border: '2px solid #007bff', 
          borderRadius: '12px', 
          background: '#f8f9ff' 
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.75rem' 
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.6rem', color: '#007bff' }}>
                {selectedProject.ProjectName}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '1rem' }}>
                {selectedProject.Description}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedProject(null);
                setMyEvaluations([]);
                setSelectedSubs([]);
                setSubmissionLink('');
              }}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.95rem'
              }}
            >
              ← Back to Projects
            </button>
          </div>

          {/* Submit Document */}
          <div style={{ 
            marginBottom: '2.5rem', 
            padding: '1.75rem', 
            background: 'white', 
            borderRadius: '12px', 
            borderLeft: '4px solid #28a745',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 1.25rem 0', color: '#28a745', fontSize: '1.1rem' }}>
              📎 Submit Project Document
            </h4>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
              <input
                type="url"
                placeholder="https://docs.google.com/document/xxx or GitHub repo"
                style={{
                  flex: 1,
                  padding: '0.875rem 1.25rem',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s ease'
                }}
                value={submissionLink}
                onChange={e => setSubmissionLink(e.target.value)}
              />
              <button
                onClick={handleSubmitDoc}
                disabled={submitting || !submissionLink.trim()}
                style={{
                  padding: '0.875rem 2rem',
                  background: submitting || !submissionLink.trim() ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: submitting || !submissionLink.trim() ? 'not-allowed' : 'pointer',
                  minWidth: '120px'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#666', 
              marginTop: '0.75rem' 
            }}>
              Faculty will review your submission and provide feedback below.
            </p>
          </div>

          {/* Your Submissions */}
          <h4 style={{ marginBottom: '1.25rem', color: '#333', fontSize: '1.1rem' }}>
            📋 Your Submissions ({selectedSubs.filter(sub => sub.StudentUserID === currentUserId).length})
          </h4>
          {selectedSubs.filter(sub => sub.StudentUserID === currentUserId).length === 0 ? (
            <div style={{ 
              padding: '2rem', 
              background: '#f8f9fa', 
              borderRadius: '12px', 
              textAlign: 'center', 
              color: '#666',
              border: '2px dashed #dee2e6'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
              No submissions yet. Submit your document above.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {selectedSubs.filter(sub => sub.StudentUserID === currentUserId).map(sub => (
                <div key={sub.SubmissionID} style={{ 
                  padding: '1.5rem', 
                  background: 'white', 
                  borderRadius: '12px', 
                  borderLeft: '4px solid #007bff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    <strong>🔗 Document Link:</strong>{' '}
                    <a 
                      href={sub.SubmissionContent || sub.SubmissionType}
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        color: '#007bff', 
                        textDecoration: 'none', 
                        fontWeight: '500',
                        wordBreak: 'break-all'
                      }}
                    >
                      {sub.SubmissionType.length > 60 ? 
                        `${sub.SubmissionType.substring(0, 60)}...` : sub.SubmissionType}
                    </a>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    Submitted: {new Date(sub.CreatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Faculty Evaluations */}
          <h4 style={{ 
            margin: '2.5rem 0 1.25rem 0', 
            color: '#333', 
            fontSize: '1.1rem' 
          }}>
            🎯 Faculty Evaluations ({myEvaluations.length})
          </h4>
          {myEvaluations.length === 0 ? (
            <div style={{ 
              padding: '2rem', 
              background: '#fff3cd', 
              borderRadius: '12px', 
              borderLeft: '4px solid #ffc107', 
              color: '#856404' 
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⭐</div>
              No evaluations received yet. Submit your work and wait for faculty review.
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)' }}>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'white', textAlign: 'left', fontWeight: 600 }}>Phase</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'white', textAlign: 'left', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'white', textAlign: 'left', fontWeight: 600 }}>Feedback</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'white', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myEvaluations.map(ev => (
                    <tr key={ev.EvaluationID} style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500, color: '#333' }}>
                        {ev.Phase}
                      </td>
                      <td style={{ 
                        padding: '1.25rem 1.5rem', 
                        fontWeight: '700', 
                        color: ev.Score >= 7 ? '#28a745' : ev.Score >= 5 ? '#ffc107' : '#dc3545',
                        fontSize: '1.1rem'
                      }}>
                        {ev.Score}/10
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#555' }}>
                        {ev.Comments || 'No feedback provided'}
                      </td>
                      <td style={{ 
                        padding: '1.25rem 1.5rem', 
                        color: '#666', 
                        fontSize: '0.9rem' 
                      }}>
                        {new Date(ev.CreatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default StudentDashboard;
