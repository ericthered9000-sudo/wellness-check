import { useState, useRef } from 'react';
import './DisclaimerModal.css';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isAtBottom);
    }
  };

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        <h2>⚠️ Important Notice</h2>
        <h3>Medical Disclaimer</h3>
        
        <div className="disclaimer-content" ref={scrollRef} onScroll={handleScroll}>
          <h4>HomeBeacon is NOT a Medical App</h4>
          <p>This application is designed for <strong>personal wellness tracking only</strong>. It is NOT:</p>
          <ul>
            <li>✗ A medical device</li>
            <li>✗ A diagnostic tool</li>
            <li>✗ A treatment recommendation</li>
            <li>✗ A substitute for healthcare professionals</li>
            <li>✗ Intended to diagnose, treat, cure, or prevent any disease</li>
          </ul>

          <h4>What HomeBeacon DOES</h4>
          <ul>
            <li>✓ Tracks your daily wellness check-ins</li>
            <li>✓ Monitors medication reminders</li>
            <li>✓ Logs activities and doctor visits</li>
            <li>✓ Calculates wellness scores for personal insight</li>
          </ul>

          <h4>What You SHOULD Do</h4>
          <ul>
            <li><strong>Consult licensed healthcare professionals</strong> for medical concerns</li>
            <li><strong>Seek immediate medical attention</strong> for health emergencies</li>
            <li><strong>Do not rely on this app</strong> for medical decisions</li>
            <li><strong>Share relevant information</strong> with your healthcare provider</li>
          </ul>

          <h4>Wellness Scores Are Informational Only</h4>
          <p>The wellness score calculated by this app is:</p>
          <ul>
            <li>Based solely on information you enter</li>
            <li>Not a medical assessment</li>
            <li>Not a diagnosis</li>
            <li>Not a replacement for professional evaluation</li>
          </ul>

          <h4>No Liability</h4>
          <p>Keystone Apps and the creators of HomeBeacon are NOT responsible for:</p>
          <ul>
            <li>Medical decisions you make based on app data</li>
            <li>Health outcomes related to app usage</li>
            <li>Delay in seeking professional medical care</li>
            <li>Misinterpretation of wellness information</li>
          </ul>

          <h4>Age Restriction</h4>
          <p>This app is intended for adults (18+). If under 18, use only with parental supervision.</p>

          <p className="scroll-hint">
            {hasScrolledToBottom 
              ? '✓ You have read the full disclaimer' 
              : '↓ Please scroll to read the full disclaimer'}
          </p>
        </div>

        <div className="disclaimer-actions">
          <button 
            className="btn btn-accept" 
            onClick={onAccept}
            disabled={!hasScrolledToBottom}
            style={{ flex: 1 }}
          >
            I Agree
          </button>
        </div>

        <p className="disclaimer-footer">
          By tapping "I Agree", you confirm that you have read, understand, and accept this disclaimer.
        </p>
      </div>
    </div>
  );
}

// Hook to check if disclaimer has been accepted
export function useDisclaimerAccepted() {
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem('wellness-check-disclaimer-accepted') === 'true';
  });

  const acceptDisclaimer = () => {
    localStorage.setItem('wellness-check-disclaimer-accepted', 'true');
    setAccepted(true);
  };

  const resetDisclaimer = () => {
    localStorage.removeItem('wellness-check-disclaimer-accepted');
    setAccepted(false);
  };

  return { accepted, acceptDisclaimer, resetDisclaimer };
}
