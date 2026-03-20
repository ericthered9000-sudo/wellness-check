import { useState } from 'react'
import { API_URL } from '../config'
import './ConnectToSenior.css'

interface ConnectToSeniorProps {
  familyMemberId: string
  onClose?: () => void
  onConnected?: () => void
}

export function ConnectToSenior({ familyMemberId, onClose, onConnected }: ConnectToSeniorProps) {
  const [code, setCode] = useState('')
  const [seniorId, setSeniorId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const redeemCode = async () => {
    setLoading(true)
    setError(null)
    
    // Basic validation
    if (!code.trim()) {
      setError('Please enter your invite code')
      setLoading(false)
      return
    }
    
    if (!seniorId.trim()) {
      setError('Please enter Senior ID')
      setLoading(false)
      return
    }
    
    try {
      const res = await fetch(`${API_URL}/api/invites/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Send httpOnly cookie
        body: JSON.stringify({ 
          code: code.trim(),
          familyMemberId,
          seniorId: seniorId.trim()
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect')
      }
      
      setSuccess(true)
      
      // Wait a moment then notify parent component
      setTimeout(() => {
        if (onConnected) onConnected()
        if (onClose) onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="connect-modal" onClick={() => onClose && onClose()}>
      <div className="connect-content" onClick={e => e.stopPropagation()}>
        <h2>Connect to Family Member</h2>
        <p className="connect-description">
          Enter the invite code from your family member to start receiving their wellness updates.
        </p>

        {success ? (
          <div className="connect-success">
            <div className="success-icon">✅</div>
            <h3>Connected!</h3>
            <p>You'll now receive wellness updates from your family member.</p>
          </div>
        ) : (
          <div className="connect-form">
            {error && (
              <div className="connect-error">{error}</div>
            )}

            <div className="form-group">
              <label htmlFor="senior-id">Senior's Account ID</label>
              <input
                id="senior-id"
                type="text"
                value={seniorId}
                onChange={e => setSeniorId(e.target.value)}
                placeholder="e.g., senior-abc123"
                className="connect-input"
                disabled={loading}
              />
              <p className="form-hint">Your family member can find this in their account settings</p>
            </div>

            <div className="form-group">
              <label htmlFor="invite-code">Invite Code</label>
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="HB-8472X9K2"
                className="connect-input code-input"
                disabled={loading}
                maxLength={11}
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}
              />
              <p className="form-hint">8-character code from your family member (e.g., HB-8472X9K2)</p>
            </div>

            <div className="connect-actions">
              {loading ? (
                <button className="btn btn-primary btn-large" disabled>
                  Connecting...
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-secondary btn-large" 
                    onClick={() => onClose && onClose()}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary btn-large" 
                    onClick={redeemCode}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>

            <div className="connect-help">
              <h3>Need help?</h3>
              <ol>
                <li>Ask your family member for their <strong>Account ID</strong></li>
                <li>Ask them to generate an <strong>Invite Code</strong></li>
                <li>Enter both above to connect</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
