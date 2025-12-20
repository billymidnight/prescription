import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../lib/state/authStore';
import './SideNav.css';

export default function SideNav() {
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'DOCTOR';

  return (
    <aside className="side-nav">
      <nav className="side-nav-menu">
        <NavLink to="/home" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">🏠</span>
          <span className="nav-text">Home</span>
        </NavLink>
        <NavLink to="/prescription" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📋</span>
          <span className="nav-text">Prescription</span>
        </NavLink>
        <NavLink to="/patients-db" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">👥</span>
          <span className="nav-text">Patients DB</span>
        </NavLink>
        <NavLink to="/drug-order" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">💊</span>
          <span className="nav-text">Drug Order</span>
        </NavLink>
        <NavLink to="/tests" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📊</span>
          <span className="nav-text">All Visits</span>
        </NavLink>
        <NavLink to="/medicine" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">💉</span>
          <span className="nav-text">Old Medicine</span>
        </NavLink>

        {/* DOCTOR-only navigation items */}
        {isDoctor && (
          <>
            <div className="nav-divider"></div>
            <NavLink to="/financials" className={({ isActive }) => isActive ? 'nav-item active doctor-nav' : 'nav-item doctor-nav'}>
              <span className="nav-icon">💰</span>
              <span className="nav-text">Financials</span>
            </NavLink>
            <NavLink to="/staff-overview" className={({ isActive }) => isActive ? 'nav-item active doctor-nav' : 'nav-item doctor-nav'}>
              <span className="nav-icon">👔</span>
              <span className="nav-text">Staff Overview</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
