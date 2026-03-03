import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useTheme } from './contexts/ThemeContext'
import { ThemePicker, ThemeButton } from './components/ThemePicker'
import { MedicationsTab } from './components/MedicationsTab'
import { WeeklyReport } from './components/WeeklyReport'
import { DoctorVisits } from './components/DoctorVisits'
import { Notifications } from './components/Notifications'
import { BottomNav } from './components/BottomNav'
import { DisclaimerModal, useDisclaimerAccepted } from './components/DisclaimerModal'
import { PrivacyModal } from './components/PrivacyModal'
import { TermsModal } from './components/TermsModal'
import { DeleteDataButton } from './components/DeleteDataButton'
import { OfflineIndicator } from './components/OfflineIndicator'
import './components/OfflineIndicator.css'
import './components/DisclaimerModal.css'
import './components/PrivacyModal.css'
import './components/TermsModal.css'
import './components/DeleteDataButton.css'
import { API_URL } from './config'
import './components/ThemePicker.css'
import './components/MedicationsTab.css'
import './components/WeeklyReport.css'
import './components/DoctorVisits.css'
import './components/Notifications.css'
import './components/BottomNav.css'
import './App.css'


interface User {
  id: string;
  email: string;
  role: 'senior' | 'family';
}

interface ActivityEvent {
  id: string;
  user_id: string;
  type: string;
  timestamp: string;
  value: any;
}

interface WellnessScore {
  seniorId: string;
  date: string;
  score: number;
  factors?: any;
  calculated?: boolean;
}

interface Alert {
  alerts: string[];
}

// Connect to Socket.io
let socket: Socket | null = null;

function connectSocket(userId: string, role: 'senior' | 'family') {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(API_URL);
  
  if (role === 'senior') {
    socket.emit('join:user', userId);
  } else {
    const seniorId = 'senior-demo-1';
    socket.emit('join:family', seniorId);
  }
  
  return socket;
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function App() {
  useTheme(); // Initialize theme context
  const [view, setView] = useState<'home' | 'senior' | 'family'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [wellnessScore, setWellnessScore] = useState<WellnessScore | null>(null);
  const [alerts, setAlerts] = useState<Alert | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'wellness' | 'activity' | 'alerts' | 'report'>('wellness');
  const [navSection, setNavSection] = useState<'home' | 'meds' | 'appointments' | 'report'>('home');
  const [showCheckInRequest, setShowCheckInRequest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
 const [showPrivacy, setShowPrivacy] = useState(false);
 const [showTerms, setShowTerms] = useState(false);
 const { accepted: disclaimerAccepted, acceptDisclaimer, resetDisclaimer } = useDisclaimerAccepted();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const checkInMessageRef = useRef<HTMLTextAreaElement>(null);

  // Request push notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      // Register for push notifications
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined // Would need VAPID key in production
        });
        
        // Send subscription to server
        await fetch(`${API_URL}/api/notifications/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || 'demo-user',
            subscription: subscription.toJSON()
          })
        });
        
        console.log('Push notifications enabled!');
      } catch (error) {
        console.error('Failed to register for push notifications:', error);
      }
    }
  };

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const loginAsSenior = async () => {
    const userId = 'senior-demo-1';
    try {
      await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, email: 'mom@example.com', role: 'senior' })
      });
      setUser({ id: userId, email: 'mom@example.com', role: 'senior' });
      setView('senior');
      connectSocket(userId, 'senior');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const loginAsFamily = async () => {
    const userId = 'family-demo-1';
    try {
      await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, email: 'child@example.com', role: 'family' })
      });
      setUser({ id: userId, email: 'child@example.com', role: 'family' });
      setView('family');
      connectSocket(userId, 'family');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  useEffect(() => {
    if (socket && user) {
      socket.on('wellness:update', (data) => {
        console.log('Wellness update:', data);
      });

      socket.on('wellness:family_update', (data) => {
        console.log('Family update:', data);
        if (data.type === 'activity') {
          if (view === 'senior') {
            fetch(`${API_URL}/api/activity/${user.id}?limit=10`)
              .then(res => res.json())
              .then(setActivities)
              .catch(console.error);
          }
        }
      });

      socket.on('wellness:alert', (data) => {
        console.log('Alert received:', data);
        setAlerts({ alerts: [data.alert] });
      });

      socket.on('wellness:checkin', (data) => {
        console.log('Check-in received:', data);
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [user, view]);

  useEffect(() => {
    if (user && (view === 'senior' || view === 'family')) {
      const seniorId = view === 'senior' ? user.id : 'senior-demo-1';
      
      fetch(`${API_URL}/api/wellness/${seniorId}`).then(r => r.json()).then(wellnessData => {
        setWellnessScore(wellnessData);
      }).catch(console.error);
      
      fetch(`${API_URL}/api/alerts/${seniorId}`)
        .then(r => r.json())
        .then(setAlerts)
        .catch(console.error);
    }
  }, [user, view]);

  useEffect(() => {
    if (user && view === 'senior') {
      fetch(`${API_URL}/api/activity/${user.id}?limit=10`)
        .then(res => res.json())
        .then(setActivities)
        .catch(console.error);
    }
  }, [user, view]);

  const recordActivity = async (type: 'motion' | 'location' | 'screen' | 'charging') => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type, value: { source: 'manual' } })
      });
      const res = await fetch(`${API_URL}/api/activity/${user.id}?limit=10`);
      setActivities(await res.json());
      const scoreRes = await fetch(`${API_URL}/api/wellness/${user.id}`);
      setWellnessScore(await scoreRes.json());
    } catch (error) {
      console.error('Failed to record activity:', error);
    }
    setLoading(false);
  };

  const checkIn = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: 'okay', message: 'I am doing great!' })
      });
      const res = await fetch(`${API_URL}/api/activity/${user.id}?limit=10`);
      setActivities(await res.json());
    } catch (error) {
      console.error('Check-in failed:', error);
    }
    setLoading(false);
  };

  const requestCheckIn = async () => {
    if (!user || view !== 'family') return;
    
    const message = checkInMessageRef.current?.value || 'How are you doing?';
    setLoading(true);
    
    try {
      await fetch(`${API_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'senior-demo-1', 
          status: 'pending', 
          message 
        })
      });
      
      if (checkInMessageRef.current) {
        checkInMessageRef.current.value = '';
      }
      setShowCheckInRequest(false);
      
      fetch(`${API_URL}/api/alerts/senior-demo-1`)
        .then(r => r.json())
        .then(setAlerts)
        .catch(console.error);
    } catch (error) {
      console.error('Request check-in failed:', error);
    }
    setLoading(false);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'neutral';
    return score >= 70 ? 'good' : score >= 40 ? 'moderate' : 'low';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="app">
 <OfflineIndicator />
      <header className="header">
        <h1>🏥 Wellness Check</h1>
        <p className="tagline">Sharing wellness, not surveillance</p>
        <div className="header-buttons">
          {view !== 'home' && notificationPermission !== 'granted' && (
            <button 
              className="notification-btn"
              onClick={requestNotificationPermission}
              title="Enable notifications for appointment reminders"
            >
              🔔 Enable Notifications
            </button>
          )}
          <ThemeButton onClick={() => setShowSettings(true)} />
        </div>
      </header>

 {showSettings && (
 <div className="settings-modal" onClick={() => setShowSettings(false)}>
 <div className="settings-content" onClick={e => e.stopPropagation()}>
 <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Settings</h2>
 <ThemePicker onClose={() => setShowSettings(false)} />
 
 <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '1rem' }}>
 <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Legal</h3>
 <button 
 className="link-btn" 
 onClick={() => { setShowPrivacy(true); setShowSettings(false); }}
 style={{ background: 'none', border: 'none', color: 'var(--primary-color, #007bff)', cursor: 'pointer', padding: '0.5rem 0', textAlign: 'left', width: '100%' }}
 >
 Privacy Policy
 </button>
 <button 
 className="link-btn" 
 onClick={() => { setShowTerms(true); setShowSettings(false); }}
 style={{ background: 'none', border: 'none', color: 'var(--primary-color, #007bff)', cursor: 'pointer', padding: '0.5rem 0', textAlign: 'left', width: '100%' }}
 >
 Terms of Service
 </button>
 <button 
 className="link-btn" 
 onClick={() => { resetDisclaimer(); setShowSettings(false); }}
 style={{ background: 'none', border: 'none', color: 'var(--primary-color, #007bff)', cursor: 'pointer', padding: '0.5rem 0', textAlign: 'left', width: '100%' }}
 >
 View Medical Disclaimer
 </button>
 </div>
 
 <DeleteDataButton onDelete={async () => { localStorage.clear(); window.location.reload(); }} />
 </div>
 </div>
 )}
 
 {!disclaimerAccepted && (
 <DisclaimerModal 
 onAccept={acceptDisclaimer} 
 onExit={() => { if(confirm('Are you sure you want to exit?')) { window.close(); } }} 
 />
 )}
 
 {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
 {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {view === 'home' && (
        <main className="home">
          <div className="intro">
            <h2>How it works</h2>
            <p>Wellness Check helps elderly family members share their wellness status with family — on their terms.</p>
          </div>

          <div className="demo-buttons">
            <button className="btn btn-senior" onClick={loginAsSenior}>
              👵 Demo as Senior
            </button>
            <button className="btn btn-family" onClick={loginAsFamily}>
              👨‍👩‍👧 Demo as Family
            </button>
          </div>

          <div className="features">
            <div className="feature">
              <span className="icon">📊</span>
              <h3>Daily Wellness Score</h3>
              <p>A simple 0-100 score based on activity patterns</p>
            </div>
            <div className="feature">
              <span className="icon">✅</span>
              <h3>One-Tap Check-In</h3>
              <p>Let family know you're okay with a single tap</p>
            </div>
            <div className="feature">
              <span className="icon">🔒</span>
              <h3>Privacy First</h3>
              <p>Seniors control what's shared and who sees it</p>
            </div>
            <div className="feature">
              <span className="icon">⚡</span>
              <h3>Real-time Updates</h3>
              <p>WebSocket-powered instant notifications</p>
            </div>
            <div className="feature">
              <span className="icon">📱</span>
              <h3>PWA Ready</h3>
              <p>Install to home screen for mobile access</p>
            </div>
            <div className="feature">
              <span className="icon">🔔</span>
              <h3>Push Notifications</h3>
              <p>Get alerts when wellness scores change</p>
            </div>
            <div className="feature">
              <span className="icon">💊</span>
              <h3>Medication Reminders</h3>
              <p>Track medications with adherence reporting</p>
            </div>
            <div className="feature">
              <span className="icon">📈</span>
              <h3>Weekly Reports</h3>
              <p>Comprehensive wellness summaries</p>
            </div>
          </div>
        </main>
      )}

      {view === 'senior' && user && (
        <main className="senior-view main-with-nav">
          <Notifications userId={user.id} onMarkAsRead={(id) => console.log('Marked as read:', id)} />

          {navSection === 'home' && (
            <>
              <div className="wellness-card">
                <h2>Your Wellness Score</h2>
                <div className="score-display">
                  <div className={`score ${getScoreColor(wellnessScore?.score)}`}>
                    {wellnessScore?.score || '—'}
                  </div>
                  <p className="score-label">out of 100</p>
                </div>
              </div>

              <div className="checkin-section">
                <h3>Quick Check-In</h3>
                <button className="btn btn-primary btn-large" onClick={checkIn} disabled={loading} aria-label="Check in to let family know you're okay">
                  ✅ I'm Okay!
                </button>
              </div>

              <div className="activity-section">
                <h3>Record Activity (Demo)</h3>
                <p className="hint">In the real app, these would be tracked automatically</p>
                <div className="activity-buttons">
                  <button onClick={() => recordActivity('motion')} disabled={loading} aria-label="Record motion activity">🚶 Motion</button>
                  <button onClick={() => recordActivity('location')} disabled={loading} aria-label="Record location activity">📍 Location</button>
                  <button onClick={() => recordActivity('screen')} disabled={loading} aria-label="Record screen activity">📱 Screen</button>
                  <button onClick={() => recordActivity('charging')} disabled={loading} aria-label="Record charging activity">🔌 Charging</button>
                </div>
              </div>

              <div className="recent-activity">
                <h3>Recent Activity</h3>
                {activities.length === 0 ? (
                  <p className="empty">No activity recorded yet</p>
                ) : (
                  <ul className="activity-list">
                    {activities.map(a => (
                      <li key={a.id}>
                        <span className="type">{a.type}</span>
                        <span className="time">{formatTime(a.timestamp)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {navSection === 'meds' && (
            <MedicationsTab userId={user.id} />
          )}

          {navSection === 'appointments' && (
            <DoctorVisits userId={user.id} />
          )}

          {navSection === 'report' && (
            <div className="report-section">
              <WeeklyReport seniorId={user.id} />
            </div>
          )}

          <BottomNav
            items={[
              { id: 'home', label: 'Home', icon: '🏠', onClick: () => setNavSection('home') },
              { id: 'meds', label: 'Meds', icon: '💊', onClick: () => setNavSection('meds') },
              { id: 'appointments', label: 'Appts', icon: '📅', onClick: () => setNavSection('appointments') },
              { id: 'report', label: 'Report', icon: '📊', onClick: () => setNavSection('report') },
            ]}
            activeId={navSection}
          />

          <button className="back-btn floating-back" onClick={() => { setView('home'); setUser(null); disconnectSocket(); }} aria-label="Go back to home screen">
            ← Back
          </button>

          <p className="privacy-note">🔒 You control what's shared. Family can see your wellness score and check-ins.</p>
        </main>
      )}

      {view === 'family' && user && (
        <main className="family-view">
          <button className="back-btn" onClick={() => { setView('home'); setUser(null); disconnectSocket(); }}>
            ← Back
          </button>

          <div className="family-header">
            <h2>Mom's Wellness</h2>
            <p className="last-update">Last updated: just now</p>
          </div>

          <div className="wellness-card">
            <h3>Wellness Score</h3>
            <div className="score-display">
              <div className={`score ${getScoreColor(wellnessScore?.score)}`}>
                {wellnessScore?.score || '—'}
              </div>
              <p className="score-label">out of 100</p>
            </div>
            {wellnessScore?.factors && (
              <p className="factors">Based on {wellnessScore.factors.activityCount} activities today</p>
            )}
          </div>

          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'wellness' ? 'active' : ''}`} onClick={() => setActiveTab('wellness')}>
              Wellness
            </button>
            <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
              Activity
            </button>
            <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
              Alerts
            </button>
            <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
              Weekly Report
            </button>
          </div>

          {activeTab === 'activity' && (
            <div className="activity-section">
              <h3>Activity Timeline</h3>
              {activities.length === 0 ? (
                <p className="empty">No activity recorded yet</p>
              ) : (
                <ul className="activity-list timeline">
                  {activities.map(a => (
                    <li key={a.id} className="timeline-item">
                      <span className="type">{a.type}</span>
                      <span className="time">{formatTime(a.timestamp)}</span>
                      {a.value && a.value.message && <span className="message">{a.value.message}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="alerts-section">
              <h3>Alerts</h3>
              {alerts?.alerts && alerts.alerts.length > 0 ? (
                <div className="alerts-list">
                  {alerts.alerts.map((alert, idx) => (
                    <div key={idx} className="alert-item">
                      <span className="alert-icon">⚠️</span>
                      <span className="alert-text">{alert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="status-ok">
                  <span className="status-icon">✅</span>
                  <span className="status-text">No alerts</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="report-section">
              <WeeklyReport seniorId="senior-demo-1" />
            </div>
          )}

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button className="btn btn-secondary" onClick={() => setShowCheckInRequest(true)}>
              📩 Request Check-In
            </button>
          </div>

          {showCheckInRequest && (
            <div className="modal">
              <div className="modal-content">
                <h3>Request Check-In</h3>
                <textarea
                  ref={checkInMessageRef}
                  placeholder="Ask how they're doing..."
                  rows={3}
                />
                <div className="modal-buttons">
                  <button className="btn btn-secondary" onClick={() => setShowCheckInRequest(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={requestCheckIn} disabled={loading}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="connection-note">
            <p>💝 You're connected to Mom's wellness updates. She chooses what to share.</p>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
