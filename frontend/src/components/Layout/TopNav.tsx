import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/state/authStore';
import './TopNav.css';

export default function TopNav() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <nav className="top-nav">
      <div className="top-nav-brand">
        <h1>Dr. Karthika Skin Care</h1>
      </div>
      <div className="top-nav-user">
        <div className="user-info">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-email">{user?.email || ''}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
