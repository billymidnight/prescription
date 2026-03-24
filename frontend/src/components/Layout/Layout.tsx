import React from 'react';
import TopNav from './TopNav';
import SideNav from './SideNav';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <TopNav />
      <div className="layout-container">
        <SideNav />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
