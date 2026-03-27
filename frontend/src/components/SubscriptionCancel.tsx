interface SubscriptionCancelProps {
  onBackToPricing: () => void;
  onBackToHome: () => void;
}

export function SubscriptionCancel({ onBackToPricing, onBackToHome }: SubscriptionCancelProps) {
  return (
    <div className="cancel-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px',
    }}>
      <div className="cancel-card" style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>👋</div>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '10px',
        }}>No worries!</h2>
        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '30px',
        }}>
          Your checkout was canceled. You can still use HomeBeacon with the Free plan, or come back anytime to start your 7-day free trial.
        </p>
        <div style={{
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '30px',
        }}>
          <p style={{
            color: '#92400E',
            fontWeight: '600',
            margin: 0,
          }}>
            💡 Did you know? All paid plans include a 7-day free trial with no credit card required until the trial ends.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button
            onClick={onBackToPricing}
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            View Plans Again
          </button>
          <button
            onClick={onBackToHome}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '2px solid #4F46E5',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
