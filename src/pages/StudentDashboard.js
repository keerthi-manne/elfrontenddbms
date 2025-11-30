import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import NotificationBell from '../components/layout/NotificationBell';

const API_BASE = 'http://localhost:5000';

function StudentDashboard() {
  const { authToken, userRole, userId: authUserId } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [myEvaluations, setMyEvaluations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // TEAM CREATION STATE
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    projectName: '',
    themeId: '',
    teammateUserIds: ''
  });
  const [themes, setThemes] = useState([]);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // TEAM INVITATIONS STATE
  const [myInvites, setMyInvites] = useState([]);

  // TIMEOUT refs
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load themes for team creation – use /themes (protected, returns array)
  const loadThemes = useCallback(async () => {
    if (!authToken) return;
    try {
      const { data } = await axios.get(`${API_BASE}/themes`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setThemes(data || []);
      console.log('✅ Loaded themes:', (data || []).length, data);
    } catch (err) {
      console.error('Error loading themes:', err);
      setThemes([]);
    }
  }, [authToken]);

  // Use authUserId first, fallback to JWT decode
  useEffect(() => {
    if (authUserId) {
      setCurrentUserId(authUserId);
    } else if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setCurrentUserId(payload.sub || payload.user_id || payload.identity);
      } catch (e) {
        console.error('JWT decode failed:', e);
        setCurrentUserId('unknown');
      }
    }
  }, [authToken, authUserId]);

  // Load my projects
  
  const loadMyProjects = useCallback(async () => {
    if (!authToken || !currentUserId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Loading projects for student:', currentUserId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setMyProjects([]);
      setLoading(false);
    }, 5000);

    try {
      const response = await axios.get(`${API_BASE}/projects/student`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal
      });

      console.log('✅ Projects response:', response.data);
      setMyProjects(response.data.projects || []);
      setMessage(response.data.message || '');
    } catch (err) {
      if (axios.isCancel(err)) {
        setMyProjects([]);
      } else {
        console.error('Error loading projects:', err);
        setMessage('No projects found yet. Create/Join a team!');
        setMyProjects([]);
      }
    } finally {
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, [authToken, currentUserId]);

  // Load my invitations
  const loadMyInvites = useCallback(async () => {
    if (!authToken) return;
    try {
      const { data } = await axios.get(
        `${API_BASE}/projects/team_invitations/my`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setMyInvites(data.invitations || []);
      console.log('✅ Invites:', data.invitations || []);
    } catch (err) {
      console.error('Invites error', err);
      setMyInvites([]);
    }
  }, [authToken]);

  // Load initial data
  useEffect(() => {
    if (currentUserId) {
      loadMyProjects();
      loadThemes();
      loadMyInvites();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadMyProjects, loadThemes, loadMyInvites, currentUserId]);

  // CREATE TEAM
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.projectName.trim() || !teamForm.themeId || creatingTeam)
      return;

    setCreatingTeam(true);
    try {
      const teammateUserIds = teamForm.teammateUserIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      const response = await axios.post(
        `${API_BASE}/projects/create-team`,
        {
          projectName: teamForm.projectName.trim(),
          themeId: parseInt(teamForm.themeId),
          teammateUserIds
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      setMessage(response.data.message || '✅ Team created successfully!');
      setShowCreateTeam(false);
      setTeamForm({ projectName: '', themeId: '', teammateUserIds: '' });

      await loadMyProjects();
    } catch (err) {
      console.error('Create team error:', err);
      setMessage(
        'Failed to create team: ' + (err.response?.data?.error || err.message)
      );
    } finally {
      setCreatingTeam(false);
    }
  };

  // View project + team members
  const handleViewProject = useCallback(
    async (projectId) => {
      if (!currentUserId || !authToken) return;

      setLoading(true);
      try {
        setMessage('');
        const { data } = await axios.get(
          `${API_BASE}/projects/${projectId}/details`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );

        setSelectedProject(data.project);
        setSelectedSubs(data.submissions || []);
        setMyEvaluations(
          (data.evaluations || []).filter(
            (ev) => ev.StudentUserID === currentUserId
          ) || []
        );

        try {
          const membersRes = await axios.get(
            `${API_BASE}/projects/${projectId}/team_members`,
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          );
          setTeamMembers(membersRes.data);
        } catch (err) {
          console.error('Team members error:', err);
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('Project details error:', err);
        setMessage('Failed to load project details');
      } finally {
        setLoading(false);
      }
    },
    [authToken, currentUserId]
  );

  // Submit document
  const handleSubmitDoc = async () => {
    if (!submissionLink.trim() || !selectedProject || !currentUserId) {
      setMessage('Enter submission link.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/projectsubmissions/create`,
        {
          ProjectID: selectedProject.ProjectID,
          StudentUserID: currentUserId,
          SubmissionType: submissionLink.trim()
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      setMessage('✅ Submission saved!');
      setSubmissionLink('');
      await handleViewProject(selectedProject.ProjectID);
    } catch (err) {
      console.error('Submit error:', err);
      setMessage(
        'Failed to submit: ' + (err.response?.data?.error || err.message)
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Accept / reject invitations
  const handleAcceptInvite = async (projectId) => {
    try {
      await axios.post(
        `${API_BASE}/projects/team_invitations/${projectId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setMessage('Joined team successfully ✅');
      await loadMyInvites();
      await loadMyProjects();
    } catch (err) {
      setMessage(
        'Failed to accept invite: ' + (err.response?.data?.error || err.message)
      );
    }
  };

  const handleRejectInvite = async (projectId) => {
    try {
      await axios.post(
        `${API_BASE}/projects/team_invitations/${projectId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setMessage('Invitation rejected');
      await loadMyInvites();
    } catch (err) {
      setMessage(
        'Failed to reject invite: ' + (err.response?.data?.error || err.message)
      );
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: '1.2rem',
          color: '#666'
        }}
      >
        <div>🔄 Loading your dashboard...</div>
        <div
          style={{
            fontSize: '0.9rem',
            marginTop: '1rem',
            color: '#999'
          }}
        >
          Student: {currentUserId || 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>
            Student Dashboard
          </h2>
          <p
            style={{
              color: '#666',
              margin: '0.25rem 0 0 0',
              fontSize: '1rem'
            }}
          >
            Logged in as: <strong>{userRole}</strong> ({currentUserId})
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Messages */}
      {message && (
        <div
          style={{
            color: message.includes('✅') ? '#155724' : '#721c24',
            background: message.includes('✅') ? '#d4edda' : '#f8d7da',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            borderLeft: `4px solid ${
              message.includes('✅') ? '#28a745' : '#dc3545'
            }`,
            fontWeight: 500
          }}
        >
          {message}
        </div>
      )}

      {/* TEAM INVITATIONS SECTION */}
      <section style={{ marginBottom: '2rem' }}>
        <h3
          style={{
            marginBottom: '1rem',
            color: '#333',
            fontSize: '1.2rem'
          }}
        >
          Team Invitations ({myInvites.length})
        </h3>

        {myInvites.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}
          >
            No pending invitations.
          </div>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            {myInvites.map((inv) => (
              <div
                key={inv.ProjectID}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{inv.ProjectTitle}</div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#666'
                    }}
                  >
                    Invited by {inv.InviterUserID} • {inv.CreatedAt}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem'
                  }}
                >
                  <button
                    onClick={() => handleAcceptInvite(inv.ProjectID)}
                    style={{
                      padding: '0.35rem 0.9rem',
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvite(inv.ProjectID)}
                    style={{
                      padding: '0.35rem 0.9rem',
                      background: '#fff',
                      color: '#dc3545',
                      border: '1px solid #dc3545',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* CREATE TEAM SECTION - only when not in any team */}
{myProjects.length === 0 && (
  !showCreateTeam ? (
    <div
      style={{
        padding: '1.5rem',
        background: '#e3f2fd',
        borderRadius: '12px',
        borderLeft: '4px solid #2196f3',
        marginBottom: '2rem'
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2' }}>
        👥 Create New Team
      </h3>
      <p style={{ color: '#1565c0', margin: '0 0 1rem 0' }}>
        No projects? Create a team and invite classmates!
      </p>
      <button
        onClick={() => setShowCreateTeam(true)}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        🚀 Create Team Now
      </button>
    </div>
  ) : (
    <div
      style={{
        padding: '2rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}
    >
      <h3 style={{ margin: '0 0 1.5rem 0', color: '#333' }}>
        👥 Create New Team
      </h3>
      <form onSubmit={handleCreateTeam}>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: '1fr 1fr'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600
              }}
            >
              Project Name *
            </label>
            <input
              type="text"
              placeholder="e.g., AI-Powered Slum Road Planner"
              value={teamForm.projectName}
              onChange={(e) =>
                setTeamForm({ ...teamForm, projectName: e.target.value })
              }
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              required
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600
              }}
            >
              Theme *
            </label>
            <select
              value={teamForm.themeId}
              onChange={(e) =>
                setTeamForm({ ...teamForm, themeId: e.target.value })
              }
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              required
            >
              <option value="">Select Theme</option>
              {themes.map((theme) => (
                <option key={theme.ThemeID} value={theme.ThemeID}>
                  {theme.ThemeName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}
          >
            Teammate USNs (optional, comma separated)
          </label>
          <input
            type="text"
            placeholder="1rv23is072,1rv23is073"
            value={teamForm.teammateUserIds}
            onChange={(e) =>
              setTeamForm({
                ...teamForm,
                teammateUserIds: e.target.value
              })
            }
            style={{
              width: '100%',
              padding: '0.875rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          <small style={{ color: '#666', fontSize: '0.85rem' }}>
            They can accept the invite from their dashboard.
          </small>
        </div>
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: '1rem'
          }}
        >
          <button
            type="submit"
            disabled={
              creatingTeam ||
              !teamForm.projectName ||
              !teamForm.themeId
            }
            style={{
              flex: 1,
              padding: '1rem 2rem',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: creatingTeam ? 'not-allowed' : 'pointer'
            }}
          >
            {creatingTeam ? 'Creating...' : '🚀 Create Team'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateTeam(false);
              setTeamForm({
                projectName: '',
                themeId: '',
                teammateUserIds: ''
              });
            }}
            style={{
              padding: '1rem 2rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
)}

      {/* Your Projects */}
      <section>
        <h3
          style={{
            marginBottom: '1.5rem',
            color: '#333',
            fontSize: '1.4rem'
          }}
        >
          Your Projects ({myProjects.length})
        </h3>

        {myProjects.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              background: '#f8f9fa',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#666',
              border: '2px dashed #dee2e6'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h4>No projects yet</h4>
            <p>Create a team above or accept invitations!</p>
            <button
              onClick={loadMyProjects}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1.5rem',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(350px, 1fr))'
            }}
          >
            {myProjects.map((project) => (
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 8px 25px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <h4
                  style={{
                    margin: '0 0 0.75rem 0',
                    color: '#333',
                    fontSize: '1.2rem'
                  }}
                >
                  {project.ProjectName}
                </h4>
                <p
                  style={{
                    margin: '0 0 1.25rem 0',
                    color: '#666',
                    lineHeight: 1.5
                  }}
                >
                  {project.Description}
                </p>
                <span
                  style={{
                    padding: '0.4rem 0.8rem',
                    background:
                      project.Status === 'Approved'
                        ? '#28a745'
                        : project.Status === 'Rejected'
                        ? '#dc3545'
                        : '#ffc107',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  {project.Status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected Project Details + TEAM */}
      {selectedProject && (
        <section
          style={{
            marginTop: '3rem',
            padding: '2rem',
            border: '2px solid #007bff',
            borderRadius: '12px',
            background: '#f8f9ff'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.75rem'
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  color: '#007bff'
                }}
              >
                {selectedProject.ProjectName}
              </h3>
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  color: '#666',
                  fontSize: '1rem'
                }}
              >
                {selectedProject.Description} •{' '}
                {selectedProject.ThemeName}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedProject(null);
                setMyEvaluations([]);
                setSelectedSubs([]);
                setTeamMembers([]);
                setSubmissionLink('');
              }}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              ← Back to Projects
            </button>
          </div>

          {/* TEAM MEMBERS */}
          {teamMembers.length > 0 && (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: '#e8f5e8',
                borderRadius: '12px',
                borderLeft: '4px solid #28a745'
              }}
            >
              <h4
                style={{
                  margin: '0 0 1rem 0',
                  color: '#2e7d32'
                }}
              >
                👥 Team Members ({teamMembers.length})
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                {teamMembers.map((member) => (
                  <span
                    key={member.UserID}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'white',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {member.Name || member.UserID}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submit Document */}
          <div
            style={{
              marginBottom: '2.5rem',
              padding: '1.75rem',
              background: 'white',
              borderRadius: '12px',
              borderLeft: '4px solid #28a745',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}
          >
            <h4
              style={{
                margin: '0 0 1.25rem 0',
                color: '#28a745',
                fontSize: '1.1rem'
              }}
            >
              📎 Submit Project Document
            </h4>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'end'
              }}
            >
              <input
                type="url"
                placeholder="https://docs.google.com/document/xxx or GitHub repo"
                style={{
                  flex: 1,
                  padding: '0.875rem 1.25rem',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '1rem'
                }}
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
              />
              <button
                onClick={handleSubmitDoc}
                disabled={submitting || !submissionLink.trim()}
                style={{
                  padding: '0.875rem 2rem',
                  background:
                    submitting || !submissionLink.trim()
                      ? '#6c757d'
                      : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  minWidth: '120px'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Your Submissions */}
          <h4
            style={{
              marginBottom: '1.25rem',
              color: '#333',
              fontSize: '1.1rem'
            }}
          >
            📋 Your Submissions (
            {
              selectedSubs.filter(
                (sub) => sub.StudentUserID === currentUserId
              ).length
            }
            )
          </h4>
          {selectedSubs.filter(
            (sub) => sub.StudentUserID === currentUserId
          ).length === 0 ? (
            <div
              style={{
                padding: '2rem',
                background: '#f8f9fa',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}
              >
                📄
              </div>
              No submissions yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {selectedSubs
                .filter((sub) => sub.StudentUserID === currentUserId)
                .map((sub) => (
                  <div
                    key={sub.SubmissionID}
                    style={{
                      padding: '1.5rem',
                      background: 'white',
                      borderRadius: '12px',
                      borderLeft: '4px solid #007bff'
                    }}
                  >
                    <a
                      href={sub.SubmissionContent || sub.SubmissionType}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: '#007bff',
                        textDecoration: 'none',
                        fontWeight: 500,
                        wordBreak: 'break-all'
                      }}
                    >
                      {sub.SubmissionType.substring(0, 60)}...
                    </a>
                    <div
                      style={{
                        color: '#666',
                        fontSize: '0.9rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      {new Date(
                        sub.SubmittedAt
                      ).toLocaleDateString()}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Faculty Evaluations */}
          <h4
            style={{
              margin: '2.5rem 0 1.25rem 0',
              color: '#333',
              fontSize: '1.1rem'
            }}
          >
            🎯 Faculty Evaluations ({myEvaluations.length})
          </h4>
          {myEvaluations.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                background: '#fff3cd',
                borderRadius: '12px',
                borderLeft: '4px solid #ffc107'
              }}
            >
              <div
                style={{
                  fontSize: '2rem',
                  marginBottom: '1rem'
                }}
              >
                ⭐
              </div>
              No evaluations yet. Submit work for faculty review.
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        'linear-gradient(135deg, #007bff 0%, #0056b3 100%)'
                    }}
                  >
                    <th
                      style={{
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        textAlign: 'left'
                      }}
                    >
                      Phase
                    </th>
                    <th
                      style={{
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        textAlign: 'left'
                      }}
                    >
                      Score
                    </th>
                    <th
                      style={{
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        textAlign: 'left'
                      }}
                    >
                      Feedback
                    </th>
                    <th
                      style={{
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        textAlign: 'left'
                      }}
                    >
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myEvaluations.map((ev) => (
                    <tr
                      key={ev.EvaluationID}
                      style={{
                        borderBottom: '1px solid #f1f3f4'
                      }}
                    >
                      <td
                        style={{
                          padding: '1.25rem 1.5rem',
                          fontWeight: 500
                        }}
                      >
                        {ev.Phase}
                      </td>
                      <td
                        style={{
                          padding: '1.25rem 1.5rem',
                          fontWeight: '700',
                          color:
                            ev.Score >= 7
                              ? '#28a745'
                              : ev.Score >= 5
                              ? '#ffc107'
                              : '#dc3545'
                        }}
                      >
                        {ev.Score}/10
                      </td>
                      <td
                        style={{
                          padding: '1.25rem 1.5rem',
                          color: '#555'
                        }}
                      >
                        {ev.Comments || 'No feedback'}
                      </td>
                      <td
                        style={{
                          padding: '1.25rem 1.5rem',
                          color: '#666',
                          fontSize: '0.9rem'
                        }}
                      >
                        {new Date(
                          ev.CreatedAt
                        ).toLocaleDateString()}
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
