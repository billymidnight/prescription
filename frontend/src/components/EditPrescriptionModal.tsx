import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { CLINIC_MEDICINES } from '../data/medicines';
import { logActivity } from '../lib/activityLog';
import './EditPrescriptionModal.css';

interface CustomMedicine {
  id: number;
  medicine_name: string;
}

interface Medicine {
  id: string;
  name: string;
  quantity: string;
  time: string;
  frequency: string;
  duration: string;
}

interface EditPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: number;
  visitId: number;
  onSave: () => void;
}

export default function EditPrescriptionModal({
  isOpen,
  onClose,
  prescriptionId,
  visitId,
  onSave,
}: EditPrescriptionModalProps) {
  const [formData, setFormData] = useState({
    symptoms: '',
    diagnosis: '',
    procedures: '',
    medicines: [] as Medicine[],
  });
  const [loading, setLoading] = useState(false);
  const [allMedicines, setAllMedicines] = useState<string[]>(CLINIC_MEDICINES);
  
  // Dynamic dropdown options from database
  const [quantityOptions, setQuantityOptions] = useState<string[]>(['1', '2', 'N/A', 'CUSTOM']);
  const [timeOptions, setTimeOptions] = useState<string[]>(['After Meal (Morning)', 'After Meal (Evening)', 'Before Food', 'After Food', 'CUSTOM']);
  const [frequencyOptions, setFrequencyOptions] = useState<string[]>(['Once daily', 'Twice daily', 'Three times daily', 'Once at night', 'Once in a week', 'Twice a week', 'Thrice a week', 'Once a day', 'Once a month', 'As needed', 'CUSTOM']);
  const [durationOptions, setDurationOptions] = useState<string[]>(['3 days', '5 days', '7 days', '10 days', '2 weeks', '3 weeks', '1 month', '2 months', '3 months', 'CUSTOM']);
  
  const [medicineSearchTerms, setMedicineSearchTerms] = useState<Record<string, string>>({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState<Record<string, boolean>>({});
  const [customMedicineMode, setCustomMedicineMode] = useState<Record<string, boolean>>({});
  const [customQuantityMode, setCustomQuantityMode] = useState<Record<string, boolean>>({});
  const [customTimeMode, setCustomTimeMode] = useState<Record<string, boolean>>({});
  const [customFrequencyMode, setCustomFrequencyMode] = useState<Record<string, boolean>>({});
  const [customDurationMode, setCustomDurationMode] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCustomMedicines();
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    if (isOpen && prescriptionId) {
      loadPrescriptionData();
    }
  }, [isOpen, prescriptionId]);

  const fetchCustomMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_medicines')
        .select('medicine_name')
        .order('medicine_name', { ascending: true });

      if (error) throw error;

      const customMeds = data?.map((m: any) => m.medicine_name) || [];
      const merged = [...CLINIC_MEDICINES, ...customMeds].sort();
      setAllMedicines(merged);
    } catch (error) {
      console.error('Error fetching custom medicines:', error);
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      // Fetch quantities
      const { data: quantitiesData } = await supabase
        .from('custom_quantities')
        .select('quantity_value')
        .order('quantity_value', { ascending: true });
      
      if (quantitiesData && quantitiesData.length > 0) {
        const values = quantitiesData.map(q => q.quantity_value);
        setQuantityOptions([...values, 'CUSTOM']);
      }

      // Fetch times
      const { data: timesData } = await supabase
        .from('custom_times')
        .select('time_value')
        .order('time_value', { ascending: true });
      
      if (timesData && timesData.length > 0) {
        const values = timesData.map(t => t.time_value);
        setTimeOptions([...values, 'CUSTOM']);
      }

      // Fetch frequencies
      const { data: frequenciesData } = await supabase
        .from('custom_frequencies')
        .select('frequency_value')
        .order('frequency_value', { ascending: true });
      
      if (frequenciesData && frequenciesData.length > 0) {
        const values = frequenciesData.map(f => f.frequency_value);
        setFrequencyOptions([...values, 'CUSTOM']);
      }

      // Fetch durations
      const { data: durationsData } = await supabase
        .from('custom_durations')
        .select('duration_value')
        .order('duration_value', { ascending: true });
      
      if (durationsData && durationsData.length > 0) {
        const values = durationsData.map(d => d.duration_value);
        setDurationOptions([...values, 'CUSTOM']);
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };

  const loadPrescriptionData = async () => {
    setLoading(true);
    try {
      // Fetch prescription
      const { data: prescData, error: prescError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('prescription_id', prescriptionId)
        .single();

      if (prescError) throw prescError;

      // Fetch medicines
      const { data: medsData, error: medsError } = await supabase
        .from('prescription_medicines')
        .select('*')
        .eq('prescription_id', prescriptionId);

      if (medsError) throw medsError;

      const loadedMedicines = medsData?.map((med) => ({
        id: med.medicine_id.toString(),
        name: med.medicine_name,
        quantity: med.quantity || '1',
        time: med.time || 'After Meal (Morning)',
        frequency: med.frequency,
        duration: med.duration,
      })) || [];

      setFormData({
        symptoms: prescData.symptoms || '',
        diagnosis: prescData.diagnosis || '',
        procedures: prescData.procedures || '',
        medicines: loadedMedicines,
      });
    } catch (err) {
      console.error('Error loading prescription:', err);
      alert('Failed to load prescription data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addMedicine = () => {
    const newId = Date.now().toString();
    setFormData({
      ...formData,
      medicines: [
        ...formData.medicines,
        { id: newId, name: '', quantity: '1', time: 'After Meal (Morning)', frequency: 'Once daily', duration: '1 month' },
      ],
    });
  };

  const removeMedicine = (id: string) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.filter((med) => med.id !== id),
    });
  };

  const updateMedicine = (id: string, field: keyof Medicine, value: string) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.map((med) =>
        med.id === id ? { ...med, [field]: value } : med
      ),
    });
  };

  const handleMedicineSearch = (id: string, value: string) => {
    setMedicineSearchTerms({ ...medicineSearchTerms, [id]: value });
    updateMedicine(id, 'name', value);
    setShowMedicineDropdown({ ...showMedicineDropdown, [id]: value.length > 0 });
  };

  const selectMedicine = (id: string, medicineName: string) => {
    updateMedicine(id, 'name', medicineName);
    setMedicineSearchTerms({ ...medicineSearchTerms, [id]: medicineName });
    setShowMedicineDropdown({ ...showMedicineDropdown, [id]: false });
  };

  const getFilteredMedicines = (searchTerm: string) => {
    if (!searchTerm) return [];
    return allMedicines.filter((med) =>
      med.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to delete this prescription? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      // First delete all medicines associated with this prescription
      const { error: deleteMedsError } = await supabase
        .from('prescription_medicines')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteMedsError) throw deleteMedsError;

      // Then delete the prescription itself
      const { error: deletePrescError } = await supabase
        .from('prescriptions')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deletePrescError) throw deletePrescError;

      // Log activity
      await logActivity(`Deleted Prescription (Prescription ID: ${prescriptionId})`);

      alert('Prescription deleted successfully!');
      onSave(); // Refresh the parent component
      onClose();
    } catch (err) {
      console.error('Error deleting prescription:', err);
      alert('Failed to delete prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update prescription
      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({
          symptoms: formData.symptoms || null,
          findings: null,
          diagnosis: formData.diagnosis || null,
          procedures: formData.procedures || null,
        })
        .eq('prescription_id', prescriptionId);

      if (updateError) throw updateError;

      // Delete all old medicines
      const { error: deleteError } = await supabase
        .from('prescription_medicines')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteError) throw deleteError;

      // Insert new medicines
      if (formData.medicines.length > 0) {
        const medicinesData = formData.medicines.map((med) => ({
          prescription_id: prescriptionId,
          medicine_name: med.name,
          quantity: med.quantity,
          time: med.time,
          frequency: med.frequency,
          duration: med.duration,
        }));

        const { error: insertError } = await supabase
          .from('prescription_medicines')
          .insert(medicinesData);

        if (insertError) throw insertError;
      }

      // Log activity
      await logActivity(`Edited Prescription (Prescription ID: ${prescriptionId}, ${formData.medicines.length} medicines prescribed)`);

      alert('Prescription updated successfully!');
      onSave();
      onClose();
    } catch (err) {
      console.error('Error updating prescription:', err);
      alert('Failed to update prescription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-prescription-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Prescription</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="form-group">
                <label>Findings and Symptoms</label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  placeholder="Describe findings and symptoms..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Diagnosis</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  placeholder="Enter diagnosis..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Procedures</label>
                <textarea
                  name="procedures"
                  value={formData.procedures}
                  onChange={handleChange}
                  placeholder="Enter procedures performed..."
                  rows={4}
                />
              </div>

              <div className="medicines-section">
                <div className="medicines-header">
                  <h3>Medicines</h3>
                  <button type="button" className="add-medicine-btn" onClick={addMedicine}>
                    ➕ Add Medicine
                  </button>
                </div>

                {formData.medicines.map((medicine) => (
                  <div key={medicine.id} className="medicine-row">
                    <div className="medicine-field medicine-name-field">
                      <label>Medicine Name</label>
                      {customMedicineMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            value={medicine.name}
                            onChange={(e) => updateMedicine(medicine.id, 'name', e.target.value)}
                            placeholder="Enter custom medicine name..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMedicineMode({ ...customMedicineMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'name', '');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to search
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={medicineSearchTerms[medicine.id] ?? medicine.name}
                            onChange={(e) => handleMedicineSearch(medicine.id, e.target.value)}
                            onFocus={() =>
                              setShowMedicineDropdown({
                                ...showMedicineDropdown,
                                [medicine.id]: medicine.name.length > 0,
                              })
                            }
                            placeholder="Search medicine..."
                          />
                          {showMedicineDropdown[medicine.id] && (
                            <div className="medicine-dropdown">
                              <div
                                className="medicine-option"
                                style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd' }}
                                onClick={() => {
                                  setCustomMedicineMode({ ...customMedicineMode, [medicine.id]: true });
                                  updateMedicine(medicine.id, 'name', '');
                                  setShowMedicineDropdown({ ...showMedicineDropdown, [medicine.id]: false });
                                }}
                              >
                                ✏️ CUSTOM - Enter manually
                              </div>
                              {getFilteredMedicines(medicineSearchTerms[medicine.id] || medicine.name).map(
                                (med, idx) => (
                                  <div
                                    key={idx}
                                    className="medicine-option"
                                    onClick={() => selectMedicine(medicine.id, med)}
                                  >
                                    {med}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="medicine-field">
                      <label>Quantity</label>
                      {customQuantityMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom quantity"
                            value={medicine.quantity}
                            onChange={(e) => updateMedicine(medicine.id, 'quantity', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomQuantityMode({ ...customQuantityMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'quantity', '1');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.quantity}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomQuantityMode({ ...customQuantityMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'quantity', '');
                            } else {
                              updateMedicine(medicine.id, 'quantity', e.target.value);
                            }
                          }}
                        >
                          {quantityOptions.map((qty) => (
                            <option key={qty} value={qty}>
                              {qty}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="medicine-field">
                      <label>Time</label>
                      {customTimeMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom time"
                            value={medicine.time}
                            onChange={(e) => updateMedicine(medicine.id, 'time', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTimeMode({ ...customTimeMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'time', 'After Meal (Morning)');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.time}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomTimeMode({ ...customTimeMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'time', '');
                            } else {
                              updateMedicine(medicine.id, 'time', e.target.value);
                            }
                          }}
                        >
                          {timeOptions.map((timeOpt) => (
                            <option key={timeOpt} value={timeOpt}>
                              {timeOpt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="medicine-field">
                      <label>Frequency</label>
                      {customFrequencyMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom frequency"
                            value={medicine.frequency}
                            onChange={(e) => updateMedicine(medicine.id, 'frequency', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomFrequencyMode({ ...customFrequencyMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'frequency', 'Once daily');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.frequency}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomFrequencyMode({ ...customFrequencyMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'frequency', '');
                            } else {
                              updateMedicine(medicine.id, 'frequency', e.target.value);
                            }
                          }}
                        >
                          {frequencyOptions.map((freq) => (
                            <option key={freq} value={freq}>
                              {freq}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="medicine-field">
                      <label>Duration</label>
                      {customDurationMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom duration"
                            value={medicine.duration}
                            onChange={(e) => updateMedicine(medicine.id, 'duration', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDurationMode({ ...customDurationMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'duration', '1 month');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.duration}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomDurationMode({ ...customDurationMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'duration', '');
                            } else {
                              updateMedicine(medicine.id, 'duration', e.target.value);
                            }
                          }}
                        >
                          {durationOptions.map((dur) => (
                            <option key={dur} value={dur}>
                              {dur}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <button
                      type="button"
                      className="remove-medicine-btn"
                      onClick={() => removeMedicine(medicine.id)}
                      title="Remove medicine"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-delete" 
            onClick={handleDelete} 
            disabled={loading}
            style={{ 
              backgroundColor: '#dc3545', 
              color: 'white',
              marginRight: 'auto'
            }}
          >
            {loading ? 'Deleting...' : '🗑️ Delete Prescription'}
          </button>
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
