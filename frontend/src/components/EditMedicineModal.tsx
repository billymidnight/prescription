import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './EditMedicineModal.css';

interface Medicine {
  med_id: number;
  date: string;
  patient_name: string;
  drug_fee: number;
  payment_method: string;
  patient_id: number | null;
}

interface EditMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicineUpdated: () => void;
  medicine: Medicine;
}

export default function EditMedicineModal({ isOpen, onClose, onMedicineUpdated, medicine }: EditMedicineModalProps) {
  const [formData, setFormData] = useState({
    date: medicine.date,
    patient_name: medicine.patient_name,
    drug_fee: medicine.drug_fee.toString(),
    payment_method: medicine.payment_method,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      date: medicine.date,
      patient_name: medicine.patient_name,
      drug_fee: medicine.drug_fee.toString(),
      payment_method: medicine.payment_method,
    });
  }, [medicine]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.patient_name.trim()) {
      setError('Patient name is required');
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
      // Update in Supabase
      const { error: updateError } = await supabase
        .from('medicines')
        .update({
          date: formData.date,
          patient_name: formData.patient_name.trim(),
          drug_fee: parseFloat(formData.drug_fee),
          payment_method: formData.payment_method,
        })
        .eq('med_id', medicine.med_id);

      if (updateError) throw updateError;

      // Log activity
      await logActivity(`Edited Medicine Record (Medicine ID: ${medicine.med_id})`);

      onMedicineUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update medicine record');
      console.error('Error updating medicine:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-medicine-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Medicine Record</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Medicine ID</label>
            <input
              type="text"
              value={medicine.med_id}
              disabled
              className="disabled-input"
            />
          </div>

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
            <label>Patient Name *</label>
            <input
              type="text"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleChange}
              placeholder="Enter patient name"
              required
            />
          </div>

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
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating Record...' : 'Update Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
