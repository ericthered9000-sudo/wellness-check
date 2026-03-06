import { useState, useEffect } from 'react';

interface EmergencyButtonProps {
  className?: string;
}

export function EmergencyButton({ className = '' }: EmergencyButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const HOLD_DURATION = 2000; // 2 seconds
  const UPDATE_INTERVAL = 50; // Update progress every 50ms

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (isHolding) {
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        setProgress(newProgress);
      }, UPDATE_INTERVAL);

      timeout = setTimeout(() => {
        setIsHolding(false);
        setProgress(0);
        setShowConfirm(true);
      }, HOLD_DURATION);
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isHolding]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(true);
  };

  const handleEnd = () => {
    setIsHolding(false);
  };

  const handleConfirm = () => {
    window.location.href = 'tel:911';
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <button
        className={`emergency-button ${className}`}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        aria-label="Emergency button - hold for 2 seconds to call 911"
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span className="emergency-icon">🆘</span>
        <span className="emergency-text">EMERGENCY</span>
        <span className="emergency-subtext">
          {isHolding ? 'Keep holding...' : 'Hold 2 sec for 911'}
        </span>
        
        {/* Progress bar */}
        <div
          className="emergency-progress"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '4px',
            width: `${progress}%`,
            backgroundColor: '#fff',
            transition: 'width 0.05s linear',
          }}
        />
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div 
          className="emergency-modal"
          onClick={handleCancel}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div 
            className="emergency-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface, #fff)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div 
              className="emergency-modal-icon"
              style={{
                fontSize: '4rem',
                marginBottom: '1rem',
              }}
            >
              🚨
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#dc2626' }}>
              Call 911?
            </h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
              This will dial emergency services. Only use for actual emergencies.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirm}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                }}
              >
                Call 911
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
