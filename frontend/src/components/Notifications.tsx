import { useState, useEffect } from 'react';
import './Notifications.css';

interface Notification {
  id: string;
  visit_id: string;
  doctor_name: string;
  specialty: string;
  date_time: string;
  location: string;
  scheduled_for: string;
}

interface NotificationsProps {
  userId: string;
  onMarkAsRead: (notificationId: string) => void;
}

const API_URL = 'http://localhost:3001';

export function Notifications({ userId, onMarkAsRead }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/visits/notifications/${userId}`);
      if (!response.ok) throw new Error('Failed to load notifications');
      const data = await response.json();
      setNotifications(data);
      if (data.length > 0) setVisible(true);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleDismiss = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
    if (onMarkAsRead) {
      onMarkAsRead(notificationId);
    }
    if (notifications.length <= 1) setVisible(false);
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDaysUntilLabel = (days: number) => {
    if (days < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    return `${Math.ceil(days / 7)} weeks`;
  };

  if (!visible) return null;

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <h4>🔔 Upcoming Appointments</h4>
        <button className="close-notifications-btn" onClick={() => setVisible(false)}>
          ✕
        </button>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => {
          const daysUntil = getDaysUntil(notification.date_time);
          return (
            <div key={notification.id} className={`notification-item ${daysUntil <= 1 ? 'urgent' : daysUntil <= 7 ? 'soon' : ''}`}>
              <div className="notification-header">
                <div className="notification-info">
                  <span className="doctor-name">{notification.doctor_name}</span>
                  {notification.specialty && <span className="specialty">{notification.specialty}</span>}
                </div>
                <span className={`days-until ${daysUntil <= 1 ? 'urgent' : daysUntil <= 7 ? 'soon' : ''}`}>
                  {getDaysUntilLabel(daysUntil)}
                </span>
              </div>

              <div className="notification-details">
                <div className="notification-date">
                  📅 {new Date(notification.date_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })} at {new Date(notification.date_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                {notification.location && (
                  <div className="notification-location">📍 {notification.location}</div>
                )}
              </div>

              <button 
                className="dismiss-btn"
                onClick={() => handleDismiss(notification.id)}
              >
                ✕ Dismiss
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
