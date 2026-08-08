import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
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
  areasite: string;
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
    procedures: '',
    medicines: [] as Medicine[],
  });
  const [loading, setLoading] = useState(false);
  const [allMedicines, setAllMedicines] = useState<string[]>([]);
  
  // Print-only multiselect fields
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [procedureOptions, setProcedureOptions] = useState<string[]>(['CUSTOM']);
  const [customProcedureMode, setCustomProcedureMode] = useState(false);
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  
  // Instructions (print-only, single select)
  const [instructions, setInstructions] = useState('');
  const [instructionOptions, setInstructionOptions] = useState<string[]>(['CUSTOM']);
  const [customInstructionMode, setCustomInstructionMode] = useState(false);
  
  // Diagnosis dropdown (single select)
  const [diagnosisOptions, setDiagnosisOptions] = useState<string[]>([]);
  const [customDiagnosisMode, setCustomDiagnosisMode] = useState(false);

  // Review Date
  const [reviewDate, setReviewDate] = useState('');

  // Investigations — multiselect, stored one row per value in
  // prescription_investigations. Empty on prescriptions written before this existed.
  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([]);
  const [investigationOptions, setInvestigationOptions] = useState<string[]>([]);
  const [customInvestigationInput, setCustomInvestigationInput] = useState('');

  // Diagnosis — multiselect, stored one row per value in prescription_diagnoses.
  // prescriptions.diagnosis is still written on every save as a joined mirror so
  // existing readers keep working and historical values are never orphaned.
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [customDiagnosisInput, setCustomDiagnosisInput] = useState('');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');

  // Dynamic dropdown options from database
  const [quantityOptions, setQuantityOptions] = useState<string[]>(['1', '2', 'N/A', 'CUSTOM']);
  const [timeOptions, setTimeOptions] = useState<string[]>(['After Meal (Morning)', 'After Meal (Evening)', 'Before Food', 'After Food', 'CUSTOM']);
  const [areasiteOptions, setAreasiteOptions] = useState<string[]>(['Once daily', 'Twice daily', 'Three times daily', 'Once at night', 'Once in a week', 'Twice a week', 'Thrice a week', 'Once a day', 'Once a month', 'As needed', 'CUSTOM']);
  const [durationOptions, setDurationOptions] = useState<string[]>(['3 days', '5 days', '7 days', '10 days', '2 weeks', '3 weeks', '1 month', '2 months', '3 months', 'CUSTOM']);
  
  const [medicineSearchTerms, setMedicineSearchTerms] = useState<Record<string, string>>({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState<Record<string, boolean>>({});
  const [customMedicineMode, setCustomMedicineMode] = useState<Record<string, boolean>>({});
  const [customQuantityMode, setCustomQuantityMode] = useState<Record<string, boolean>>({});
  const [customTimeMode, setCustomTimeMode] = useState<Record<string, boolean>>({});
  const [customAreasiteMode, setCustomAreasiteMode] = useState<Record<string, boolean>>({});
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
      setAllMedicines(customMeds.sort());
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

      // Fetch areasites
      const { data: areasitesData } = await supabase
        .from('custom_areasites')
        .select('areasite_value')
        .order('areasite_value', { ascending: true });
      
      if (areasitesData && areasitesData.length > 0) {
        const values = areasitesData.map(a => a.areasite_value);
        setAreasiteOptions([...values, 'CUSTOM']);
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

      // Fetch diagnosis options
      const { data: diagnosisData } = await supabase
        .from('custom_diagnosis')
        .select('diagnosis_value')
        .order('diagnosis_value', { ascending: true });
      
      if (diagnosisData && diagnosisData.length > 0) {
        // Multiselect: no 'CUSTOM' sentinel, one-off values get their own input.
        setDiagnosisOptions(diagnosisData.map(d => d.diagnosis_value));
      }

      // Fetch instructions
      const { data: instructionsData } = await supabase
        .from('custom_instructions')
        .select('instruction_value')
        .order('instruction_value', { ascending: true });
      
      if (instructionsData && instructionsData.length > 0) {
        const values = instructionsData.map(i => i.instruction_value);
        setInstructionOptions([...values, 'CUSTOM']);
      }

      // Fetch investigations. Multiselect with no default — selecting nothing
      // is meaningful, as it keeps the block off the printed prescription.
      const { data: investigationsData } = await supabase
        .from('custom_investigations')
        .select('investigation_value')
        .order('investigation_value', { ascending: true });

      if (investigationsData && investigationsData.length > 0) {
        setInvestigationOptions(investigationsData.map(i => i.investigation_value));
      }

      // Fetch procedures
      const { data: proceduresData } = await supabase
        .from('custom_procedures')
        .select('procedure_value')
        .order('procedure_value', { ascending: true });
      
      if (proceduresData && proceduresData.length > 0) {
        const values = proceduresData.map(p => p.procedure_value);
        setProcedureOptions([...values, 'CUSTOM']);
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
        areasite: med.areasite,
        duration: med.duration,
      })) || [];

      setFormData({
        symptoms: prescData.symptoms || '',
        procedures: prescData.procedures || '',
        medicines: loadedMedicines,
      });
      
      // Set instructions from database if exists
      if (prescData.instructions) {
        setInstructions(prescData.instructions);
      }
      if (prescData.review_date) {
        setReviewDate(prescData.review_date);
      }
      // Load investigations. Assigned unconditionally so reopening the modal
      // for a different prescription clears the previous one's values.
      const { data: invData } = await supabase
        .from('prescription_investigations')
        .select('investigation_value')
        .eq('prescription_id', prescriptionId);

      setSelectedInvestigations((invData || []).map(inv => inv.investigation_value));
      setCustomInvestigationInput('');

      // Load diagnoses. Prescriptions written before the multiselect have no
      // child rows, so fall back to the legacy text column and treat it as ONE
      // diagnosis, exactly as typed — splitting on commas would shred a
      // historical entry into diagnoses that were never made.
      const { data: diagRows } = await supabase
        .from('prescription_diagnoses')
        .select('diagnosis_value')
        .eq('prescription_id', prescriptionId);

      if (diagRows && diagRows.length > 0) {
        setSelectedDiagnoses(diagRows.map(d => d.diagnosis_value));
      } else if (prescData.diagnosis && prescData.diagnosis.trim()) {
        setSelectedDiagnoses([prescData.diagnosis.trim()]);
      } else {
        setSelectedDiagnoses([]);
      }
      setCustomDiagnosisInput('');
      setDiagnosisSearch('');
    } catch (err) {
      console.error('Error loading prescription:', err);
      alert('Failed to load prescription data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        { id: newId, name: '', quantity: '1', time: 'After Meal (Morning)', areasite: 'Once daily', duration: '1 month' },
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

      // Then its investigations (no FK cascade, so clean up explicitly)
      const { error: deleteInvsError } = await supabase
        .from('prescription_investigations')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteInvsError) throw deleteInvsError;

      const { error: deleteDiagsError } = await supabase
        .from('prescription_diagnoses')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteDiagsError) throw deleteDiagsError;

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
          // Joined mirror: keeps prescriptions.diagnosis readable and current
          // for PatientCard, Scorp and existing reports.
          diagnosis: selectedDiagnoses.join(', ') || null,
          procedures: formData.procedures || null,
          instructions: instructions || null,
          review_date: reviewDate || null,
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
          areasite: med.areasite,
          duration: med.duration,
        }));

        const { error: insertError } = await supabase
          .from('prescription_medicines')
          .insert(medicinesData);

        if (insertError) throw insertError;
      }

      // Replace investigations wholesale, mirroring how medicines are handled.
      // The delete runs even when nothing is selected so clearing every
      // investigation actually persists.
      const { error: deleteInvError } = await supabase
        .from('prescription_investigations')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteInvError) throw deleteInvError;

      if (selectedInvestigations.length > 0) {
        const { error: invError } = await supabase
          .from('prescription_investigations')
          .insert(
            selectedInvestigations.map((value) => ({
              prescription_id: prescriptionId,
              investigation_value: value,
            }))
          );

        if (invError) throw invError;
      }

      // Same for diagnoses. prescriptions.diagnosis was already updated above
      // with the joined mirror, so the readable value survives regardless.
      const { error: deleteDiagError } = await supabase
        .from('prescription_diagnoses')
        .delete()
        .eq('prescription_id', prescriptionId);

      if (deleteDiagError) throw deleteDiagError;

      if (selectedDiagnoses.length > 0) {
        const { error: diagError } = await supabase
          .from('prescription_diagnoses')
          .insert(
            selectedDiagnoses.map((value) => ({
              prescription_id: prescriptionId,
              diagnosis_value: value,
            }))
          );

        if (diagError) throw diagError;
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

  // A saved prescription may hold custom investigations that were never added
  // to the managed list. Show them alongside the managed options so they stay
  // visible and can be unticked.
  const investigationChoices = [
    ...investigationOptions,
    ...selectedInvestigations.filter((value) => !investigationOptions.includes(value)),
  ];

  const toggleInvestigation = (value: string) => {
    setSelectedInvestigations((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const addCustomInvestigation = () => {
    const value = customInvestigationInput.trim();
    if (!value) return;
    if (!selectedInvestigations.includes(value)) {
      setSelectedInvestigations((prev) => [...prev, value]);
    }
    setCustomInvestigationInput('');
  };

  // Same idea for diagnoses, and it does double duty here: a historical
  // diagnosis loaded from the legacy text column is almost never an exact match
  // for a managed option, so listing it keeps old prescriptions editable
  // without silently dropping what was originally recorded.
  const diagnosisChoices = [
    ...diagnosisOptions,
    ...selectedDiagnoses.filter((value) => !diagnosisOptions.includes(value)),
  ];

  // Filter is purely a view over diagnosisChoices — ticks live in
  // selectedDiagnoses, so narrowing or clearing the search never changes what is
  // selected, and emptying the box brings the whole list straight back.
  const visibleDiagnosisChoices = diagnosisSearch.trim()
    ? diagnosisChoices.filter((value) =>
        value.toLowerCase().includes(diagnosisSearch.trim().toLowerCase())
      )
    : diagnosisChoices;

  const toggleDiagnosis = (value: string) => {
    setSelectedDiagnoses((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const addCustomDiagnosis = () => {
    const value = customDiagnosisInput.trim();
    if (!value) return;
    if (!selectedDiagnoses.includes(value)) {
      setSelectedDiagnoses((prev) => [...prev, value]);
    }
    setCustomDiagnosisInput('');
  };

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
                <label>History and Examinations</label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  placeholder="Describe history and examinations..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Diagnosis {selectedDiagnoses.length > 0 && `(${selectedDiagnoses.length} selected)`}</label>
                {diagnosisChoices.length === 0 ? (
                  <p className="investigations-empty">
                    No diagnoses configured yet — add them on the Drug Order page, or type one below.
                  </p>
                ) : (
                  <>
                    <div className="picker-search-row">
                      <input
                        type="text"
                        value={diagnosisSearch}
                        onChange={(e) => setDiagnosisSearch(e.target.value)}
                        placeholder={`Search ${diagnosisChoices.length} diagnoses...`}
                      />
                      {diagnosisSearch && (
                        <button type="button" onClick={() => setDiagnosisSearch('')} title="Clear search">
                          ✕
                        </button>
                      )}
                    </div>
                    {visibleDiagnosisChoices.length === 0 ? (
                      <p className="investigations-empty">
                        No diagnosis matches "{diagnosisSearch}". Clear the search, or add it as a one-off below.
                      </p>
                    ) : (
                      <div className="investigations-picker">
                        {visibleDiagnosisChoices.map((diag) => (
                          <label key={diag} className="investigation-option">
                            <input
                              type="checkbox"
                              checked={selectedDiagnoses.includes(diag)}
                              onChange={() => toggleDiagnosis(diag)}
                            />
                            <span>{diag}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <div className="investigation-custom-row">
                  <input
                    type="text"
                    value={customDiagnosisInput}
                    onChange={(e) => setCustomDiagnosisInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomDiagnosis();
                      }
                    }}
                    placeholder="Add a one-off diagnosis not in the list..."
                  />
                  <button
                    type="button"
                    onClick={addCustomDiagnosis}
                    disabled={!customDiagnosisInput.trim()}
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Procedures</label>
                {customProcedureMode ? (
                  <div>
                    <textarea
                      name="procedures"
                      value={formData.procedures}
                      onChange={handleChange}
                      placeholder="Enter custom procedure..."
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomProcedureMode(false)}
                      style={{ marginTop: '5px', fontSize: '12px' }}
                    >
                      ← Back to dropdown
                    </button>
                  </div>
                ) : (
                  <select
                    name="procedures"
                    value={formData.procedures}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setCustomProcedureMode(true);
                      } else {
                        handleChange(e);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {procedureOptions.map((proc) => (
                      <option key={proc} value={proc}>
                        {proc}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Investigations {selectedInvestigations.length > 0 && `(${selectedInvestigations.length} selected)`}</label>
                {investigationChoices.length === 0 ? (
                  <p className="investigations-empty">
                    No investigations configured yet — add them on the Drug Order page, or type one below.
                  </p>
                ) : (
                  <div className="investigations-picker">
                    {investigationChoices.map((inv) => (
                      <label key={inv} className="investigation-option">
                        <input
                          type="checkbox"
                          checked={selectedInvestigations.includes(inv)}
                          onChange={() => toggleInvestigation(inv)}
                        />
                        <span>{inv}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="investigation-custom-row">
                  <input
                    type="text"
                    value={customInvestigationInput}
                    onChange={(e) => setCustomInvestigationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomInvestigation();
                      }
                    }}
                    placeholder="Add a one-off investigation not in the list..."
                  />
                  <button
                    type="button"
                    onClick={addCustomInvestigation}
                    disabled={!customInvestigationInput.trim()}
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Instructions (Print Only)</label>
                {customInstructionMode ? (
                  <div>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Enter custom instructions..."
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomInstructionMode(false)}
                      style={{ marginTop: '5px', fontSize: '12px' }}
                    >
                      ← Back to dropdown
                    </button>
                  </div>
                ) : (
                  <select
                    value={instructions}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setCustomInstructionMode(true);
                      } else {
                        setInstructions(e.target.value);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {instructionOptions.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Review Date</label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
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
                      <label>Area/Site</label>
                      {customAreasiteMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom area/site"
                            value={medicine.areasite}
                            onChange={(e) => updateMedicine(medicine.id, 'areasite', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomAreasiteMode({ ...customAreasiteMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'areasite', 'Once daily');
                            }}
                            style={{ marginTop: '5px', fontSize: '11px', padding: '2px 6px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.areasite}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomAreasiteMode({ ...customAreasiteMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'areasite', '');
                            } else {
                              updateMedicine(medicine.id, 'areasite', e.target.value);
                            }
                          }}
                        >
                          {areasiteOptions.map((areasite) => (
                            <option key={areasite} value={areasite}>
                              {areasite}
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
