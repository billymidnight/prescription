import React from 'react';
import TopNav from './TopNav';
import SideNav from './SideNav';
import GlobalTicker from './GlobalTicker';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <TopNav />
      <GlobalTicker />
      <div className="layout-container">
        <SideNav />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
