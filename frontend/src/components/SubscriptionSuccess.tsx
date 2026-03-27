import { useEffect, useState } from 'react';
import { API_URL } from '../config';

interface SubscriptionSuccessProps {
  onBackToHome: () => void;
}

export function SubscriptionSuccess({ onBackToHome }: SubscriptionSuccessProps) {
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifySubscription = async () => {
      // Get session ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/v1/subscriptions/checkout/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        });

        const data = await response.json();

        if (data.success && data.paid) {
          setVerified(true);
        }
      } catch (error) {
        console.error('Verification error:', error);
      } finally {
        setVerifying(false);
      }
    };

    verifySubscription();
  }, []);

  return (
    <div className="success-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px',
    }}>
      <div className="success-card" style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        {verifying ? (
          <>
            <div className="spinner" style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <h2>Verifying your subscription...</h2>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>
              Just a moment while we confirm your payment.
            </p>
          </>
        ) : verified ? (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '10px',
            }}>Welcome to HomeBeacon Premium!</h2>
            <p style={{
              color: '#6b7280',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '30px',
            }}>
              Your 7-day free trial has started. You won't be charged until <strong>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>.
            </p>
            <div style={{
              backgroundColor: '#EEF2FF',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '30px',
            }}>
              <p style={{
                color: '#4F46E5',
                fontWeight: '600',
                margin: 0,
              }}>
                ✨ You now have access to all Premium features!
              </p>
            </div>
            <button
              onClick={onBackToHome}
              style={{
                backgroundColor: '#4F46E5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Start Using HomeBeacon
            </button>
            <p style={{
              fontSize: '14px',
              color: '#9CA3AF',
              marginTop: '20px',
            }}>
              You can manage or cancel your subscription anytime in Settings.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
            <h2>Trial Started!</h2>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>
              Your subscription is being activated. You'll have full access shortly.
            </p>
            <button
              onClick={onBackToHome}
              style={{
                backgroundColor: '#4F46E5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '20px',
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
