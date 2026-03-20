import { useState } from 'react';

interface LoginProps {
  onLogin?: (email: string, password: string) => void;
  onRegister?: (email: string, password: string, role: 'senior' | 'family') => void;
}

export function Login({ onLogin, onRegister }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'senior' | 'family'>('senior');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (mode === 'login') {
      onLogin && onLogin(email, password);
    } else {
      onRegister && onRegister(email, password, role);
    }
    // State updates will be handled by parent callbacks
    setIsLoading(false);
  };
  
  return (
    <div className="login-content">
      <h1 className="m-0 mb-2 text-2xl text-center">
        Welcome to HomeBeacon
      </h1>
      <p className="m-0 mb-8 text-center" style={{ color: '#64748b' }}>
        Senior wellness monitoring made simple
      </p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="email" style={{ fontWeight: 500 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isLoading}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              fontSize: '16px',
              minHeight: '44px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="password" style={{ fontWeight: 500 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={mode === 'register' ? 'password' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              minLength={12}
              style={{
                padding: '12px 16px',
                paddingRight: mode === 'register' ? '50px' : '16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '16px',
                minHeight: '44px',
                width: '100%'
              }}
            />
            {mode === 'register' && (
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('password') as HTMLInputElement;
                  input.type = input.type === 'password' ? 'text' : 'password';
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6366f1',
                  padding: '4px 8px'
                }}
              >
                Show
              </button>
            )}
          </div>
          {mode === 'register' && (
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              <strong>Requirements:</strong> 12+ characters, uppercase, lowercase, number, special char (!@#$%^&*)
            </div>
          )}
        </div>
        
        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="role" style={{ fontWeight: 500 }}>
              I am a...
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'senior' | 'family')}
              disabled={isLoading}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '16px',
                minHeight: '44px'
              }}
            >
              <option value="senior">Senior (I want to be monitored)</option>
              <option value="family">Family Member (I want to monitor someone)</option>
            </select>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            minHeight: '48px'
          }}
        >
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#64748b' }}>
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => setMode('register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={() => setMode('login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
