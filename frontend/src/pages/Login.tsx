import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/state/authStore';
import supabase from '../lib/supabaseClient';
import './Login.css';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!data.session) {
        setError('Login successful — please verify your email before signing in (check your inbox).');
        setLoading(false);
        return;
      }

      const token = data.session.access_token;

      // Call backend to ensure custom users row exists
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const resp = await fetch(`${apiBase}/auth/create_user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ email }),
      });

      const respJson = await resp.json();
      console.log('🔐 [Login] Backend /api/auth/create_user response:', respJson);
      console.log('🎉 [Login] Was inaugural login:', respJson?.was_inaugural_login);
      console.log('📧 [Login] EMAIL:', email);
      console.log('👤 [Login] User ID:', data.user.id);

      // Fetch full user data including approved status
      const meResp = await fetch(`${apiBase}/auth/me`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
      });

      let userData: any = null;
      if (meResp.ok) {
        userData = await meResp.json();
        console.log('✅ [Login] User data fetched:', userData);
      }

      // Update auth store
      setAccessToken(token);
      setUser({
        user_id: data.user.id,
        email: data.user.email || '',
        username: userData?.screenname || data.user.email?.split('@')[0],
        role: userData?.role || 'STAFF',
        approved: userData?.approved ?? false,
      });

      // Show welcome message for inaugural login
      if (respJson?.was_inaugural_login) {
        setSuccess('Welcome! Your account has been created.');
      }

      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess('Account created successfully! Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Auto-switch to login after 3 seconds
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Dr. Karthika Skin Clinic</h1>
          <p className="login-subtitle">Dermatology & Skin Care Management</p>
        </div>

        <div className="login-card">
          <h2 className="card-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
                required
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="switch-btn"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
