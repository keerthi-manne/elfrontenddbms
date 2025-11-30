import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export const getAvailableProjects = (token) => {
  return axios.get(`${API_BASE}/faculty/available_projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const selfAssignMentor = (token, projectId) => {
  return axios.post(`${API_BASE}/faculty/self_assign`, { ProjectID: projectId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const selfAssignJudge = (token, projectId) => {
  return axios.post(`${API_BASE}/faculty/judges/self_assign`, { ProjectID: projectId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyMentorAssignments = (token) => {
  return axios.get(`${API_BASE}/faculty/mentors/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getMyJudgeAssignments = (token) => {
  return axios.get(`${API_BASE}/faculty/judges/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getMyTheme = (token) => {
  return axios.get(`${API_BASE}/faculty/my_theme`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ✅ FIXED: /projects/${projectId}/details (MATCHES YOUR BACKEND)
export const getProjectDetailsWithSubmissions = (token, projectId) => {
  return axios.get(`${API_BASE}/projects/${projectId}/details`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ✅ FIXED: Use your existing /evaluations endpoint
export const submitEvaluation = (token, projectId, evalData) => {
  return axios.post(`${API_BASE}/evaluations`, evalData, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ✅ CORRECT: Matches your backend
export const getProjectTeamMembers = (token, projectId) => {
  return axios.get(`${API_BASE}/projects/${projectId}/team_members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getProjectPhaseAggregate = (token, projectId, phase) => {
  return axios.get(`${API_BASE}/faculty/${projectId}/phase_aggregate/${phase}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyTeams = (token, userId) => {
  return axios.get(`${API_BASE}/teams/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getAllProjectsWithAggregates = (token) => {
  return axios.get(`${API_BASE}/projects/admin/all_with_aggregates`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const approveProject = (token, projectId) => {
  return axios.post(`${API_BASE}/projects/${projectId}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const rejectProject = (token, projectId) => {
  return axios.post(`${API_BASE}/projects/${projectId}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const exportProjectsCSV = (token) => {
  return axios.get(`${API_BASE}/projects/admin/export_csv`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
};
