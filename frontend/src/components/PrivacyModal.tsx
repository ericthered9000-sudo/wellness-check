import './PrivacyModal.css';

interface PrivacyModalProps {
  onClose: () => void;
}

export function PrivacyModal({ onClose }: PrivacyModalProps) {
  return (
    <div className="privacy-overlay" onClick={onClose}>
      <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-header">
          <h2>Privacy Policy</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="privacy-content">
          <p className="last-updated">Last updated: March 2026</p>
          
          <h3>Introduction</h3>
          <p>Wellness Check is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information.</p>
          
          <div className="key-points">
            <p><strong>Key Points:</strong></p>
            <ul>
              <li>✓ Your data stays on your device</li>
              <li>✓ We do not sell or share your personal information</li>
              <li>✓ You can delete all your data at any time</li>
              <li>✓ This app is for personal wellness tracking, not medical purposes</li>
            </ul>
          </div>

          <h3>Information We Collect</h3>
          <h4>Information You Provide</h4>
          <ul>
            <li><strong>Wellness Check-ins</strong> — Track daily wellness scores</li>
            <li><strong>Medications</strong> — Track medication adherence</li>
            <li><strong>Activities</strong> — Log daily activities</li>
            <li><strong>Doctor Visits</strong> — Track appointments</li>
            <li><strong>Photos (optional)</strong> — Attach to check-ins</li>
          </ul>
          <p className="note">All stored locally on your device only.</p>

          <h3>How We Use Your Information</h3>
          <ul>
            <li>Provide the Service — Display your wellness history and trends</li>
            <li>Track Your Progress — Monitor wellness over time</li>
            <li>Send Reminders — Notify about check-ins and medications (if enabled)</li>
            <li>Improve the App — Anonymous usage patterns help us improve</li>
          </ul>

          <p className="highlight"><strong>We do NOT:</strong> Sell your data, share with third parties, use for advertising, or access your data remotely.</p>

          <h3>Data Storage</h3>
          <p><strong>All data is stored locally on your device.</strong></p>
          <p>If you uninstall the app, your data will be deleted. We recommend exporting your data before uninstalling.</p>

          <h3>Your Rights</h3>
          <ul>
            <li><strong>Access</strong> — All your data is visible in the app</li>
            <li><strong>Export</strong> — Settings → Export Data</li>
            <li><strong>Delete</strong> — Settings → Delete All Data</li>
            <li><strong>Correct</strong> — Edit any entry directly</li>
          </ul>

          <h3>Data Security</h3>
          <p>We protect your data through:</p>
          <ul>
            <li>Local Storage Only — Data never leaves your device</li>
            <li>No Account Required — No passwords stored</li>
            <li>Transport Encryption — Secure channels for any exports</li>
          </ul>

          <h3>Third-Party Services</h3>
          <p>Wellness Check currently uses <strong>no third-party analytics, advertising, or tracking services</strong>.</p>

          <h3>Children's Privacy</h3>
          <p>Wellness Check is not intended for children under 13.</p>

          <h3>Medical Disclaimer</h3>
          <p>Wellness Check is not a medical app. Wellness scores are for informational purposes only. Always consult healthcare professionals for medical decisions.</p>

          <h3>Contact</h3>
          <p>Questions? Contact us at: <strong>support@wellnesscheck.app</strong></p>
          
          <p className="tagline">"Sharing wellness, not surveillance."</p>
        </div>
      </div>
    </div>
  );
}
