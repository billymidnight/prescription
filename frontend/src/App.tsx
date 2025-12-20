import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './lib/state/authStore';
import { ProtectedRoute, PublicRoute, RootRedirect } from './router';
import Login from './pages/Login';
import Home from './pages/Home';
import Prescription from './pages/Prescription';
import DrugOrder from './pages/DrugOrder';
import Tests from './pages/Tests';
import Medicine from './pages/Medicine';
import PatientsDB from './pages/PatientsDB';
import PatientCard from './pages/PatientCard';
import Financials from './pages/Financials';
import StaffOverview from './pages/StaffOverview';
import Layout from './components/Layout/Layout';

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/home" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/prescription" element={<ProtectedRoute><Layout><Prescription /></Layout></ProtectedRoute>} />
        <Route path="/patients-db" element={<ProtectedRoute><Layout><PatientsDB /></Layout></ProtectedRoute>} />
        <Route path="/patient/:patientId" element={<ProtectedRoute><Layout><PatientCard /></Layout></ProtectedRoute>} />
        <Route path="/drug-order" element={<ProtectedRoute><Layout><DrugOrder /></Layout></ProtectedRoute>} />
        <Route path="/tests" element={<ProtectedRoute><Layout><Tests /></Layout></ProtectedRoute>} />
        <Route path="/medicine" element={<ProtectedRoute><Layout><Medicine /></Layout></ProtectedRoute>} />
        <Route path="/financials" element={<ProtectedRoute><Layout><Financials /></Layout></ProtectedRoute>} />
        <Route path="/staff-overview" element={<ProtectedRoute><Layout><StaffOverview /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
