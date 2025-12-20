import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';
import './AddPatientModal.css';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdded: () => void;
}

export default function AddPatientModal({ isOpen, onClose, onPatientAdded }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sex: 'M',
    phone_no: '',
    year_of_birth: '',
    hometown: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      let picFilename = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const sanitizedName = formData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const timestamp = Date.now();
        const fileName = `${sanitizedName}_${timestamp}.${fileExt}`;

        // Upload to backend via API
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

      // Check for duplicate name (MUST BE UNIQUE)
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('patient_id')
        .ilike('name', formData.name.trim())
        .limit(1);

      if (existingPatient && existingPatient.length > 0) {
        throw new Error('Patient with this name already exists! Please use a different name or add hometown to make it unique.');
      }

      // Get the next patient_id
      const { data: maxIdData } = await supabase
        .from('patients')
        .select('patient_id')
        .order('patient_id', { ascending: false })
        .limit(1);

      const nextPatientId = maxIdData && maxIdData.length > 0 ? maxIdData[0].patient_id + 1 : 1;

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('patients')
        .insert([
          {
            patient_id: nextPatientId,
            name: formData.name.trim(),
            sex: formData.sex,
            phone_no: formData.phone_no.trim(),
            year_of_birth: parseInt(formData.year_of_birth),
            hometown: formData.hometown.trim() || null,
            pic_filename: picFilename,
          },
        ]);

      if (insertError) throw insertError;

      // Reset form and close modal
      setFormData({
        name: '',
        sex: 'M',
        phone_no: '',
        year_of_birth: '',
        hometown: '',
      });
      setImageFile(null);
      onPatientAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add patient');
      console.error('Error adding patient:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Patient</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

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
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            {imageFile && (
              <div className="file-preview">
                <span>📷 {imageFile.name}</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding Patient...' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
