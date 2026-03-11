import './TermsModal.css';

interface TermsModalProps {
  onClose: () => void;
}

export function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div className="terms-overlay" onClick={onClose}>
      <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="terms-header">
          <h2>Terms of Service</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="terms-content">
          <p className="last-updated">Last updated: March 2026</p>
          
          <h3>Agreement to Terms</h3>
          <p>By using HomeBeacon, you agree to these Terms of Service. If you do not agree, please do not use the App.</p>

          <h3>Description of Service</h3>
          <p>HomeBeacon is a personal wellness tracking application that allows users to:</p>
          <ul>
            <li>Record daily wellness check-ins</li>
            <li>Track medications and adherence</li>
            <li>Log activities and doctor visits</li>
            <li>View wellness trends over time</li>
          </ul>
          <p className="highlight"><strong>Important:</strong> This is a personal wellness tool, not a medical device or medical advice service.</p>

          <h3>Medical Disclaimer</h3>
          <p><strong>CRITICAL — READ CAREFULLY</strong></p>
          <p>HomeBeacon is <strong>NOT</strong>:</p>
          <ul>
            <li>A medical device</li>
            <li>A medical advice service</li>
            <li>A diagnostic tool</li>
            <li>A substitute for professional healthcare</li>
          </ul>
          <p>You must consult healthcare professionals for medical decisions.</p>

          <h3>User Responsibilities</h3>
          <ul>
            <li><strong>Protect your device</strong> — Your data is stored locally</li>
            <li><strong>Enter accurate information</strong> — Output quality depends on input</li>
            <li><strong>Seek professional medical care</strong> — This app does not replace doctors</li>
            <li><strong>Use the app lawfully</strong> — Do not misuse the app</li>
          </ul>

          <h3>Your Data</h3>
          <p><strong>You own your data.</strong></p>
          <ul>
            <li>All data is stored locally on your device</li>
            <li>We do not access, transmit, or sell your data</li>
            <li>You may export or delete your data at any time</li>
          </ul>

          <h3>Acceptable Use</h3>
          <p><strong>You may NOT:</strong></p>
          <ul>
            <li>Use the app for illegal purposes</li>
            <li>Attempt to reverse-engineer the app</li>
            <li>Use the app to harm yourself or others</li>
            <li>Misrepresent your identity or information</li>
          </ul>

          <h3>Disclaimer of Warranties</h3>
          <p>THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p>

          <h3>Limitation of Liability</h3>
          <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong></p>
          <p>Keystone Apps shall not be liable for any direct, indirect, incidental, or consequential damages, loss of data, or medical outcomes arising from use of the app.</p>

          <h3>Changes to Terms</h3>
          <p>We may modify these Terms at any time. Continued use after changes constitutes acceptance.</p>

          <h3>Governing Law</h3>
          <p>These Terms are governed by the laws of Kentucky, United States.</p>

          <h3>Contact</h3>
          <p>Questions? Contact us at: <strong>support@wellnesscheck.app</strong></p>
          
          <p className="agreement-note">By using HomeBeacon, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        </div>
      </div>
    </div>
  );
}
