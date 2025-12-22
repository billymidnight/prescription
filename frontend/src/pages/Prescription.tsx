import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CLINIC_MEDICINES } from '../data/medicines';
import supabase from '../lib/supabaseClient';
import './Prescription.css';

interface Medicine {
  id: string;
  name: string;
  frequency: string;
  duration: string;
}

interface Patient {
  patient_id: number;
  name: string;
  sex: string;
  year_of_birth: number;
  phone_no: string;
  hometown: string;
}

interface Visit {
  visit_id: number;
  patient_id: number;
  weight: string;
  blood_pressure: string;
  date: string;
}

interface PrescriptionData {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  age: string;
  blood_pressure: string;
  gender: string;
  weight: string;
  symptoms: string;
  findings: string;
  diagnosis: string;
  medicines: Medicine[];
}



const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Once at night',
  'Twice a week',
  'As needed',
  'CUSTOM',
];

const DURATION_OPTIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '2 weeks',
  '3 weeks',
  '1 month',
  '2 months',
  '3 months',
  'CUSTOM',
];

export default function Prescription() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<PrescriptionData>({
    visit_id: '',
    patient_id: '',
    patient_name: '',
    date: new Date().toISOString().split('T')[0],
    age: '',
    blood_pressure: '',
    gender: 'Male',
    weight: '',
    symptoms: '',
    findings: '',
    diagnosis: '',
    medicines: [],
  });

  const [medicineSearchTerms, setMedicineSearchTerms] = useState<Record<string, string>>({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState<Record<string, boolean>>({});
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [existingPrescriptionId, setExistingPrescriptionId] = useState<number | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Auto-load visit from URL params
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top when component loads
    const visitId = searchParams.get('visit_id');
    if (visitId) {
      setFormData(prev => ({ ...prev, visit_id: visitId }));
      fetchVisit(visitId);
    }
  }, [searchParams]);

  const fetchVisit = async (visitId: string) => {
    if (!visitId || visitId.trim() === '') {
      setVisit(null);
      setPatient(null);
      setFormData({
        ...formData,
        visit_id: '',
        patient_id: '',
        patient_name: '',
        age: '',
        gender: 'Male',
        weight: '',
        blood_pressure: '',
      });
      return;
    }

    setLoadingPatient(true);
    try {
      // First fetch the visit
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .select('*')
        .eq('visit_id', parseInt(visitId))
        .single();

      if (visitError) throw visitError;

      if (visitData) {
        setVisit(visitData);
        
        // Then fetch the patient using patient_id from visit
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', visitData.patient_id)
          .single();

        if (patientError) throw patientError;

        if (patientData) {
          setPatient(patientData);
          const age = new Date().getFullYear() - patientData.year_of_birth;
          
          // Check if prescription already exists for this visit
          const { data: prescData } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('visit_id', parseInt(visitId))
            .single();

          let loadedMedicines: Medicine[] = [];
          
          if (prescData) {
            // Prescription exists - load it for editing
            setExistingPrescriptionId(prescData.prescription_id);
            
            // Load medicines
            const { data: medsData } = await supabase
              .from('prescription_medicines')
              .select('*')
              .eq('prescription_id', prescData.prescription_id);
            
            if (medsData && medsData.length > 0) {
              loadedMedicines = medsData.map(med => ({
                id: med.medicine_id.toString(),
                name: med.medicine_name,
                frequency: med.frequency,
                duration: med.duration,
              }));
            }
          } else {
            setExistingPrescriptionId(null);
          }

          setFormData({
            ...formData,
            visit_id: visitId,
            patient_id: visitData.patient_id.toString(),
            patient_name: patientData.name,
            age: age.toString(),
            gender: patientData.sex === 'M' ? 'Male' : 'Female',
            weight: visitData.weight || '',
            blood_pressure: visitData.blood_pressure || '',
            symptoms: prescData?.symptoms || '',
            findings: prescData?.findings || '',
            diagnosis: prescData?.diagnosis || '',
            medicines: loadedMedicines,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching visit/patient:', err);
      setVisit(null);
      setPatient(null);
    } finally {
      setLoadingPatient(false);
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
        {
          id: newId,
          name: '',
          frequency: 'Once daily',
          duration: '1 month',
        },
      ],
    });
    setMedicineSearchTerms({ ...medicineSearchTerms, [newId]: '' });
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

  const savePrescriptionToDB = async () => {
    if (!formData.visit_id) {
      alert('Please enter a valid Visit ID');
      return false;
    }

    try {
      let prescriptionId = existingPrescriptionId;

      if (existingPrescriptionId) {
        // Update existing prescription
        const { error: updateError } = await supabase
          .from('prescriptions')
          .update({
            symptoms: formData.symptoms || null,
            findings: formData.findings || null,
            diagnosis: formData.diagnosis || null,
          })
          .eq('prescription_id', existingPrescriptionId);

        if (updateError) throw updateError;

        // Delete old medicines
        const { error: deleteError } = await supabase
          .from('prescription_medicines')
          .delete()
          .eq('prescription_id', existingPrescriptionId);

        if (deleteError) throw deleteError;
      } else {
        // Insert new prescription
        const { data: prescriptionData, error: prescError } = await supabase
          .from('prescriptions')
          .insert({
            visit_id: parseInt(formData.visit_id),
            symptoms: formData.symptoms || null,
            findings: formData.findings || null,
            diagnosis: formData.diagnosis || null,
          })
          .select()
          .single();

        if (prescError) throw prescError;
        prescriptionId = prescriptionData.prescription_id;
        setExistingPrescriptionId(prescriptionId);
      }

      // Insert medicines (fresh for both new and updated prescriptions)
      if (formData.medicines.length > 0 && prescriptionId) {
        const medicinesData = formData.medicines.map(med => ({
          prescription_id: prescriptionId,
          medicine_name: med.name,
          frequency: med.frequency,
          duration: med.duration,
        }));

        const { error: medError } = await supabase
          .from('prescription_medicines')
          .insert(medicinesData);

        if (medError) throw medError;
      }

      return true;
    } catch (err) {
      console.error('Error saving prescription:', err);
      alert('Failed to save prescription to database');
      return false;
    }
  };

  const savePrescriptionAndPrint = async () => {
    const saved = await savePrescriptionToDB();
    if (saved) {
      generatePDF();
    }
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const patientName = formData.patient_name.trim() || 'Patient';
    const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date();
    const datetime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `prescription_${sanitizedName}_${datetime}`;

    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #E8D5C4;
          }
          .header h1 {
            color: #D4B5A0;
            font-size: 32px;
            margin-bottom: 8px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px 30px;
            margin-bottom: 30px;
            padding: 20px;
            background: #FDFBF7;
            border-radius: 8px;
          }
          .info-field {
            display: flex;
            gap: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #555;
            min-width: 140px;
          }
          .info-value {
            color: #333;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #D4B5A0;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #E8D5C4;
          }
          .section-content {
            padding: 15px;
            background: #FDFBF7;
            border-radius: 8px;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          .medicines-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          .medicines-table th {
            background: #E8D5C4;
            color: #444;
            font-weight: 700;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #D4B5A0;
            font-size: 14px;
          }
          .medicines-table td {
            padding: 12px;
            border-bottom: 1px solid #E8D5C4;
            font-size: 13px;
            color: #333;
          }
          .medicines-table tbody tr:last-child td {
            border-bottom: none;
          }
          .medicines-table tbody tr:hover {
            background: #FDFBF7;
          }
          .signature-section {
            margin-top: 50px;
            margin-bottom: 30px;
            display: flex;
            justify-content: flex-end;
            padding-right: 50px;
          }
          .signature-box {
            text-align: center;
            min-width: 250px;
          }
          .signature-line {
            height: 60px;
            border-bottom: 2px solid #333;
            margin-bottom: 8px;
          }
          .signature-label {
            font-size: 13px;
            color: #666;
            font-weight: 600;
          }
          .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 3px double #D4B5A0;
            background: linear-gradient(to bottom, transparent, #FDFBF7);
          }
          .doctor-info {
            text-align: center;
            padding: 25px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #E8D5C4;
            margin-bottom: 20px;
          }
          .doctor-info h3 {
            font-size: 22px;
            color: #D4B5A0;
            margin-bottom: 5px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .designation {
            font-size: 15px;
            color: #555;
            font-weight: 600;
            margin-bottom: 3px;
          }
          .reg-no {
            font-size: 13px;
            color: #888;
            font-style: italic;
            margin-bottom: 12px;
          }
          .specialities {
            font-size: 13px;
            color: #444;
            padding: 10px 15px;
            background: #F5EBE0;
            border-radius: 8px;
            margin: 12px auto;
            max-width: 90%;
            border-left: 4px solid #C9A88D;
          }
          .specialities strong {
            color: #D4B5A0;
            font-weight: 700;
          }
          .contact-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #E8D5C4;
          }
          .address {
            font-size: 13px;
            color: #555;
            margin-bottom: 8px;
            line-height: 1.6;
          }
          .phone {
            font-size: 14px;
            color: #444;
            font-weight: 600;
            letter-spacing: 0.3px;
          }
          .generation-date {
            text-align: center;
            color: #999;
            font-size: 11px;
            font-style: italic;
            margin-top: 10px;
          }
          @media print {
            body { padding: 20px; }
            .footer { page-break-inside: avoid; }
            .signature-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dr. Karthika Skin Clinic</h1>
          <p>Dermatology & Skin Care Clinic</p>
        </div>

        <div class="patient-info">
          <div class="info-field">
            <span class="info-label">Patient ID:</span>
            <span class="info-value">${formData.patient_id || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Patient Name:</span>
            <span class="info-value">${formData.patient_name || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Date:</span>
            <span class="info-value">${formData.date || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Age:</span>
            <span class="info-value">${formData.age || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Blood Pressure:</span>
            <span class="info-value">${formData.blood_pressure || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Gender:</span>
            <span class="info-value">${formData.gender || 'N/A'}</span>
          </div>
          <div class="info-field">
            <span class="info-label">Weight:</span>
            <span class="info-value">${formData.weight || 'N/A'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Symptoms</div>
          <div class="section-content">${formData.symptoms || 'No symptoms recorded'}</div>
        </div>

        <div class="section">
          <div class="section-title">Findings</div>
          <div class="section-content">${formData.findings || 'No findings recorded'}</div>
        </div>

        <div class="section">
          <div class="section-title">Diagnosis</div>
          <div class="section-content">${formData.diagnosis || 'No diagnosis recorded'}</div>
        </div>

        ${formData.medicines.length > 0 ? `
        <div class="section">
          <div class="section-title">Medicines Prescribed</div>
          <table class="medicines-table">
            <thead>
              <tr>
                <th style="width: 10%;">Sr. No.</th>
                <th style="width: 45%;">Medicine Name</th>
                <th style="width: 25%;">Frequency</th>
                <th style="width: 20%;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${formData.medicines.map((med: Medicine, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${med.name}</td>
                  <td>${med.frequency}</td>
                  <td>${med.duration}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p class="signature-label">Doctor's Signature</p>
          </div>
        </div>

        <div class="footer">
          <div class="doctor-info">
            <h3>Dr. Karthika M.B., M.D (Derm)</h3>
            <p class="designation">Dermatologist & Dermatosurgeon</p>
            <p class="reg-no">Reg. No. 69402</p>
            <p class="specialities">
              <strong>Specialities:</strong> Hair Transplantation | Cutaneous | LASER Surgery
            </p>
            <div class="contact-info">
              <p class="address">
                #1113 to 1116, MTP Road, Opp. Central Theatre, Coimbatore – 641002
              </p>
              <p class="phone">
                📞 +91 95855 33120 &nbsp;&nbsp;|&nbsp;&nbsp; +91 90878 98922
              </p>
            </div>
          </div>
          <p class="generation-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="prescription-page">
      <div className="page-header">
        <h1 className="page-title">Patient Prescription</h1>
        <button className="btn-primary" onClick={savePrescriptionAndPrint}>
          💾 Save Prescription and Print
        </button>
      </div>

      <div className="prescription-form">
        <div className="form-section">
          <h2 className="section-heading">Patient Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Visit ID</label>
              <input
                type="number"
                name="visit_id"
                value={formData.visit_id}
                onChange={handleChange}
                onBlur={(e) => fetchVisit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchVisit(formData.visit_id);
                  }
                }}
                placeholder="Enter visit ID and press Enter"
              />
              {loadingPatient && <p className="loading-text">Loading visit...</p>}
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
            </div>
          </div>

          {patient && visit && (
            <div className="patient-info-box">
              <h3>Patient Details</h3>
              <div className="patient-details-grid">
                <div><strong>Patient ID:</strong> {patient.patient_id}</div>
                <div><strong>Patient Name:</strong> {patient.name}</div>
                <div><strong>Hometown:</strong> {patient.hometown || 'N/A'}</div>
                <div><strong>Phone No:</strong> {patient.phone_no}</div>
                <div><strong>Sex:</strong> {patient.sex === 'M' ? 'Male' : 'Female'}</div>
                <div><strong>Weight:</strong> {visit.weight || 'N/A'}</div>
                <div><strong>BP:</strong> {visit.blood_pressure || 'N/A'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2 className="section-heading">Medical Details</h2>
          
          <div className="form-group">
            <label>Symptoms</label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="Describe patient symptoms..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Findings</label>
            <textarea
              name="findings"
              value={formData.findings}
              onChange={handleChange}
              placeholder="Enter clinical findings..."
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
        </div>

        <div className="form-section">
          <div className="medicines-header">
            <h2 className="section-heading">Medicines</h2>
            <button type="button" className="btn-add-medicine" onClick={addMedicine}>
              + Add Medicine
            </button>
          </div>

          {formData.medicines.length === 0 ? (
            <div className="no-medicines">
              <p>No medicines added yet. Click "+ Add Medicine" to prescribe medication.</p>
            </div>
          ) : (
            <div className="medicines-list">
              {formData.medicines.map((medicine, index) => (
                <div key={medicine.id} className="medicine-item">
                  <div className="medicine-header-row">
                    <h3 className="medicine-number">Medicine #{index + 1}</h3>
                    <button
                      type="button"
                      className="btn-remove-medicine"
                      onClick={() => removeMedicine(medicine.id)}
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="medicine-fields">
                    <div className="form-group medicine-search-group">
                      <label>Medicine Name</label>
                      <div className="searchable-dropdown">
                        <input
                          type="text"
                          value={medicineSearchTerms[medicine.id] || medicine.name}
                          onChange={(e) => {
                            setMedicineSearchTerms({ ...medicineSearchTerms, [medicine.id]: e.target.value });
                            setShowMedicineDropdown({ ...showMedicineDropdown, [medicine.id]: true });
                          }}
                          onFocus={() => setShowMedicineDropdown({ ...showMedicineDropdown, [medicine.id]: true })}
                          placeholder="Search medicine..."
                          className="medicine-search-input"
                        />
                        {showMedicineDropdown[medicine.id] && (
                          <div className="medicine-dropdown">
                            {CLINIC_MEDICINES
                              .filter(med => 
                                med.toLowerCase().includes((medicineSearchTerms[medicine.id] || medicine.name).toLowerCase())
                              )
                              .slice(0, 10)
                              .map((med) => (
                                <div
                                  key={med}
                                  className="medicine-option"
                                  onClick={() => {
                                    updateMedicine(medicine.id, 'name', med);
                                    setMedicineSearchTerms({ ...medicineSearchTerms, [medicine.id]: med });
                                    setShowMedicineDropdown({ ...showMedicineDropdown, [medicine.id]: false });
                                  }}
                                >
                                  {med}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Frequency</label>
                      {medicine.frequency === 'CUSTOM' ? (
                        <input
                          type="text"
                          placeholder="Enter custom frequency"
                          value={medicine.frequency === 'CUSTOM' ? '' : medicine.frequency}
                          onChange={(e) => updateMedicine(medicine.id, 'frequency', e.target.value)}
                        />
                      ) : (
                        <select
                          value={medicine.frequency}
                          onChange={(e) => updateMedicine(medicine.id, 'frequency', e.target.value)}
                        >
                          {FREQUENCY_OPTIONS.map((freq) => (
                            <option key={freq} value={freq}>
                              {freq}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Duration</label>
                      {medicine.duration === 'CUSTOM' ? (
                        <input
                          type="text"
                          placeholder="Enter custom duration"
                          value={medicine.duration === 'CUSTOM' ? '' : medicine.duration}
                          onChange={(e) => updateMedicine(medicine.id, 'duration', e.target.value)}
                        />
                      ) : (
                        <select
                          value={medicine.duration}
                          onChange={(e) => updateMedicine(medicine.id, 'duration', e.target.value)}
                        >
                          {DURATION_OPTIONS.map((dur) => (
                            <option key={dur} value={dur}>
                              {dur}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
