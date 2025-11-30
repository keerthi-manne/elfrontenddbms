import React, { useEffect, useState } from 'react';
import { getProjects } from '../api/projects';
import { useAuth } from '../context/AuthContext';

function Projects() {
  const { authToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjects(authToken)
      .then((res) => {
        setProjects(res.data);
      })
      .catch((err) => {
        setError('Failed to fetch projects');
      });
  }, [authToken]);

  return (
    <div>
      <h2>Your Projects</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.ProjectID}>{p.Title}</li>
        ))}
      </ul>
    </div>
  );
}

export default Projects;
