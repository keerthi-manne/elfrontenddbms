import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAllProjectsWithAggregates,
  approveProject,
  rejectProject,
  getProjectDetailsWithSubmissions,
  getProjectTeamMembers,
  exportProjectsCSV,
} from '../api/faculty';
import NotificationBell from '../components/layout/NotificationBell'; 
import axios from 'axios';  // ADD THIS
const API_BASE = 'http://localhost:5000';  // ADD THIS
 // ✅ YOUR PATH
// ... rest unchanged

// Header JSX:
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <h2>Admin Dashboard</h2>
  <NotificationBell />  // ✅ WORKING!
</div>

function AdminDashboard() {
  const { authToken, userRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sortBy, setSortBy] = useState('phase3'); // phase1, phase2, phase3, teamSize
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
  userId: '', name: '', email: '', password: '', role: 'Student', 
  dept: '', semester: '', status: 'Approved'
   });

  // Extract user ID from JWT
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setCurrentUserId(payload.sub || payload.user_id);
      } catch (e) {
        console.error('Failed to decode JWT:', e);
      }
    }
  }, [authToken]);

  const loadAllProjects = useCallback(async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      const res = await getAllProjectsWithAggregates(authToken);
      setProjects(res.data.projects || []);
    } catch (err) {
      setMessage('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const handleViewProject = async (projectId) => {
    try {
      setMessage('');
      const detailsRes = await getProjectDetailsWithSubmissions(authToken, projectId);
      setSelectedProject(detailsRes.data.project);
      setSelectedSubs(detailsRes.data.submissions || []);

      const teamRes = await getProjectTeamMembers(authToken, projectId);
      setTeamMembers(teamRes.data || []);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to load project');
    }
  };

  const handleApprove = async (projectId) => {
    try {
      await approveProject(authToken, projectId);
      setMessage('Project approved successfully!');
      loadAllProjects(); // Refresh list
    } catch (err) {
      setMessage(err.response?.data?.error || 'Approval failed');
    }
  };

  const handleReject = async (projectId) => {
    try {
      await rejectProject(authToken, projectId);
      setMessage('Project rejected');
      loadAllProjects();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Rejection failed');
    }
  };
  // ✅ FIXED: handleCreateUser with PROPER field names
const handleCreateUser = async (e) => {
  e.preventDefault();
  if (!authToken) return;
  
  // ✅ FIX: Map frontend fields to backend expectations
  const payload = {
    user_id: createUserForm.userId,
    name: createUserForm.name,
    email: createUserForm.email,
    password: createUserForm.password,
    role: createUserForm.role,
    status: createUserForm.status,
    Dept: createUserForm.dept,        // ✅ Capital D
    Semester: createUserForm.role === 'Student' ? createUserForm.semester : null  // ✅ Capital S
  };

  try {
    const response = await axios.post(`${API_BASE}/auth/create_user`, payload, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    setMessage(response.data.message);
    setShowCreateUser(false);
    setCreateUserForm({
      userId: '', name: '', email: '', password: '',
      role: 'Student', dept: '', semester: '', status: 'Approved'
    });
    loadAllProjects();
  } catch (err) {
    console.error('Create user error:', err.response?.data);  // ✅ DEBUG
    setMessage(err.response?.data?.error || 'Failed to create user');
  }
};



  const sortedProjects = [...projects].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'phase1':
        aVal = a.phase1_avg || 0;
        bVal = b.phase1_avg || 0;
        break;
      case 'phase2':
        aVal = a.phase2_avg || 0;
        bVal = b.phase2_avg || 0;
        break;
      case 'phase3':
        aVal = a.phase3_avg || 0;
        bVal = b.phase3_avg || 0;
        break;
      case 'teamSize':
        aVal = a.team_size || 0;
        bVal = b.team_size || 0;
        break;
      case 'title':
        // Sort alphabetically by project title
        if (!a.Title) a.Title = '';
        if (!b.Title) b.Title = '';
        return sortOrder === 'desc'
          ? b.Title.localeCompare(a.Title)
          : a.Title.localeCompare(b.Title);
      default:
        aVal = a.phase3_avg || 0;
        bVal = b.phase3_avg || 0;
    }
    if (sortOrder === 'desc') {
      return bVal - aVal;
    }
    return aVal - bVal;
  });

  useEffect(() => {
    loadAllProjects();
  }, [loadAllProjects]);

  const handleExportCSV = async () => {
    if (!authToken) {
      setMessage('Not authorized to export CSV');
      return;
    }
    try {
      const response = await exportProjectsCSV(authToken);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'project_rankings.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setMessage('Failed to export CSV');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading projects...</div>;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Logged in as: <strong>{userRole}</strong>
        </p>
      </div>

      {message && (
        <div
          style={{
            background: '#d4edda',
            color: '#155724',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #28a745',
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleExportCSV}
        style={{
          padding: '0.5rem 1.25rem',
          backgroundColor: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        ⬇️ Export Rankings CSV
      </button>
      <button 
  onClick={() => setShowCreateUser(!showCreateUser)}
  style={{ padding: '0.75rem 1.5rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '1rem' }}
>
  ➕ Create New User
</button>
   
// ADD FULL FORM HERE:
{showCreateUser && (
  <section style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
    <h3>Create New User</h3>
    <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <input placeholder="UserID" value={createUserForm.userId} onChange={(e) => setCreateUserForm({...createUserForm, userId: e.target.value})} required />
      <input placeholder="Name" value={createUserForm.name} onChange={(e) => setCreateUserForm({...createUserForm, name: e.target.value})} required />
      <input type="email" placeholder="Email" value={createUserForm.email} onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})} required />
      <input type="password" placeholder="Password" value={createUserForm.password} onChange={(e) => setCreateUserForm({...createUserForm, password: e.target.value})} required />
      
      <select value={createUserForm.role} onChange={(e) => setCreateUserForm({...createUserForm, role: e.target.value})} style={{ padding: '0.75rem' }}>
        <option value="Student">Student</option>
        <option value="Faculty">Faculty</option>
        <option value="Admin">Admin</option>
      </select>
      
      <input placeholder="Department" value={createUserForm.dept} onChange={(e) => setCreateUserForm({...createUserForm, dept: e.target.value})} />
      
      {createUserForm.role === 'Student' && (
        <input type="number" placeholder="Semester" value={createUserForm.semester} onChange={(e) => setCreateUserForm({...createUserForm, semester: e.target.value})} min="1" max="8" />
      )}
      
      <select value={createUserForm.status} onChange={(e) => setCreateUserForm({...createUserForm, status: e.target.value})} style={{ padding: '0.75rem' }}>
        <option value="Approved">Approved</option>
        <option value="Pending">Pending</option>
      </select>
      
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
        <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px' }}>Create User</button>
        <button type="button" onClick={() => setShowCreateUser(false)} style={{ flex: 1, padding: '0.75rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px' }}>Cancel</button>
      </div>
    </form>
  </section>
)}

      
      

      {/* Projects Ranking Table */}
      <section>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>
          All Projects ({projects.length}) - Sorted by {sortBy.toUpperCase()}{' '}
          {sortOrder === 'desc' ? '↓' : '↑'}
        </h3>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#495057', color: 'white' }}>
                <th
                  style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Project{' '}
                  <span style={{ fontSize: '0.9em' }}>
                    {sortBy === 'title' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                  </span>
                </th>
                <th
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('phase1');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Phase 1{' '}
                  <span style={{ fontSize: '0.9em' }}>
                    {sortBy === 'phase1' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                  </span>
                </th>
                <th
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('phase2');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Phase 2{' '}
                  <span style={{ fontSize: '0.9em' }}>
                    {sortBy === 'phase2' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                  </span>
                </th>
                <th
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('phase3');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Phase 3{' '}
                  <span style={{ fontSize: '0.9em' }}>
                    {sortBy === 'phase3' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                  </span>
                </th>
                <th
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('teamSize');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Team{' '}
                  <span style={{ fontSize: '0.9em' }}>
                    {sortBy === 'teamSize' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                  </span>
                </th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => (
                <tr key={project.ProjectID} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>
                    <div>
                      <strong>{project.Title}</strong> (ID: {project.ProjectID})
                      <br />
                      <small style={{ color: '#666' }}>
                        {project.ThemeName} | {project.Status}
                      </small>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {project.phase1_avg ? project.phase1_avg.toFixed(1) : '—'}
                    <br />
                    <small>
                      ({project.phase1_scored}/{project.phase1_total})
                    </small>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {project.phase2_avg ? project.phase2_avg.toFixed(1) : '—'}
                    <br />
                    <small>
                      ({project.phase2_scored}/{project.phase2_total})
                    </small>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {project.phase3_avg ? project.phase3_avg.toFixed(1) : '—'}
                    <br />
                    <small style={{ color: project.phase3_avg ? 'green' : 'orange' }}>
                      ({project.phase3_scored}/{project.phase3_total})
                    </small>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {project.team_size || 0}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        onClick={() => handleViewProject(project.ProjectID)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Details
                      </button>
                      {project.Status === 'Unassigned' && (
                        <>
                          <button
                            onClick={() => handleApprove(project.ProjectID)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleReject(project.ProjectID)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Selected Project Details */}
      {selectedProject && (
        <section style={{ marginTop: '3rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
            }}
          >
            <h3>{selectedProject.Title} - Full Details</h3>
            <button
              onClick={() => {
                setSelectedProject(null);
                setTeamMembers([]);
                setSelectedSubs([]);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ← Back to All Projects
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            {/* Team Members */}
            <div>
              <h4>Team Members ({teamMembers.length})</h4>
              <div
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {teamMembers.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No team members
                  </p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.UserID} style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <strong>{member.UserName}</strong> ({member.UserID})
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Submissions */}
            <div>
              <h4>Submissions ({selectedSubs.length})</h4>
              <div
                style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {selectedSubs.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No submissions</p>
                ) : (
                  selectedSubs.map((sub) => (
                    <div
                      key={sub.SubmissionID}
                      style={{ padding: '1rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}
                    >
                      <strong>{sub.SubmissionType}:</strong> {sub.SubmissionContent}
                      <br />
                      <small style={{ color: '#666' }}>{sub.SubmittedAt}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
  // Add this SECTION to AdminDashboard.js (after Export CSV button

}

export default AdminDashboard;
