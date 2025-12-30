import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './EditVisitModal.css';

interface EditVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVisitUpdated: () => void;
  visit: Visit;
}

interface Visit {
  visit_id: number;
  date: string;
  fullname: string;
  hometown: string;
  age: number;
  phoneno: string;
  sex: string;
  consultation_type: string;
  consultation_fee: number;
  drug_fee: number;
  extra_procedures: string;
  new_old: string;
  paymentmethod: string;
  referral: string;
  Procedure_Fee: number;
  weight: string;
  blood_pressure: string;
  pulse: string;
}

export default function EditVisitModal({ isOpen, onClose, onVisitUpdated, visit }: EditVisitModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    consultation_type: '',
    consultation_fee: '',
    drug_fee: '',
    Procedure_Fee: '',
    paymentmethod: '',
    extra_procedures: '',
    new_old: '',
    referral: '',
    weight: '',
    blood_pressure: '',
    pulse: '',
  });
  const [customProcedure, setCustomProcedure] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visit) {
      setFormData({
        date: visit.date || '',
        consultation_type: visit.consultation_type || '',
        consultation_fee: visit.consultation_fee?.toString() || '0',
        drug_fee: visit.drug_fee?.toString() || '0',
        Procedure_Fee: visit.Procedure_Fee?.toString() || '0',
        paymentmethod: visit.paymentmethod || 'Cash',
        extra_procedures: visit.extra_procedures || '',
        new_old: visit.new_old || '',
        referral: visit.referral || '',
        weight: visit.weight || '',
        blood_pressure: visit.blood_pressure || '',
        pulse: visit.pulse || '',
      });
      
      // Check if current value is not in dropdown options
      const procedures = visit.extra_procedures || '';
      const procedureOptions = ['', 'Inj MMR', 'Peel', 'Biopsy', 'PRP (Face)', 'PRP (Hair)', 'Excision', 'Electrocautery', 'Inj Tricort', 'Corn Procedure', 'Ear Procedure', 'Microneedling', 'Laser', 'Nail Procedure', 'Peel + Microneedling', 'None'];
      if (procedures && !procedureOptions.includes(procedures)) {
        setCustomProcedure(true);
      }
    }
  }, [visit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('visits')
        .update({
          date: formData.date,
          consultation_type: formData.consultation_type,
          consultation_fee: parseFloat(formData.consultation_fee) || 0,
          drug_fee: parseFloat(formData.drug_fee) || 0,
          Procedure_Fee: parseFloat(formData.Procedure_Fee) || 0,
          paymentmethod: formData.paymentmethod,
          extra_procedures: formData.extra_procedures,
          new_old: formData.new_old,
          referral: formData.referral,
          weight: formData.weight,
          blood_pressure: formData.blood_pressure,
          pulse: formData.pulse,
        })
        .eq('visit_id', visit.visit_id);

      if (updateError) throw updateError;

      // Log activity
      await logActivity(`Edited Visit (Visit ID: ${visit.visit_id})`);

      onVisitUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update visit');
      console.error('Error updating visit:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-visit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Visit #{visit.visit_id}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="patient-info-readonly">
          <div className="info-row">
            <span><strong>Patient:</strong> {visit.fullname}</span>
            <span><strong>Sex:</strong> {visit.sex}</span>
            <span><strong>Age:</strong> {visit.age}</span>
          </div>
          <div className="info-row">
            <span><strong>Phone:</strong> {visit.phoneno}</span>
            <span><strong>Hometown:</strong> {visit.hometown}</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-actions-top">
            <button 
              type="button" 
              className="btn-delete-visit"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete Visit #${visit.visit_id}? This action cannot be undone!`)) {
                  try {
                    const { error: deleteError } = await supabase
                      .from('visits')
                      .delete()
                      .eq('visit_id', visit.visit_id);
                    
                    if (deleteError) throw deleteError;
                    
                    // Log activity
                    await logActivity(`Deleted Visit (Visit ID: ${visit.visit_id})`);
                    
                    onVisitUpdated();
                    onClose();
                  } catch (err: any) {
                    alert('Failed to delete visit: ' + err.message);
                  }
                }
              }}
            >
              🗑️ Delete Visit
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Visit Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Consultation Type *</label>
              <select
                value={formData.consultation_type}
                onChange={(e) => setFormData({ ...formData, consultation_type: e.target.value })}
                required
              >
                <option value="">Select Type</option>
                <option value="Skin">Skin</option>
                <option value="Hair">Hair</option>
                <option value="Nail">Nail</option>
                <option value="Skin + Hair">Skin + Hair</option>
                <option value="Skin + Nail">Skin + Nail</option>
                <option value="Hair + Nail">Hair + Nail</option>
                <option value="Online">Online</option>
                <option value="Home Visit">Home Visit</option>
              </select>
            </div>

            <div className="form-group">
              <label>Consultation Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.consultation_fee}
                onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Drug Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.drug_fee}
                onChange={(e) => setFormData({ ...formData, drug_fee: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Procedure Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.Procedure_Fee}
                onChange={(e) => setFormData({ ...formData, Procedure_Fee: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Payment Method *</label>
              <select
                value={formData.paymentmethod}
                onChange={(e) => setFormData({ ...formData, paymentmethod: e.target.value })}
                required
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="GPay">GPay</option>
                <option value="Cash+Card">Cash+Card</option>
                <option value="Cash+GPay">Cash+GPay</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Extra Procedures</label>
              {!customProcedure ? (
                <>
                  <select
                    value={formData.extra_procedures}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setCustomProcedure(true);
                        setFormData({ ...formData, extra_procedures: '' });
                      } else {
                        setFormData({ ...formData, extra_procedures: val });
                      }
                    }}
                  >
                    <option value="">Select a Procedure</option>
                    <option value="Inj MMR">Inj MMR</option>
                    <option value="Peel">Peel</option>
                    <option value="Biopsy">Biopsy</option>
                    <option value="PRP (Face)">PRP (Face)</option>
                    <option value="PRP (Hair)">PRP (Hair)</option>
                    <option value="Excision">Excision</option>
                    <option value="Electrocautery">Electrocautery</option>
                    <option value="Inj Tricort">Inj Tricort</option>
                    <option value="Corn Procedure">Corn Procedure</option>
                    <option value="Ear Procedure">Ear Procedure</option>
                    <option value="Microneedling">Microneedling</option>
                    <option value="Laser">Laser</option>
                    <option value="Nail Procedure">Nail Procedure</option>
                    <option value="Peel + Microneedling">Peel + Microneedling</option>
                    <option value="Other">Other (Specify)</option>
                    <option value="None">None</option>
                  </select>
                </>
              ) : (
                <>
                  <textarea
                    value={formData.extra_procedures}
                    onChange={(e) => setFormData({ ...formData, extra_procedures: e.target.value })}
                    rows={3}
                    placeholder="Describe any extra procedures..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomProcedure(false);
                      setFormData({ ...formData, extra_procedures: '' });
                    }}
                    style={{ marginTop: '5px', fontSize: '12px', padding: '4px 8px' }}
                  >
                    ← Back to dropdown
                  </button>
                </>
              )}
            </div>

            <div className="form-group full-width">
              <label>Referral</label>
              <input
                type="text"
                value={formData.referral}
                onChange={(e) => setFormData({ ...formData, referral: e.target.value })}
                placeholder="Referral source..."
              />
            </div>

            <div className="form-group">
              <label>Weight</label>
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="e.g. 70 kg"
              />
            </div>

            <div className="form-group">
              <label>Blood Pressure</label>
              <input
                type="text"
                value={formData.blood_pressure}
                onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                placeholder="e.g. 120/80"
              />
            </div>

            <div className="form-group">
              <label>Pulse</label>
              <input
                type="text"
                value={formData.pulse}
                onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                placeholder="e.g. 72 bpm"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
