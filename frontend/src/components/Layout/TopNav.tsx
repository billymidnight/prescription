import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/state/authStore';
import { logActivity } from '../../lib/activityLog';
import './TopNav.css';

export default function TopNav() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Log activity before logout
    await logActivity(`User Logged Out`);
    await logout();
    navigate('/');
  };

  // Show screenname if available, otherwise email (without @domain)
  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const userRole = user?.role || 'STAFF';

  return (
    <nav className="top-nav">
      <div className="top-nav-brand">
        <h1>Dr. Karthika Skin Clinic</h1>
      </div>
      <div className="top-nav-user">
        <div className="user-info">
          <div className="user-avatar">
            {(user?.username || user?.email)?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name-row">
              <span className="user-name">{displayName}</span>
              <span className={`role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
            </div>
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
