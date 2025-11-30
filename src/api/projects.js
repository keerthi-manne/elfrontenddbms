
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export const getProjects = (token) =>
  axios.get(`${API_BASE}/projects/`, {  // ✅ Add trailing slash
    headers: { Authorization: `Bearer ${token}` },
  });
