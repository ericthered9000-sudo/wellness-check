import { useState } from 'react';
import { API_URL } from '../config';
import './AccountSettings.css';

interface AccountSettingsProps {
  userId: string;
  email: string;
  onClose: () => void;
}

export function AccountSettings({ userId, email, onClose }: AccountSettingsProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInviteCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniorId: userId })
      });
      
      const data = await res.json();
      if (res.ok) {
        setInviteCode(data.code);
      } else {
        alert('Failed to generate code: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const copyCode = async () => {
    if (inviteCode) {
      try {
        await navigator.clipboard.writeText(inviteCode);
        alert('Code copied!');
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = inviteCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Code copied!');
      }
    }
  };

  return (
    <div className="account-settings-modal" onClick={onClose}>
      <div className="account-settings-content" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Account Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* User Info */}
        <div className="settings-section">
          <h3>Your Account</h3>
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{email}</span>
          </div>
          <div className="info-row">
            <span className="label">User ID:</span>
            <span className="value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{userId}</span>
          </div>
          <p className="section-hint" style={{ marginTop: '12px', fontSize: '13px' }}>
            Share your email address with family members so they can connect to your wellness updates.
          </p>
        </div>

        {/* Invite Code Section */}
        <div className="settings-section">
          <h3>Family Connection Code</h3>
          <p className="section-desc">
            Generate a unique code for family to connect quickly.
          </p>

          {!inviteCode ? (
            <button 
              className="btn btn-primary" 
              onClick={generateInviteCode}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Generating...' : 'Generate Connection Code'}
            </button>
          ) : (
            <div className="invite-code-display">
              <div className="code-box" onClick={copyCode}>
                <span className="code-label">Your Code:</span>
                <div className="code-value">{inviteCode}</div>
              </div>
              <button className="btn btn-secondary" onClick={copyCode} style={{ width: '100%' }}>
                📋 Copy Code
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={generateInviteCode}
                disabled={loading}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Generate New Code
              </button>
            </div>
          )}

          <p className="section-hint" style={{ marginTop: '12px', fontSize: '13px' }}>
            Family members enter this code in their app to connect to your wellness updates.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="settings-section">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => alert('Delete data feature coming soon!')}>
              🗑️ Delete My Data
            </button>
            <button className="action-btn" onClick={() => alert('Privacy settings coming soon!')}>
              🔒 Privacy Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
