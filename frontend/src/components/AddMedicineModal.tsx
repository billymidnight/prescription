import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './AddMedicineModal.css';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicineAdded: () => void;
  prefilledPatientId?: number;
}

interface Patient {
  patient_id: number;
  name: string;
  sex: string;
  phone_no: string;
  year_of_birth: number;
  hometown: string | null;
}

export default function AddMedicineModal({ isOpen, onClose, onMedicineAdded, prefilledPatientId }: AddMedicineModalProps) {
  const [patientId, setPatientId] = useState(prefilledPatientId?.toString() || '');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    drug_fee: '',
    payment_method: 'Cash',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefilledPatientId) {
      setPatientId(prefilledPatientId.toString());
      fetchPatient(prefilledPatientId);
    }
  }, [prefilledPatientId]);

  const fetchPatient = async (id: number) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_id', id)
        .single();

      if (fetchError) throw fetchError;
      setPatient(data);
      setError('');
    } catch (err: any) {
      setError('Patient not found');
      setPatient(null);
    }
  };

  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value;
    setPatientId(id);
    
    if (id && !isNaN(Number(id))) {
      fetchPatient(Number(id));
    } else {
      setPatient(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!patientId || !patient) {
      setError('Valid Patient ID is required');
      return false;
    }

    if (!formData.drug_fee || parseFloat(formData.drug_fee) < 0) {
      setError('Valid drug fee is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get the next med_id
      const { data: maxIdData } = await supabase
        .from('medicines')
        .select('med_id')
        .order('med_id', { ascending: false })
        .limit(1);

      const nextMedId = maxIdData && maxIdData.length > 0 ? maxIdData[0].med_id + 1 : 1;

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('medicines')
        .insert([
          {
            med_id: nextMedId,
            date: formData.date,
            patient_name: patient!.name,
            drug_fee: parseFloat(formData.drug_fee) || 0,
            payment_method: formData.payment_method,
            patient_id: patient!.patient_id,
          },
        ]);

      if (insertError) throw insertError;

      // Log activity
      await logActivity(`Added Medicine Record (Medicine ID: ${nextMedId}, Patient: ${patient!.name})`);

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        drug_fee: '',
        payment_method: 'Cash',
      });
      if (!prefilledPatientId) {
        setPatientId('');
        setPatient(null);
      }
      onMedicineAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add medicine record');
      console.error('Error adding medicine:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-medicine-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Medicine Visit</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Visit Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Patient ID *</label>
            <input
              type="number"
              value={patientId}
              onChange={handlePatientIdChange}
              placeholder="Enter patient ID"
              disabled={!!prefilledPatientId}
              required
            />
          </div>

          {patient && (
            <div className="patient-info-box">
              <h3>Patient Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name:</span>
                  <span className="value">{patient.name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Gender:</span>
                  <span className="value">{patient.sex === 'M' ? 'Male' : 'Female'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Age:</span>
                  <span className="value">{new Date().getFullYear() - patient.year_of_birth} years</span>
                </div>
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span className="value">{patient.phone_no}</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Drug Fee *</label>
            <input
              type="number"
              name="drug_fee"
              value={formData.drug_fee}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select name="payment_method" value={formData.payment_method} onChange={handleChange} required>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading || !patient}>
              {loading ? 'Adding Record...' : 'Add Medicine Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
