import { useState } from 'react'
import { API_URL } from '../config'
import './InviteCode.css'

interface InviteCodeGeneratorProps {
  seniorId: string
  onClose?: () => void
}

export function InviteCodeGenerator({ seniorId, onClose }: InviteCodeGeneratorProps) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const generateCode = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_URL}/api/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniorId })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate code')
      }
      
      setCode(data.code)
      setExpiresAt(data.expiresAt)
    } catch (err: any) {
      setError(err.message)
    }
    
    setLoading(false)
  }

  const copyCode = async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code)
        alert('Code copied to clipboard!')
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = code
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Code copied to clipboard!')
      }
    }
  }

  const formatExpiration = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="invite-modal" onClick={() => onClose && onClose()}>
      <div className="invite-content" onClick={e => e.stopPropagation()}>
        <h2>Invite Family Members</h2>
        <p className="invite-description">
          Share this unique code with family members so they can connect to your wellness updates.
        </p>

        {!code ? (
          <div className="invite-generate">
            {error && (
              <div className="invite-error">{error}</div>
            )}
            
            <button 
              className="btn btn-primary btn-large invite-generate-btn"
              onClick={generateCode}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Invite Code'}
            </button>
          </div>
        ) : (
          <div className="invite-display">
            <div className="invite-code-box">
              <span className="invite-code-label">Your Invite Code:</span>
              <div className="invite-code-display" onClick={copyCode}>
                {code}
              </div>
              <button className="invite-copy-btn" onClick={copyCode}>
                📋 Copy
              </button>
            </div>

            <div className="invite-instructions">
              <h3>How to share:</h3>
              <ol>
                <li>Copy the code above</li>
                <li>Text or call it to family members</li>
                <li>They enter it in their HomeBeacon app</li>
                <li>They'll be connected to your wellness updates</li>
              </ol>
            </div>

            <div className="invite-expiration">
              ⏰ Code expires: {formatExpiration(expiresAt || '2026-03-18')}
            </div>

            <div className="invite-actions">
              <button 
                className="btn btn-secondary" 
                onClick={generateCode}
                disabled={loading}
              >
                Generate New Code
              </button>
              {onClose && (
                <button className="btn btn-primary" onClick={onClose}>
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        <div className="invite-privacy-note">
          🔒 Family members can only see what you choose to share. You can revoke access anytime.
        </div>
      </div>
    </div>
  )
}
