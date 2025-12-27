import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './AddVisitModal.css';

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVisitAdded: () => void;
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

export default function AddVisitModal({ isOpen, onClose, onVisitAdded, prefilledPatientId }: AddVisitModalProps) {
  const [patientId, setPatientId] = useState(prefilledPatientId?.toString() || '');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    consultation_type: 'Skin',
    consultation_fee: '',
    drug_fee: '',
    procedure_fee: '',
    extra_procedures: '',
    new_old: 'New',
    paymentmethod: 'Cash',
    referral: '',
    weight: '',
    blood_pressure: '',
    pulse: '',
  });
  const [customProcedure, setCustomProcedure] = useState(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    if (!formData.consultation_fee || parseFloat(formData.consultation_fee) < 0) {
      setError('Valid consultation fee is required');
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
      // Get the next visit_id
      const { data: maxIdData } = await supabase
        .from('visits')
        .select('visit_id')
        .order('visit_id', { ascending: false })
        .limit(1);

      const nextVisitId = maxIdData && maxIdData.length > 0 ? maxIdData[0].visit_id + 1 : 1;

      // Calculate age from year of birth
      const age = new Date().getFullYear() - patient!.year_of_birth;

      // Check if patient has any previous visits
      const { data: previousVisits } = await supabase
        .from('visits')
        .select('visit_id')
        .eq('phoneno', patient!.phone_no)
        .limit(1);

      // Check if patient has any previous medicines records
      const { data: previousMedicines } = await supabase
        .from('medicines')
        .select('medicine_id')
        .eq('phone_no', patient!.phone_no)
        .limit(1);

      // Determine if new or old patient
      const isNewPatient = (!previousVisits || previousVisits.length === 0) && (!previousMedicines || previousMedicines.length === 0);
      const patientStatus = isNewPatient ? 'N' : 'O';

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('visits')
        .insert([
          {
            visit_id: nextVisitId,
            date: formData.date,
            fullname: patient!.name,
            hometown: patient!.hometown || '',
            age: age,
            phoneno: patient!.phone_no,
            sex: patient!.sex,
            consultation_type: formData.consultation_type,
            consultation_fee: parseFloat(formData.consultation_fee) || 0,
            drug_fee: parseFloat(formData.drug_fee) || 0,
            Procedure_Fee: parseFloat(formData.procedure_fee) || 0,
            extra_procedures: formData.extra_procedures || null,
            new_old: patientStatus,
            paymentmethod: formData.paymentmethod,
            referral: formData.referral || null,
            weight: formData.weight || null,
            blood_pressure: formData.blood_pressure || null,
            pulse: formData.pulse || null,
          },
        ]);

      if (insertError) throw insertError;

      // Log activity
      await logActivity(`Added Visit (Visit ID: ${nextVisitId}) For Patient (Patient ID: ${patient!.patient_id}, Patient Name: ${patient!.name})`);

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        consultation_type: 'Skin',
        consultation_fee: '',
        drug_fee: '',
        procedure_fee: '',
        extra_procedures: '',
        new_old: 'New',
        paymentmethod: 'Cash',
        referral: '',
        weight: '',
        blood_pressure: '',
        pulse: '',
      });
      if (!prefilledPatientId) {
        setPatientId('');
        setPatient(null);
      }
      onVisitAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add visit');
      console.error('Error adding visit:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-visit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Visit</h2>
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
                <div className="info-item">
                  <span className="label">Hometown:</span>
                  <span className="value">{patient.hometown || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Weight</label>
              <input
                type="text"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 70 kg"
              />
            </div>

            <div className="form-group">
              <label>Blood Pressure</label>
              <input
                type="text"
                name="blood_pressure"
                value={formData.blood_pressure}
                onChange={handleChange}
                placeholder="e.g. 120/80"
              />
            </div>

            <div className="form-group">
              <label>Pulse</label>
              <input
                type="text"
                name="pulse"
                value={formData.pulse}
                onChange={handleChange}
                placeholder="e.g. 72 bpm"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Consultation Type *</label>
            <select name="consultation_type" value={formData.consultation_type} onChange={handleChange} required>
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

          <div className="form-row">
            <div className="form-group">
              <label>Consultation Fee *</label>
              <input
                type="number"
                name="consultation_fee"
                value={formData.consultation_fee}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Drug Fee</label>
              <input
                type="number"
                name="drug_fee"
                value={formData.drug_fee}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Procedure Fee</label>
              <input
                type="number"
                name="procedure_fee"
                value={formData.procedure_fee}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select name="paymentmethod" value={formData.paymentmethod} onChange={handleChange} required>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="GPay">GPay</option>
              <option value="Cash+Card">Cash+Card</option>
              <option value="Cash+GPay">Cash+GPay</option>
              <option value="Card+GPay">Cash+GPay</option>
            </select>
          </div>

          <div className="form-group">
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
                  placeholder="Describe any additional procedures..."
                  rows={3}
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

          <div className="form-group">
            <label>Referral</label>
            <input
              type="text"
              name="referral"
              value={formData.referral}
              onChange={handleChange}
              placeholder="Referred by..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading || !patient}>
              {loading ? 'Adding Visit...' : 'Add Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
