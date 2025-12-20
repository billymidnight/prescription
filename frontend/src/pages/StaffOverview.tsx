import React from 'react';
import './StaffOverview.css';

export default function StaffOverview() {
  return (
    <div className="staff-overview-page">
      <div className="staff-header">
        <h1 className="page-title">Staff Overview</h1>
        <p className="page-subtitle">Manage staff accounts and permissions</p>
      </div>

      <div className="coming-soon-container">
        <div className="coming-soon-icon">👔</div>
        <h2>Staff Management Coming Soon</h2>
        <p>View and manage all staff members, assign roles, and track activity.</p>
      </div>
    </div>
  );
}
