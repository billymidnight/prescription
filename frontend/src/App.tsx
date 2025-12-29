import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './lib/state/authStore';
import { ProtectedRoute, ApprovedRoute, PublicRoute, RootRedirect } from './router';
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
        <Route path="/prescription" element={<ApprovedRoute><Layout><Prescription /></Layout></ApprovedRoute>} />
        <Route path="/patients-db" element={<ApprovedRoute><Layout><PatientsDB /></Layout></ApprovedRoute>} />
        <Route path="/patient/:patientId" element={<ApprovedRoute><Layout><PatientCard /></Layout></ApprovedRoute>} />
        <Route path="/drug-order" element={<ApprovedRoute><Layout><DrugOrder /></Layout></ApprovedRoute>} />
        <Route path="/tests" element={<ApprovedRoute><Layout><Tests /></Layout></ApprovedRoute>} />
        <Route path="/medicine" element={<ApprovedRoute><Layout><Medicine /></Layout></ApprovedRoute>} />
        <Route path="/financials" element={<ApprovedRoute><Layout><Financials /></Layout></ApprovedRoute>} />
        <Route path="/staff-overview" element={<ApprovedRoute><Layout><StaffOverview /></Layout></ApprovedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
