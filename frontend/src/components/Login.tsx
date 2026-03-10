import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'senior' | 'family'>('senior');
  
  const { login, register, isLoggingIn, isRegistering, loginError, registerError } = useAuth();
  
  const isLoading = isLoggingIn || isRegistering;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'login') {
      login(
        { email, password },
        {
          onSuccess: (data) => {
            if (data.success) {
              toast.success('Welcome back!');
            } else {
              toast.error(data.error || 'Login failed');
            }
          },
          onError: () => {
            toast.error('Login failed. Please check your credentials.');
          },
        }
      );
    } else {
      register(
        { email, password, role },
        {
          onSuccess: (data) => {
            if (data.success) {
              toast.success('Account created! Welcome!');
            } else {
              toast.error(data.error || 'Registration failed');
            }
          },
          onError: () => {
            toast.error('Registration failed. Please try again.');
          },
        }
      );
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
        <h1 className="m-0 mb-2 text-2xl text-center text-slate-800 dark:text-slate-100">
          Welcome to HomeBeacon
        </h1>
        <p className="m-0 mb-8 text-center text-slate-600 dark:text-slate-400">
          Senior wellness monitoring made simple
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-medium text-slate-700 dark:text-slate-300">
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
              className="px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              minLength={8}
              className="px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
            />
          </div>
          
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="role" className="font-medium text-slate-700 dark:text-slate-300">
                I am a...
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'senior' | 'family')}
                disabled={isLoading}
                className="px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
              >
                <option value="senior">Senior (I want to be monitored)</option>
                <option value="family">Family Member (I want to monitor someone)</option>
              </select>
            </div>
          )}
          
          {(loginError || registerError) && (
            <div className="text-red-600 dark:text-red-400 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
              {(loginError || registerError)?.message || 'An error occurred'}
            </div>
          )}
          
          <button 
            type="submit" 
            className="py-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 min-h-11 hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(102,126,234,0.4)] focus-visible:outline-[3px] focus-visible:outline-indigo-500 focus-visible:outline-offset-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => setMode('register')} 
                className="bg-transparent border-none text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold hover:underline focus-visible:outline-[3px] focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
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
                className="bg-transparent border-none text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold hover:underline focus-visible:outline-[3px] focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}