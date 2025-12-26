import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase, { getPatientImageUrl } from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import EditPatientModal from '../components/EditPatientModal';
import AddVisitModal from '../components/AddVisitModal';
import AddMedicineModal from '../components/AddMedicineModal';
import EditPrescriptionModal from '../components/EditPrescriptionModal';
import './PatientCard.css';

interface Patient {
  patient_id: number;
  name: string;
  sex: string;
  phone_no: string;
  year_of_birth: number;
  pic_filename: string | null;
  hometown: string;
}

interface Visit {
  visit_id: number;
  date: string;
  consultation_fee: number;
  drug_fee: number;
  Procedure_Fee: number;
  paymentmethod: string;
  consultation_type: string;
  weight?: string;
  blood_pressure?: string;
  pulse?: string;
}

interface PrescriptionMedicine {
  medicine_id: number;
  medicine_name: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  prescription_id: number;
  visit_id: number;
  symptoms: string;
  findings: string;
  diagnosis: string;
  procedures: string;
  created_at: string;
  medicines: PrescriptionMedicine[];
}

interface Medicine {
  med_id: number;
  date: string;
  drug_fee: number;
  payment_method: string;
  patient_name: string;
}

interface PatientStats {
  totalVisits: number;
  totalDrugFees: number;
  totalConsultationFees: number;
  totalProcedureFees: number;
  paymentMethods: string[];
  recentVisits: Visit[];
  medicineVisits: Medicine[];
}

export default function PatientCard() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [prescriptions, setPrescriptions] = useState<Record<number, Prescription>>({});
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditPrescriptionModalOpen, setIsEditPrescriptionModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<{ prescriptionId: number; visitId: number } | null>(null);
  const [imageVersion, setImageVersion] = useState(Date.now());

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPrescriptionForVisit = async (visitId: number) => {
    if (prescriptions[visitId] && prescriptions[visitId].medicines) {
      // Already loaded with full data
      return;
    }

    try {
      // Fetch prescription
      const { data: prescData, error: prescError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('visit_id', visitId)
        .single();

      if (prescError || !prescData) return;

      // Fetch medicines for this prescription
      const { data: medsData, error: medsError } = await supabase
        .from('prescription_medicines')
        .select('*')
        .eq('prescription_id', prescData.prescription_id);

      if (medsError) throw medsError;

      setPrescriptions(prev => ({
        ...prev,
        [visitId]: {
          ...prescData,
          medicines: medsData || [],
        },
      }));
    } catch (err) {
      console.error('Error fetching prescription:', err);
    }
  };

  const toggleVisitExpansion = (visitId: number) => {
    if (expandedVisit === visitId) {
      setExpandedVisit(null);
    } else {
      setExpandedVisit(visitId);
      fetchPrescriptionForVisit(visitId);
    }
  };

  const handleEditPrescription = (visitId: number) => {
    const prescription = prescriptions[visitId];
    if (prescription) {
      setEditingPrescription({
        prescriptionId: prescription.prescription_id,
        visitId: visitId,
      });
      setIsEditPrescriptionModalOpen(true);
    }
  };

  const handlePrescriptionSaved = () => {
    // Refresh prescription data
    if (editingPrescription) {
      fetchPrescriptionForVisit(editingPrescription.visitId);
    }
    setIsEditPrescriptionModalOpen(false);
    setEditingPrescription(null);
  };

  const fetchPatientData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch all visits for this patient (matching by name)
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .ilike('fullname', patientData.name)
        .order('date', { ascending: false });

      if (visitsError) throw visitsError;

      // Fetch all medicine visits for this patient
      const { data: medicinesData, error: medicinesError } = await supabase
        .from('medicines')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (medicinesError) throw medicinesError;

      // Calculate statistics
      const totalVisits = visitsData.length;
      
      // Total drug fees from BOTH visits table AND medicines table
      const drugFeesFromVisits = visitsData.reduce((sum, v) => sum + (v.drug_fee || 0), 0);
      const drugFeesFromMedicines = (medicinesData || []).reduce((sum, m) => sum + (m.drug_fee || 0), 0);
      const totalDrugFees = drugFeesFromVisits + drugFeesFromMedicines;
      
      const totalConsultationFees = visitsData.reduce((sum, v) => sum + (v.consultation_fee || 0), 0);
      const totalProcedureFees = visitsData.reduce((sum, v) => sum + (v.Procedure_Fee || 0), 0);
      
      // Get unique payment methods
      const paymentMethods = [...new Set(visitsData.map(v => v.paymentmethod).filter(Boolean))];
      
      setStats({
        totalVisits,
        totalDrugFees,
        totalConsultationFees,
        totalProcedureFees,
        paymentMethods,
        recentVisits: visitsData.slice(0, 10), // Last 10 visits
        medicineVisits: medicinesData || [],
      });

      // Check which visits have prescriptions
      const visitIds = visitsData.slice(0, 10).map(v => v.visit_id);
      if (visitIds.length > 0) {
        const { data: prescsData } = await supabase
          .from('prescriptions')
          .select('visit_id, prescription_id')
          .in('visit_id', visitIds);

        if (prescsData) {
          const prescsMap: Record<number, boolean> = {};
          prescsData.forEach(p => {
            prescsMap[p.visit_id] = true;
          });
          // Mark which visits have prescriptions
          const prescsTemp: Record<number, any> = {};
          prescsData.forEach(p => {
            prescsTemp[p.visit_id] = { prescription_id: p.prescription_id, visit_id: p.visit_id };
          });
          setPrescriptions(prescsTemp);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch patient data');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    try {
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('patient_id', patientId);

      if (deleteError) throw deleteError;

      // Log activity
      await logActivity(`Deleted Patient (Patient ID: ${patientId}, Patient Name: ${patient?.name || 'Unknown'})`);

      navigate('/patients-db');
    } catch (err: any) {
      alert('Failed to delete patient: ' + err.message);
    }
  };

  const calculateAge = (yearOfBirth: number) => {
    return new Date().getFullYear() - yearOfBirth;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="patient-card-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-card-page">
        <div className="error-state">
          <p>{error || 'Patient not found'}</p>
          <button className="btn-back" onClick={() => navigate('/patients-db')}>
            ← Back to Patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-card-page">
      <div className="top-actions">
        <button className="btn-back" onClick={() => navigate('/patients-db')}>
          ← Back to Patients List
        </button>
        <div className="action-buttons">
          <button className="btn-add-visit-patient" onClick={() => setIsAddModalOpen(true)}>
            + Add Visit for {patient?.name}
          </button>
          <button className="btn-add-medicine-patient" onClick={() => setIsMedicineModalOpen(true)}>
            💉 Add Medicine Visit for {patient?.name}
          </button>
          <button className="btn-edit" onClick={() => setIsEditModalOpen(true)}>
            ✏️ Edit Patient
          </button>
          <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>
            🗑️ Delete Patient
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{patient?.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone!</p>
            <div className="confirm-actions">
              <button className="btn-cancel-delete" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-confirm-delete" onClick={handleDeletePatient}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {patient && (
        <>
          <EditPatientModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onPatientUpdated={() => {
              fetchPatientData();
              setImageVersion(Date.now());
            }}
            patient={patient}
          />
          <AddVisitModal 
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onVisitAdded={() => {
              fetchPatientData();
            }}
            prefilledPatientId={patient.patient_id}
          />
          <AddMedicineModal 
            isOpen={isMedicineModalOpen}
            onClose={() => setIsMedicineModalOpen(false)}
            onMedicineAdded={() => {
              fetchPatientData();
            }}
            prefilledPatientId={patient.patient_id}
          />
          {isEditPrescriptionModalOpen && editingPrescription && (
            <EditPrescriptionModal
              isOpen={isEditPrescriptionModalOpen}
              onClose={() => {
                setIsEditPrescriptionModalOpen(false);
                setEditingPrescription(null);
              }}
              prescriptionId={editingPrescription.prescriptionId}
              visitId={editingPrescription.visitId}
              onSave={handlePrescriptionSaved}
            />
          )}
        </>
      )}

      <div className="patient-card-container">
        {/* Patient Header */}
        <div className="patient-header">
          <div className="patient-avatar-large">
            {patient.pic_filename ? (
              <img 
                src={`${getPatientImageUrl(patient.pic_filename)}${imageVersion ? `?v=${imageVersion}` : ''}`}
                alt={patient.name}
                className="patient-avatar-img"
                onError={(e) => {
                  const imgElement = e.currentTarget as HTMLImageElement;
                  const nextElement = imgElement.nextElementSibling as HTMLElement;
                  imgElement.style.display = 'none';
                  if (nextElement) nextElement.style.display = 'block';
                }}
              />
            ) : null}
            <span style={{ display: patient.pic_filename ? 'none' : 'block' }}>
              {patient.sex === 'M' ? '👨' : '👩'}
            </span>
          </div>
          <div className="patient-header-info">
            <h1 className="patient-name-large">{patient.name}</h1>
            <div className="patient-meta">
              <span className="meta-item">
                <strong>ID:</strong> {patient.patient_id}
              </span>
              <span className="meta-item">
                <strong>Age:</strong> {calculateAge(patient.year_of_birth)} years
              </span>
              <span className="meta-item">
                <strong>Gender:</strong> {patient.sex === 'M' ? 'Male' : 'Female'}
              </span>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="patient-details-section">
          <h2 className="section-title">Personal Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Phone Number</span>
              <span className="detail-value phone">{patient.phone_no || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Hometown</span>
              <span className="detail-value">{patient.hometown || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Year of Birth</span>
              <span className="detail-value">{patient.year_of_birth}</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <>
            <div className="stats-section">
              <h2 className="section-title">Visit Statistics</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalVisits}</div>
                    <div className="stat-label">Total Visits</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💊</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(stats.totalDrugFees)}</div>
                    <div className="stat-label">Drug Fees Paid</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🩺</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(stats.totalConsultationFees)}</div>
                    <div className="stat-label">Consultation Fees Paid</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">⚕️</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(stats.totalProcedureFees)}</div>
                    <div className="stat-label">Procedure Fees Paid</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="payment-methods-section">
              <h2 className="section-title">Payment Methods Used</h2>
              <div className="payment-tags">
                {stats.paymentMethods.length > 0 ? (
                  stats.paymentMethods.map((method, index) => (
                    <span key={index} className="payment-tag">
                      {method}
                    </span>
                  ))
                ) : (
                  <p className="no-data">No payment methods recorded</p>
                )}
              </div>
            </div>

            {/* Recent Visits */}
            <div className="recent-visits-section">
              <h2 className="section-title">Recent Visits (Last 10)</h2>
              {stats.recentVisits.length > 0 ? (
                <div className="visits-list">
                  {stats.recentVisits.map((visit) => (
                    <div key={visit.visit_id} className="visit-item">
                      <div className="visit-header">
                        <span className="visit-id">#{visit.visit_id}</span>
                        <span className="visit-date">{formatDate(visit.date)}</span>
                        <div className="visit-actions">
                          {prescriptions[visit.visit_id] ? (
                            <>
                              <button 
                                onClick={() => toggleVisitExpansion(visit.visit_id)}
                                className="view-prescription-btn"
                                title="View Prescription"
                              >
                                {expandedVisit === visit.visit_id ? '▼' : '▶'} View Prescription
                              </button>
                              <button
                                onClick={() => handleEditPrescription(visit.visit_id)}
                                className="edit-prescription-btn"
                                title="Edit Prescription"
                              >
                                ✏️
                              </button>
                            </>
                          ) : (
                            <Link 
                              to={`/prescription?visit_id=${visit.visit_id}`}
                              className="prescription-btn"
                              title="Create Prescription"
                            >
                              📋
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="visit-details">
                        <span className={`consultation-type-badge ${visit.consultation_type?.toLowerCase()}`}>
                          {visit.consultation_type || 'N/A'}
                        </span>
                        <span className="visit-fee">
                          Consultation: {formatCurrency(visit.consultation_fee || 0)}
                        </span>
                        <span className="visit-fee">
                          Drug: {formatCurrency(visit.drug_fee || 0)}
                        </span>
                        <span className="visit-fee">
                          Procedure: {formatCurrency(visit.Procedure_Fee || 0)}
                        </span>
                      </div>

                      {expandedVisit === visit.visit_id && prescriptions[visit.visit_id] && (
                        <div className="prescription-details">
                          <div className="prescription-header">
                            <h4>Prescription Details</h4>
                          </div>
                          
                          <div className="prescription-vitals">
                            <div className="vital-item">
                              <strong>Weight:</strong> {visit.weight || 'N/A'}
                            </div>
                            <div className="vital-item">
                              <strong>BP:</strong> {visit.blood_pressure || 'N/A'}
                            </div>
                            <div className="vital-item">
                              <strong>Pulse:</strong> {visit.pulse || 'N/A'}
                            </div>
                          </div>

                          <div className="prescription-section">
                            <strong>Symptoms:</strong>
                            <p className="prescription-text">{prescriptions[visit.visit_id].symptoms || 'N/A'}</p>
                          </div>

                          <div className="prescription-section">
                            <strong>Findings:</strong>
                            <p className="prescription-text">{prescriptions[visit.visit_id].findings || 'N/A'}</p>
                          </div>

                          <div className="prescription-section">
                            <strong>Diagnosis:</strong>
                            <p className="prescription-text">{prescriptions[visit.visit_id].diagnosis || 'N/A'}</p>
                          </div>

                          <div className="prescription-section">
                            <strong>Procedures:</strong>
                            <p className="prescription-text">{prescriptions[visit.visit_id].procedures || 'N/A'}</p>
                          </div>

                          {prescriptions[visit.visit_id].medicines && prescriptions[visit.visit_id].medicines.length > 0 && (
                            <div className="prescription-medicines">
                              <strong>Medicines Prescribed:</strong>
                              <table className="medicines-table">
                                <thead>
                                  <tr>
                                    <th>Medicine Name</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prescriptions[visit.visit_id].medicines.map((med) => (
                                    <tr key={med.medicine_id}>
                                      <td>{med.medicine_name}</td>
                                      <td>{med.frequency}</td>
                                      <td>{med.duration}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No visits recorded</p>
              )}
            </div>

            {/* Medicine Visits */}
            <div className="medicine-visits-section">
              <h2 className="section-title">
                Medicine Visit History 
                {stats.medicineVisits.length > 0 && (
                  <span className="count-badge">{stats.medicineVisits.length}</span>
                )}
              </h2>
              {stats.medicineVisits.length > 0 ? (
                <div className="medicines-table-container">
                  <table className="medicines-table">
                    <thead>
                      <tr>
                        <th>Med ID</th>
                        <th>Date</th>
                        <th>Drug Fee</th>
                        <th>Payment Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.medicineVisits.map((medicine) => (
                        <tr key={medicine.med_id}>
                          <td>#{medicine.med_id}</td>
                          <td>{formatDate(medicine.date)}</td>
                          <td className="fee-cell">{formatCurrency(medicine.drug_fee || 0)}</td>
                          <td>
                            <span className="payment-badge">
                              {medicine.payment_method || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No medicine visits recorded</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
