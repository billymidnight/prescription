import './styles/index.css';
import './components/Layout/Layout.css';
import './components/Layout/TopNav.css';
import './components/Layout/SideNav.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
