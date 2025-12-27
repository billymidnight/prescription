import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CLINIC_MEDICINES } from '../data/medicines';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './Prescription.css';

interface Medicine {
  id: string;
  name: string;
  medicine_form: string;
  time: string;
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
  pulse: string;
  date: string;
}

interface PrescriptionData {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  age: string;
  blood_pressure: string;
  pulse: string;
  gender: string;
  weight: string;
  symptoms: string;
  findings: string;
  diagnosis: string;
  procedures: string;
  medicines: Medicine[];
}



const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Once at night',
  'Once in a week',
  'Twice a week',
  'Thrice a week',
  'Once a day',
  'Once a month',
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

const MEDICINE_FORM_OPTIONS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Cream',
  'Ointment',
  'Drops',
  'Injection',
  'N/A',
  'CUSTOM',
];

const TIME_OPTIONS = [
  'After Meal (Morning)',
  'After Meal (Evening)',
  'Before Food',
  'After Food',
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
    pulse: '',
    gender: 'Male',
    weight: '',
    symptoms: '',
    findings: '',
    diagnosis: '',
    procedures: '',
    medicines: [],
  });

  const [medicineSearchTerms, setMedicineSearchTerms] = useState<Record<string, string>>({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState<Record<string, boolean>>({});
  const [customMedicineMode, setCustomMedicineMode] = useState<Record<string, boolean>>({});
  const [customFormMode, setCustomFormMode] = useState<Record<string, boolean>>({});
  const [customTimeMode, setCustomTimeMode] = useState<Record<string, boolean>>({});
  const [customFrequencyMode, setCustomFrequencyMode] = useState<Record<string, boolean>>({});
  const [customDurationMode, setCustomDurationMode] = useState<Record<string, boolean>>({});
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [existingPrescriptionId, setExistingPrescriptionId] = useState<number | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Auto-load visit from URL params
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top when component loads
    const visitId = searchParams.get('visit_id');
    console.log('🔍 [Prescription] URL visit_id:', visitId);
    if (visitId) {
      setFormData(prev => ({ ...prev, visit_id: visitId }));
      fetchVisit(visitId);
    }
  }, [searchParams, searchParams.get('visit_id')]);

  const fetchVisit = async (visitId: string) => {
    console.log('📋 [fetchVisit] Starting fetch for visit_id:', visitId);
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
        pulse: '',
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

      console.log('✅ [fetchVisit] Visit data:', visitData);
      if (visitError) {
        console.error('❌ [fetchVisit] Visit error:', visitError);
        throw visitError;
      }

      if (visitData) {
        setVisit(visitData);
        console.log('✅ [fetchVisit] Set visit state');
        
        let patientData = null;
        
        // Try to fetch patient by patient_id first
        if (visitData.patient_id) {
          console.log('🔍 [fetchVisit] Trying patient_id:', visitData.patient_id);
          const { data: patientById, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('patient_id', visitData.patient_id)
            .single();
          
          if (!patientError && patientById) {
            patientData = patientById;
            console.log('✅ [fetchVisit] Found patient by patient_id');
          } else {
            console.warn('⚠️ [fetchVisit] Patient not found by patient_id, trying fullname');
          }
        }
        
        // Fallback: Try to fetch patient by fullname if patient_id failed or is null
        if (!patientData && visitData.fullname) {
          console.log('🔍 [fetchVisit] Trying fullname:', visitData.fullname);
          const { data: patientByName, error: nameError } = await supabase
            .from('patients')
            .select('*')
            .ilike('name', visitData.fullname.trim())
            .limit(1)
            .single();
          
          if (!nameError && patientByName) {
            patientData = patientByName;
            console.log('✅ [fetchVisit] Found patient by fullname');
          } else {
            console.error('❌ [fetchVisit] Patient not found by fullname either:', nameError);
          }
        }

        console.log('✅ [fetchVisit] Final patient data:', patientData);

        if (patientData) {
          setPatient(patientData);
          console.log('✅ [fetchVisit] Set patient state');
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
                medicine_form: med.medicine_form || 'N/A',
                time: med.time || 'After Meal (Morning)',
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
            patient_id: visitData.patient_id?.toString() || patientData.patient_id.toString(),
            patient_name: patientData.name,
            age: age.toString(),
            gender: patientData.sex === 'M' ? 'Male' : 'Female',
            weight: visitData.weight || '',
            blood_pressure: visitData.blood_pressure || '',
            pulse: visitData.pulse || '',
            symptoms: prescData?.symptoms || '',
            findings: prescData?.findings || '',
            diagnosis: prescData?.diagnosis || '',
            procedures: prescData?.procedures || '',
            medicines: loadedMedicines,
          });
        } else {
          console.error('❌ [fetchVisit] No patient data found for visit');
          setPatient(null);
        }
      }
    } catch (err) {
      console.error('❌ [fetchVisit] Error fetching visit/patient:', err);
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
          medicine_form: 'Tablet',
          time: 'After Meal (Morning)',
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
            procedures: formData.procedures || null,
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
            procedures: formData.procedures || null,
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
          medicine_form: med.medicine_form,
          time: med.time,
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
      // Log activity
      await logActivity(`Saved and Printed Prescription For Visit (Visit ID: ${formData.visit_id}, Patient Name: ${formData.patient_name}, ${formData.medicines.length} medicines prescribed)`);
      
      generatePDF();
    }
  };

  const generatePDF = async () => {
    // Fetch and convert logo to base64
    let logoBase64 = '';
    try {
      const logoUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/static_images/logo.jpeg`;
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Failed to load logo:', err);
    }

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
            padding: 15px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E8D5C4;
            position: relative;
          }
          .header-logo {
            position: absolute;
            left: 0;
            top: 0;
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .header h1 {
            color: #D4B5A0;
            font-size: 28px;
            margin-bottom: 3px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 15px;
            margin-bottom: 10px;
            padding: 10px;
            background: #FDFBF7;
            border-radius: 4px;
          }
          .info-field {
            display: flex;
            gap: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #555;
            min-width: 100px;
            font-size: 13px;
          }
          .info-value {
            color: #333;
            font-size: 13px;
          }
          .section {
            margin-bottom: 10px;
          }
          .section-title {
            font-size: 15px;
            font-weight: bold;
            color: #D4B5A0;
            margin-bottom: 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid #E8D5C4;
          }
          .section-content {
            padding: 6px;
            background: #FDFBF7;
            border-radius: 4px;
            line-height: 1.5;
            white-space: pre-wrap;
            font-size: 14px;
          }
          .medicines-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
          }
          .medicines-table th {
            background: #E8D5C4;
            color: #444;
            font-weight: 700;
            padding: 5px;
            text-align: left;
            border-bottom: 1px solid #D4B5A0;
            font-size: 13px;
          }
          .medicines-table td {
            padding: 5px;
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
            margin-top: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: flex-end;
            padding-right: 30px;
          }
          .signature-box {
            text-align: center;
            min-width: 150px;
          }
          .signature-line {
            height: 30px;
            border-bottom: 1px solid #333;
            margin-bottom: 3px;
          }
          .signature-label {
            font-size: 12px;
            color: #666;
            font-weight: 600;
          }
          .footer {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 2px solid #D4B5A0;
            background: linear-gradient(to bottom, transparent, #FDFBF7);
          }
          .doctor-info {
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            border: 1px solid #E8D5C4;
            margin-bottom: 6px;
          }
          .doctor-info h3 {
            font-size: 15px;
            color: #D4B5A0;
            margin-bottom: 2px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }
          .designation {
            font-size: 12px;
            color: #555;
            font-weight: 600;
            margin-bottom: 1px;
          }
          .reg-no {
            font-size: 11px;
            color: #888;
            font-style: italic;
            margin-bottom: 4px;
          }
          .specialities {
            font-size: 11px;
            color: #444;
            padding: 4px 8px;
            background: #F5EBE0;
            border-radius: 4px;
            margin: 4px auto;
            max-width: 90%;
            border-left: 2px solid #C9A88D;
          }
          .specialities strong {
            color: #D4B5A0;
            font-weight: 700;
          }
          .contact-info {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #E8D5C4;
          }
          .address {
            font-size: 11px;
            color: #555;
            margin-bottom: 3px;
            line-height: 1.3;
          }
          .phone {
            font-size: 11px;
            color: #444;
            font-weight: 600;
            letter-spacing: 0.2px;
          }
          .generation-date {
            text-align: center;
            color: #999;
            font-size: 7px;
            font-style: italic;
            margin-top: 4px;
          }
          @media print {
            @page {
              margin: 8mm;
              size: A4;
            }
            body { padding: 0; }
            .footer { page-break-inside: avoid; }
            .signature-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Clinic Logo" class="header-logo" />` : ''}
          <h1>Dr. Karthika Skin Clinic</h1>
          <p>SKIN <span style="color: #d4af37; font-weight: bold; font-size: 1.2em;">✦</span> HAIR <span style="color: #d4af37; font-weight: bold; font-size: 1.2em;">✦</span> NAIL</p>
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
            <span class="info-label">Pulse:</span>
            <span class="info-value">${formData.pulse || 'N/A'}</span>
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

        <div class="section">
          <div class="section-title">Procedures</div>
          <div class="section-content">${formData.procedures || 'No procedures recorded'}</div>
        </div>

        ${formData.medicines.length > 0 ? `
        <div class="section">
          <div class="section-title">Medicines Prescribed</div>
          <table class="medicines-table">
            <thead>
              <tr>
                <th style="width: 8%;">Sr.</th>
                <th style="width: 30%;">Medicine</th>
                <th style="width: 12%;">Form</th>
                <th style="width: 10%;">Time</th>
                <th style="width: 22%;">Frequency</th>
                <th style="width: 18%;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${formData.medicines.map((med: Medicine, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${med.name}</td>
                  <td>${med.medicine_form}</td>
                  <td>${med.time}</td>
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
                📞 +91 95855 33120 &nbsp;&nbsp;|&nbsp;&nbsp; +91 90878 78922
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
                <div><strong>Pulse:</strong> {visit.pulse || 'N/A'}</div>
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
                      {customMedicineMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            value={medicine.name}
                            onChange={(e) => updateMedicine(medicine.id, 'name', e.target.value)}
                            placeholder="Enter custom medicine name..."
                            className="medicine-search-input"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMedicineMode({ ...customMedicineMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'name', '');
                            }}
                            style={{ marginTop: '5px', fontSize: '12px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
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
                      )}
                    </div>

                    <div className="form-group">
                      <label>Form</label>
                      {customFormMode[medicine.id] ? (
                        <div>
                          <input
                            type="text"
                            placeholder="Enter custom form"
                            value={medicine.medicine_form}
                            onChange={(e) => updateMedicine(medicine.id, 'medicine_form', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomFormMode({ ...customFormMode, [medicine.id]: false });
                              updateMedicine(medicine.id, 'medicine_form', 'Tablet');
                            }}
                            style={{ marginTop: '5px', fontSize: '12px' }}
                          >
                            ← Back to dropdown
                          </button>
                        </div>
                      ) : (
                        <select
                          value={medicine.medicine_form}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCustomFormMode({ ...customFormMode, [medicine.id]: true });
                              updateMedicine(medicine.id, 'medicine_form', '');
                            } else {
                              updateMedicine(medicine.id, 'medicine_form', e.target.value);
                            }
                          }}
                        >
                          {MEDICINE_FORM_OPTIONS.map((form) => (
                            <option key={form} value={form}>
                              {form}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
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
                            style={{ marginTop: '5px', fontSize: '12px' }}
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
                          {TIME_OPTIONS.map((timeOpt) => (
                            <option key={timeOpt} value={timeOpt}>
                              {timeOpt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
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
                            style={{ marginTop: '5px', fontSize: '12px' }}
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
                            style={{ marginTop: '5px', fontSize: '12px' }}
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
