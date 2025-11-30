// src/pages/FacultyDashboard.js - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMyTheme,
  getAvailableProjects,
  selfAssignMentor,
  selfAssignJudge,
  getMyMentorAssignments,
  getMyJudgeAssignments,
  getProjectDetailsWithSubmissions,
  submitEvaluation,
  getProjectTeamMembers,
  getProjectPhaseAggregate,
} from '../api/faculty';
import NotificationBell from '../components/layout/NotificationBell';  // ✅ YOUR PATH
// Header:
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <h1>Faculty Dashboard</h1>
  <NotificationBell />
</div>

function FacultyDashboard() {
  const { authToken, userRole } = useAuth();

  const [myTheme, setMyTheme] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [mentorAssignments, setMentorAssignments] = useState([]);
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [phaseAggregates, setPhaseAggregates] = useState({});
  const [message, setMessage] = useState('');

  const [showEvalForm, setShowEvalForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [evalData, setEvalData] = useState({ score: '', feedback: '', phase: 'Phase1' });

  useEffect(() => {
    if (!authToken) return;
    Promise.all([
      getMyTheme(authToken).then(res => setMyTheme(res.data)).catch(() => setMyTheme(null)),
      getAvailableProjects(authToken).then(res => setAvailableProjects(res.data)).catch(() => setAvailableProjects([])),
      getMyMentorAssignments(authToken).then(res => setMentorAssignments(res.data)).catch(() => setMentorAssignments([])),
      getMyJudgeAssignments(authToken).then(res => setJudgeAssignments(res.data)).catch(() => setJudgeAssignments([])),
    ]);
  }, [authToken]);

  const refreshAssignments = async () => {
    const [mentorsRes, judgesRes] = await Promise.all([
      getMyMentorAssignments(authToken),
      getMyJudgeAssignments(authToken),
    ]);
    setMentorAssignments(mentorsRes.data);
    setJudgeAssignments(judgesRes.data);
  };

  const handleMentor = async (projectId) => {
    setMessage('');
    try {
      const res = await selfAssignMentor(authToken, projectId);
      setMessage(res.data.message);
      await refreshAssignments();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Mentor failed');
    }
  };

  const handleJudge = async (projectId) => {
    setMessage('');
    try {
      const res = await selfAssignJudge(authToken, projectId);
      setMessage(res.data.message);
      await refreshAssignments();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Judge failed');
    }
  };

  const handleViewDetails = async (projectId) => {
  setMessage('');
  setSelectedProject(null); 
  setSelectedSubs([]); 
  setTeamMembers([]); 
  setEvaluations([]); 
  setPhaseAggregates({});

  try {
    // 1. Get project details + EVALUATIONS
    const detailsRes = await getProjectDetailsWithSubmissions(authToken, projectId);
    console.log('Details response:', detailsRes.data); // DEBUG
    setSelectedProject(detailsRes.data.project);
    setSelectedSubs(detailsRes.data.submissions || []);
    setEvaluations(detailsRes.data.evaluations || []);  // ← THIS FIXES FORM

    // 2. Get team members
    const teamRes = await getProjectTeamMembers(authToken, projectId);
    console.log('Team members:', teamRes.data); // DEBUG
    setTeamMembers(teamRes.data || []);

    // 3. Get phase aggregates (optional)
    const aggregates = {};
    for (const phase of ['Phase1', 'Phase2', 'Phase3']) {
      try {
        const aggRes = await getProjectPhaseAggregate(authToken, projectId, phase);
        aggregates[phase] = aggRes.data;
      } catch(e) { /* ignore */ }
    }
    setPhaseAggregates(aggregates);
  } catch (err) {
    console.error('View details error:', err); // DEBUG
    setMessage(err.response?.data?.error || 'Load failed');
  }
};


  const isJudgeForProject = () => judgeAssignments.some(a => a.ProjectID === selectedProject?.ProjectID);
  
  const getNextPhaseForStudent = (studentId) => {
    const studentEvals = evaluations.filter(e => e.StudentUserID === studentId);
    const phases = ['Phase1', 'Phase2', 'Phase3'];
    for (const phase of phases) {
      if (!studentEvals.some(e => e.Phase === phase)) return phase;
    }
    return null;
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setEvalData({ 
      score: '', 
      feedback: '', 
      phase: getNextPhaseForStudent(student.UserID) || 'Phase1' 
    });
    setShowEvalForm(true);
  };

  const handleSubmitEval = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !evalData.score) return;

    try {
      await submitEvaluation(authToken, selectedProject.ProjectID, {
        Score: parseFloat(evalData.score),
        Feedback: evalData.feedback,
        Phase: evalData.phase,
        StudentUserID: selectedStudent.UserID,
      });
      setMessage(`${selectedStudent.UserName} evaluation submitted!`);
      setShowEvalForm(false);
      await handleViewDetails(selectedProject.ProjectID);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Submit failed');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Faculty Dashboard</h2>
      <p>Logged in as: {userRole}</p>
      {myTheme && <p>Your theme: <strong>{myTheme.ThemeName}</strong> (ID: {myTheme.ThemeID})</p>}
      {message && <p style={{ color: 'blue' }}>{message}</p>}

      <section>
        <h3>Projects in Your Theme</h3>
        {availableProjects.length === 0 ? (
          <p>No projects</p>
        ) : (
          <ul>
            {availableProjects.map(p => (
              <li key={p.ProjectID}>
                <strong>{p.Title}</strong> (ID: {p.ProjectID}) – {p.Status}
                <div>
                  <button onClick={() => handleMentor(p.ProjectID)}>Be Mentor</button>
                  <button onClick={() => handleJudge(p.ProjectID)}>Be Judge</button>
                  <button onClick={() => handleViewDetails(p.ProjectID)}>View Details</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <h3>My Mentor Assignments</h3>
          {mentorAssignments.length === 0 ? <p>No assignments</p> : (
            <ul>{mentorAssignments.map(a => (
              <li key={a.ProjectID}>Project {a.ProjectID} – {a.Status}</li>
            ))}</ul>
          )}
        </div>
        <div>
          <h3>My Judge Assignments</h3>
          {judgeAssignments.length === 0 ? <p>No assignments</p> : (
            <ul>{judgeAssignments.map(a => (
              <li key={a.ProjectID}>Project {a.ProjectID} – {a.SelectionType}</li>
            ))}</ul>
          )}
        </div>
      </section>

      {selectedProject && (
        <section>
          <h3>{selectedProject.Title}</h3>
          <p>Theme: {selectedProject.ThemeName} | Status: {selectedProject.Status}</p>

          <h4>Phase Averages</h4>
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Phase</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Avg Score</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Students Scored</th>
              </tr>
            </thead>
            <tbody>
              {['Phase1','Phase2','Phase3'].map(phase => {
                const agg = phaseAggregates[phase];
                return (
                  <tr key={phase}>
                    <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{phase}</td>
                    <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                      {agg?.aggregate_score?.toFixed(1) ?? '—'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                      {agg?.students_scored ?? 0}/{teamMembers.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h4>Team Members ({teamMembers.length})</h4>
          {teamMembers.map(student => {
            const studentEvals = evaluations.filter(e => e.StudentUserID === student.UserID);
            return (
              <div key={student.UserID} style={{ 
                border: '1px solid #ddd', 
                margin: '1rem 0', 
                padding: '1rem', 
                borderRadius: '4px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{student.UserName} ({student.UserID})</strong>
                  <button 
                    onClick={() => handleSelectStudent(student)}
                    disabled={!isJudgeForProject()}
                    style={{ 
                      background: isJudgeForProject() ? '#28a745' : '#ccc',
                      color: 'white', 
                      padding: '0.25rem 0.5rem',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: isJudgeForProject() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {getNextPhaseForStudent(student.UserID) 
                      ? `Score ${getNextPhaseForStudent(student.UserID)}` 
                      : '✅ Complete'
                    }
                  </button>
                </div>
                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                  {studentEvals.length > 0 ? studentEvals.map(ev => (
                    <div key={ev.EvaluationID}>{ev.Phase}: {ev.Score} by {ev.FacultyUserID}</div>
                  )) : 'No scores yet'}
                </div>
              </div>
            );
          })}

          <h4>Submissions ({selectedSubs.length})</h4>
          {selectedSubs.length > 0 && selectedSubs.map(s => (
            <div key={s.SubmissionID} style={{ margin: '0.25rem 0' }}>
              #{s.SubmissionID}: {s.SubmissionContent}
            </div>
          ))}
        </section>
      )}

      {showEvalForm && selectedStudent && (
        <section style={{ border: '2px solid blue', padding: '1rem', margin: '1rem 0' }}>
          <h3>Score {selectedStudent.UserName}</h3>
          <form onSubmit={handleSubmitEval}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Phase: </label>
              <select 
                value={evalData.phase} 
                onChange={(e) => setEvalData({...evalData, phase: e.target.value})}
                style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
              >
                <option value="Phase1">Phase1</option>
                <option value="Phase2">Phase2</option>
                <option value="Phase3">Phase3</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Score (0-10): </label>
              <input 
                type="number" 
                min="0" 
                max="10" 
                step="0.1"
                value={evalData.score} 
                onChange={(e) => setEvalData({...evalData, score: e.target.value})}
                style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                required 
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Feedback: </label>
              <textarea 
                value={evalData.feedback} 
                onChange={(e) => setEvalData({...evalData, feedback: e.target.value})}
                rows="3" 
                style={{ width: '100%', marginTop: '0.25rem', padding: '0.25rem' }}
              />
            </div>
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>Submit</button>
            <button 
              type="button" 
              onClick={() => setShowEvalForm(false)}
              style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default FacultyDashboard;
