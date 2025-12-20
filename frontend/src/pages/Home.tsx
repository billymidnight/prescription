import React from 'react';
import './Home.css';

export default function Home() {
  return (
    <div className="home-page">
      <div className="welcome-section">
        <h1 className="page-title">Welcome to Dr. Karthika Skin Care</h1>
        <p className="page-subtitle">
          Your trusted partner in dermatological care and prescription management
        </p>
      </div>

      <div className="home-grid">
        <div className="home-card">
          <div className="card-icon">📋</div>
          <h3>Prescription Management</h3>
          <p>Create and manage patient prescriptions with ease</p>
        </div>

        <div className="home-card">
          <div className="card-icon">💊</div>
          <h3>Drug Orders</h3>
          <p>Track and organize medication orders efficiently</p>
        </div>

        <div className="home-card">
          <div className="card-icon">🧪</div>
          <h3>Lab Tests</h3>
          <p>Manage diagnostic tests and results</p>
        </div>

        <div className="home-card placeholder-card">
          <div className="placeholder-image">
            <div className="placeholder-icon">🖼️</div>
            <p>Image Placeholder</p>
          </div>
        </div>

        <div className="home-card placeholder-card">
          <div className="placeholder-image">
            <div className="placeholder-icon">🖼️</div>
            <p>Image Placeholder</p>
          </div>
        </div>

        <div className="home-card placeholder-card">
          <div className="placeholder-image">
            <div className="placeholder-icon">🖼️</div>
            <p>Image Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
