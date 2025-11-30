// src/components/layout/NotificationBell.js - FIXED Hoisting!
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const NotificationBell = () => {
  const { authToken, userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ✅ 1. FIXED: fetchNotifications FIRST (no dependencies on other functions)
  const fetchNotifications = useCallback(async (signal = null) => {
    if (!authToken) return;
    
    try {
      const response = await axios.get(`${API_BASE}/notifications/inbox`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal
      });
      
      const newNotifications = response.data.notifications || [];
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.isRead).length || 0);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch notifications:', err.response?.data || err);
    }
  }, [authToken]);

  // ✅ 2. FIXED: connectSSE SECOND (depends on safe refs)
  const connectSSE = useCallback(() => {
    if (!authToken || !userId || eventSourceRef.current) return;

    // Close existing SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${API_BASE}/notifications/sse`;
    eventSourceRef.current = new EventSource(url, { withCredentials: true });

    eventSourceRef.current.onopen = () => {
      console.log('🟢 SSE Connected');
      setSseConnected(true);
    };

    eventSourceRef.current.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        if (notification.type !== 'heartbeat' && notification.UserID === userId) {
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSourceRef.current.onerror = () => {
      console.log('🔴 SSE Error → Using polling');
      setSseConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [authToken, userId]);

  // ✅ 3. MAIN EFFECT LAST (depends on both functions)
  useEffect(() => {
    if (!authToken || !userId) return;

    // Cleanup previous
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // New controllers
    abortControllerRef.current = new AbortController();
    
    // Initial fetch + polling
    fetchNotifications(abortControllerRef.current.signal);
    pollIntervalRef.current = setInterval(() => 
      fetchNotifications(abortControllerRef.current?.signal), 3000
    );

    // SSE
    connectSSE();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [authToken, userId, fetchNotifications, connectSSE]);

  // ✅ Team invite handlers
  const approveTeamInvite = useCallback(async (projectId, notification) => {
    if (!authToken) return;
    
    try {
      await axios.post(`${API_BASE}/notifications/team-invite/${projectId}/approve`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      setNotifications(prev => prev.filter(n => 
        !(n.type === 'team_invite' && n.projectId == projectId)
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      alert(`✅ Joined "${notification?.projectName || `Project ${projectId}`}"!`);
    } catch (err) {
      alert('Failed to join: ' + (err.response?.data?.error || 'Server error'));
    }
  }, [authToken]);

  const rejectTeamInvite = useCallback((projectId) => {
    setNotifications(prev => prev.filter(n => 
      !(n.type === 'team_invite' && n.projectId == projectId)
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
    alert('❌ Invitation ignored.');
  }, []);

  const markAllRead = async () => {
    if (!authToken) return;
    try {
      await axios.post(`${API_BASE}/notifications/mark_read`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getTypeColor = (type) => {
    const colors = { 
      info: '#17a2b8', 
      success: '#28a745', 
      warning: '#ffc107', 
      error: '#dc3545',
      team_invite: '#007bff'
    };
    return colors[type] || '#6c757d';
  };

  const getTypeIcon = (type) => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      team_invite: '👥'
    };
    return icons[type] || '🔔';
  };

  const handleNotificationClick = (notification) => {
    markAllRead();
    setShowDropdown(false);
  };

  const renderNotificationActions = (notification) => {
    if (notification.type === 'team_invite') {
      return (
        <div style={{ 
          display: 'flex', gap: '0.5rem', 
          marginTop: '0.5rem', paddingTop: '0.5rem', 
          borderTop: '1px solid #e9ecef'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              approveTeamInvite(notification.projectId, notification);
            }}
            style={{
              flex: 1, padding: '0.4rem 0.8rem',
              background: '#28a745', color: 'white',
              border: 'none', borderRadius: '6px',
              fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer'
            }}
          >
            ✅ Join Team
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              rejectTeamInvite(notification.projectId);
            }}
            style={{
              flex: 1, padding: '0.4rem 0.8rem',
              background: '#6c757d', color: 'white',
              border: 'none', borderRadius: '6px',
              fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer'
            }}
          >
            ❌ Reject
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative', padding: '0.5rem',
          background: 'none', border: 'none',
          fontSize: '1.5rem', cursor: 'pointer', outline: 'none'
        }}
        aria-label="Notifications"
        title={`Notifications: ${sseConnected ? '🟢 SSE Live' : '🟡 Polling'}`}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: '#dc3545', color: 'white',
            borderRadius: '50%', width: '20px', height: '20px',
            fontSize: '0.75rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 'bold',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <span style={{ 
          fontSize: '0.6rem', position: 'absolute', 
          bottom: '-4px', right: '-4px',
          background: sseConnected ? '#28a745' : '#ffc107',
          color: 'white', borderRadius: '3px', padding: '0 3px'
        }}>
          {sseConnected ? 'LIVE' : 'POLL'}
        </span>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          width: '380px', maxHeight: '450px',
          background: 'white', border: '1px solid #dee2e6',
          borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          zIndex: 10000, overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1rem 1.25rem', borderBottom: '1px solid #e9ecef', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#f8f9fa'
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Notifications ({notifications.length}) {sseConnected && '🟢'}
            </h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ 
                background: 'none', border: '1px solid #007bff', 
                color: '#007bff', padding: '0.25rem 0.75rem', 
                borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                fontWeight: 500
              }}>
                Mark all read
              </button>
            )}
          </div>
          
          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.map((notif, idx) => (
              <div
                key={idx}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  padding: '1.125rem 1.25rem', borderBottom: '1px solid #f1f3f4',
                  background: notif.isRead ? '#f8f9fa' : 'white',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column'
                }}
                onMouseEnter={(e) => !notif.isRead && (e.currentTarget.style.background = '#e3f2fd')}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notif.isRead ? '#f8f9fa' : 'white';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: getTypeColor(notif.type), marginTop: '0.375rem',
                    flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      margin: '0 0 0.375rem 0', fontSize: '0.9rem',
                      fontWeight: notif.isRead ? 400 : 600, lineHeight: 1.4,
                      color: notif.isRead ? '#666' : '#212529'
                    }}>
                      <span>{getTypeIcon(notif.type)} </span>
                      {notif.message}
                    </p>
                    <small style={{ color: '#adb5bd', fontSize: '0.75rem', fontWeight: 400 }}>
                      {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'Just now'}
                    </small>
                  </div>
                </div>
                {renderNotificationActions(notif)}
              </div>
            ))}
          </div>
          
          {notifications.length === 0 && (
            <div style={{ 
              padding: '3rem 2rem', textAlign: 'center', 
              color: '#adb5bd', fontSize: '0.95rem' 
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
              No notifications yet
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
