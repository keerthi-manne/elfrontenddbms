import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export const login = (email, password) =>
  axios.post(`${API_BASE}/auth/login`, { email, password });
