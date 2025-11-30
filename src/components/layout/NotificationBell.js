import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const NotificationBell = ({ onProjectsChanged }) => {
  const { authToken, userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchNotifications = useCallback(
    async (signal = null) => {
      if (!authToken) return;

      try {
        const response = await axios.get(`${API_BASE}/notifications/inbox`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal
        });

        const newNotifications = response.data.notifications || [];
        console.log('INBOX notifications:', newNotifications);
        setNotifications(newNotifications);
        setUnreadCount(
          newNotifications.filter((n) => !n.isRead).length || 0
        );
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error(
          'Failed to fetch notifications:',
          err.response?.data || err
        );
      }
    },
    [authToken]
  );

  const connectSSE = useCallback(() => {
    if (!authToken || !userId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${API_BASE}/notifications/sse?user_id=${encodeURIComponent(
      userId
    )}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('🟢 SSE Connected');
    };

    es.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        if (notification.type === 'heartbeat') return;
        if (notification.UserID !== userId) return;

        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setUnreadCount((prev) => prev + 1);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    es.onerror = () => {
      console.log('🔴 SSE Error → falling back to polling only');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [authToken, userId]);

  useEffect(() => {
    if (!authToken) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchNotifications(controller.signal);
    pollIntervalRef.current = setInterval(
      () => fetchNotifications(controller.signal),
      3000
    );

    connectSSE();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [authToken, fetchNotifications, connectSSE]);

  const markAllRead = async () => {
    if (!authToken) return;
    try {
      await axios.post(
        `${API_BASE}/notifications/mark_read`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleAcceptInvite = async (notif) => {
    if (!authToken) return;
    try {
      await axios.post(
        `${API_BASE}/notifications/team-invite/${notif.projectId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await fetchNotifications();
      if (onProjectsChanged) onProjectsChanged();
    } catch (e) {
      console.error('Accept invite failed:', e.response?.data || e);
    }
  };

  const handleRejectInvite = async (notif) => {
    if (!authToken) return;
    try {
      await axios.post(
        `${API_BASE}/notifications/team-invite/${notif.projectId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await fetchNotifications();
    } catch (e) {
      console.error('Reject invite failed:', e.response?.data || e);
    }
  };

  const renderNotificationBody = (notif) => {
    if (notif.type === 'team_invite') {
      const inviter = notif.inviterId || 'Someone';
      const projectName = notif.projectName || 'a project';
      return (
        <>
          <div style={{ fontWeight: 600, color: '#333' }}>
            {inviter} invited you to join "{projectName}".
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            <button
              onClick={() => handleAcceptInvite(notif)}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Accept
            </button>
            <button
              onClick={() => handleRejectInvite(notif)}
              style={{
                padding: '0.25rem 0.75rem',
                background: 'white',
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
          <div
            style={{
              fontSize: '0.8rem',
              color: '#666',
              marginTop: '0.25rem'
            }}
          >
            {notif.timestamp || 'Just now'}
          </div>
        </>
      );
    }

    return (
      <>
        <div style={{ fontWeight: 500, color: '#333' }}>
          {notif.message}
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.25rem'
          }}
        >
          {notif.timestamp || 'Just now'}
        </div>
      </>
    );
  };

  if (!authToken) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          padding: '0.5rem',
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '350px',
            maxHeight: '400px',
            background: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 10000,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid #eee',
              background: '#f8f9fa'
            }}
          >
            <h4 style={{ margin: 0 }}>
              Notifications ({notifications.length})
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.75rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.map((notif) => (
              <div
                key={notif.NotificationID}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f0f0f0',
                  background: notif.isRead ? '#f8f9fa' : '#fff3cd'
                }}
              >
                {renderNotificationBody(notif)}
              </div>
            ))}
            {notifications.length === 0 && (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#999'
                }}
              >
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
