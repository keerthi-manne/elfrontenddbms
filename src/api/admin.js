import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export function getDashboardSummary(token) {
  return axios.get(`${API_BASE}/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function assignFacultyToTheme(token, payload) {
  return axios.post(`${API_BASE}/admin/assign_faculty_theme`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
