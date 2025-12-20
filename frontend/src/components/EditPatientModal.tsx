import React, { useState, useEffect } from 'react';
import supabase, { getPatientImageUrl } from '../lib/supabaseClient';
import './EditPatientModal.css';

interface Patient {
  patient_id: number;
  name: string;
  sex: string;
  phone_no: string;
  year_of_birth: number;
  hometown: string | null;
  pic_filename: string | null;
}

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientUpdated: () => void;
  patient: Patient;
}

export default function EditPatientModal({ isOpen, onClose, onPatientUpdated, patient }: EditPatientModalProps) {
  const [formData, setFormData] = useState({
    name: patient.name,
    sex: patient.sex,
    phone_no: patient.phone_no,
    year_of_birth: patient.year_of_birth.toString(),
    hometown: patient.hometown || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      name: patient.name,
      sex: patient.sex,
      phone_no: patient.phone_no,
      year_of_birth: patient.year_of_birth.toString(),
      hometown: patient.hometown || '',
    });
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.phone_no.trim()) {
      setError('Phone number is required');
      return false;
    }

    const yearOfBirth = parseInt(formData.year_of_birth);
    const currentYear = new Date().getFullYear();
    
    if (!formData.year_of_birth || isNaN(yearOfBirth)) {
      setError('Valid year of birth is required');
      return false;
    }

    if (yearOfBirth < 1920 || yearOfBirth > currentYear) {
      setError(`Year of birth must be between 1920 and ${currentYear}`);
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
      let picFilename = patient.pic_filename;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const sanitizedName = formData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const timestamp = Date.now();
        const fileName = `${sanitizedName}_${timestamp}.${fileExt}`;

        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);
        uploadFormData.append('filename', fileName);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/patients/upload-image`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const result = await response.json();
        picFilename = result.filename;
      }

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          name: formData.name.trim(),
          sex: formData.sex,
          phone_no: formData.phone_no.trim(),
          year_of_birth: parseInt(formData.year_of_birth),
          hometown: formData.hometown.trim() || null,
          pic_filename: picFilename,
        })
        .eq('patient_id', patient.patient_id);

      if (updateError) throw updateError;

      setImageFile(null);
      onPatientUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update patient');
      console.error('Error updating patient:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Patient</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Patient ID</label>
            <input
              type="text"
              value={patient.patient_id}
              disabled
              className="disabled-input"
            />
          </div>

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gender *</label>
              <select name="sex" value={formData.sex} onChange={handleChange} required>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label>Year of Birth *</label>
              <input
                type="number"
                name="year_of_birth"
                value={formData.year_of_birth}
                onChange={handleChange}
                placeholder="e.g., 1990"
                min="1920"
                max={new Date().getFullYear()}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone_no"
              value={formData.phone_no}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="form-group">
            <label>Hometown</label>
            <input
              type="text"
              name="hometown"
              value={formData.hometown}
              onChange={handleChange}
              placeholder="Enter hometown"
            />
          </div>

          <div className="form-group">
            <label>Profile Picture</label>
            {patient.pic_filename && (
              <div className="current-image">
                <img 
                  src={getPatientImageUrl(patient.pic_filename) || ''}
                  alt="Current"
                  className="preview-img"
                />
                <span className="current-label">Current Photo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            {imageFile && (
              <div className="file-preview">
                <span>📷 New: {imageFile.name}</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating Patient...' : 'Update Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
