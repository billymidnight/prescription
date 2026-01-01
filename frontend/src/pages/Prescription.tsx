import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CLINIC_MEDICINES } from '../data/medicines';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './Prescription.css';

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
  diagnosis: string;
  procedures: string;
  medicines: Medicine[];
}

export default function Prescription() {
  const [searchParams] = useSearchParams();
  const [allMedicines, setAllMedicines] = useState<string[]>(CLINIC_MEDICINES);
  
  // Dynamic dropdown options from database
  const [quantityOptions, setQuantityOptions] = useState<string[]>(['1', '2', 'N/A', 'CUSTOM']);
  const [timeOptions, setTimeOptions] = useState<string[]>(['After Meal (Morning)', 'After Meal (Evening)', 'Before Food', 'After Food', 'CUSTOM']);
  const [areasiteOptions, setAreasiteOptions] = useState<string[]>(['Once daily', 'Twice daily', 'Three times daily', 'Once at night', 'Once in a week', 'Twice a week', 'Thrice a week', 'Once a day', 'Once a month', 'As needed', 'CUSTOM']);
  const [durationOptions, setDurationOptions] = useState<string[]>(['3 days', '5 days', '7 days', '10 days', '2 weeks', '3 weeks', '1 month', '2 months', '3 months', 'CUSTOM']);
  
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
    diagnosis: '',
    procedures: '',
    medicines: [],
  });

  // Print-only field (not saved to DB)
  const [instructions, setInstructions] = useState('');
  const [instructionOptions, setInstructionOptions] = useState<string[]>(['Apply Shampoo', 'CUSTOM']);
  const [customInstructionMode, setCustomInstructionMode] = useState(false);

  const [medicineSearchTerms, setMedicineSearchTerms] = useState<Record<string, string>>({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState<Record<string, boolean>>({});
  const [customMedicineMode, setCustomMedicineMode] = useState<Record<string, boolean>>({});
  const [customQuantityMode, setCustomQuantityMode] = useState<Record<string, boolean>>({});
  const [customTimeMode, setCustomTimeMode] = useState<Record<string, boolean>>({});
  const [customAreasiteMode, setCustomAreasiteMode] = useState<Record<string, boolean>>({});
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

  // Fetch custom medicines from DB and merge with hardcoded ones
  useEffect(() => {
    const fetchCustomMedicines = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_medicines')
          .select('medicine_name')
          .order('medicine_name', { ascending: true });

        if (error) {
          console.error('Error fetching custom medicines:', error);
          return;
        }

        if (data && data.length > 0) {
          const customNames = data.map(m => m.medicine_name);
          // Merge hardcoded with custom, remove duplicates, and sort
          const merged = [...new Set([...CLINIC_MEDICINES, ...customNames])].sort();
          setAllMedicines(merged);
        }
      } catch (error) {
        console.error('Error in fetchCustomMedicines:', error);
      }
    };

    fetchCustomMedicines();
  }, []);

  // Fetch dropdown options from database
  useEffect(() => {
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
          const values = areasitesData.map(f => f.areasite_value);
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

        // Fetch instructions
        const { data: instructionsData } = await supabase
          .from('custom_instructions')
          .select('instruction_value')
          .order('instruction_value', { ascending: true });
        
        if (instructionsData && instructionsData.length > 0) {
          const values = instructionsData.map(i => i.instruction_value);
          setInstructionOptions([...values, 'CUSTOM']);
        }
      } catch (error) {
        console.error('Error fetching dropdown options:', error);
      }
    };

    fetchDropdownOptions();
  }, []);

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
                quantity: med.quantity || '1',
                time: med.time || 'After Meal (Morning)',
                areasite: med.areasite,
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
          quantity: '1',
          time: 'After Meal (Morning)',
          areasite: 'Once daily',
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

  const getFilteredMedicines = (searchTerm: string) => {
    if (!searchTerm) return [];
    return allMedicines.filter((med) =>
      med.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const selectMedicine = (id: string, medicineName: string) => {
    updateMedicine(id, 'name', medicineName);
    setShowMedicineDropdown({ ...showMedicineDropdown, [id]: false });
    setMedicineSearchTerms({ ...medicineSearchTerms, [id]: medicineName });
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
            findings: null,
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
            findings: null,
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
          quantity: med.quantity,
          time: med.time,
          areasite: med.areasite,
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
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const logoUrl = `${apiBase.replace('/api', '')}/static_images/logo.jpeg`;
      const response = await fetch(logoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      console.log('Logo loaded successfully');
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
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          html, body {
            width: 210mm;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: white;
            color: #222;
          }
          
          .page {
            width: 210mm;
            height: 297mm;
            padding: 0;
            position: relative;
            page-break-after: always;
            overflow: hidden;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          .content-wrapper {
            padding: 8px 15px 0 15px;
            padding-bottom: 150px;
            height: calc(297mm - 150px);
            overflow: hidden;
          }
          
          .header {
            text-align: center;
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 3px solid #D4B5A0;
            position: relative;
          }
          
          .header-logo {
            position: absolute;
            left: 0;
            top: 0;
            width: 90px;
            height: 90px;
            object-fit: contain;
          }
          
          .header h1 {
            color: #C9A88D;
            font-size: 38px;
            margin-bottom: 2px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          
          .header p {
            color: #555;
            font-size: 20px;
            font-weight: 500;
          }
          
          .patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 18px;
            margin-bottom: 6px;
            padding: 6px 10px;
            background: #FDFBF7;
            border-radius: 4px;
            border: 1.5px solid #E8D5C4;
          }
          
          .info-field {
            display: flex;
            gap: 8px;
            align-items: baseline;
          }
          
          .info-label {
            font-weight: 700;
            color: #444;
            min-width: 115px;
            font-size: 18px;
          }
          
          .info-value {
            color: #222;
            font-size: 18px;
            font-weight: 500;
          }
          
          .section {
            margin-bottom: 6px;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #C9A88D;
            margin-bottom: 2px;
            padding-bottom: 2px;
            border-bottom: 2px solid #E8D5C4;
            letter-spacing: 0.3px;
          }
          
          .section-content {
            padding: 5px 8px;
            background: #FDFBF7;
            border-radius: 3px;
            line-height: 1.3;
            white-space: pre-wrap;
            font-size: 14px;
            border: 1px solid #E8D5C4;
          }
          
          .medicines-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            border: 1.5px solid #D4B5A0;
          }
          
          .medicines-table th {
            background: #fff;
            color: #000;
            font-weight: 900;
            padding: 6px 4px;
            text-align: left;
            border: 2px solid #000;
            border-bottom: 3px solid #000;
            font-size: 17px;
            letter-spacing: 0.4px;
          }
          
          .medicines-table td {
            padding: 3px;
            border-bottom: 1px solid #E8D5C4;
            font-size: 16px;
            color: #222;
            font-weight: 500;
            line-height: 1.15;
          }
          
          /* Dynamic font sizing based on medicine count */
          .medicines-table.med-count-6-10 th,
          .medicines-table.med-count-6-10 td {
            font-size: 13px;
            padding: 2px 3px;
            line-height: 1.1;
          }
          
          .medicines-table.med-count-11-15 th,
          .medicines-table.med-count-11-15 td {
            font-size: 11px;
            padding: 2px;
            line-height: 1.05;
          }
          
          .medicines-table.med-count-16-plus th,
          .medicines-table.med-count-16-plus td {
            font-size: 10px;
            padding: 1px 2px;
            line-height: 1.05;
          }
          
          .medicines-table tbody tr:last-child td {
            border-bottom: none;
          }
          
          .medicines-table tbody tr:nth-child(even) {
            background: #FDFBF7;
          }
          
          .signature-section {
            margin-top: 8px;
            margin-bottom: 4px;
            display: flex;
            justify-content: flex-end;
            padding-right: 35px;
          }
          
          .signature-box {
            text-align: center;
            min-width: 170px;
          }
          
          .signature-line {
            height: 30px;
            border-bottom: 1.5px solid #333;
            margin-bottom: 3px;
          }
          
          .signature-label {
            font-size: 17px;
            color: #555;
            font-weight: 700;
          }
          
          .footer {
            margin-top: auto;
            padding: 6px 15px 4px 15px;
            border-top: 3px solid #C9A88D;
            background: linear-gradient(to bottom, #fff, #FDFBF7);
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
          }
          
          .doctor-info {
            text-align: center;
            padding: 4px 6px;
            background: white;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            border: 1.5px solid #D4B5A0;
            margin-bottom: 2px;
          }
          
          .doctor-info h3 {
            font-size: 17px;
            color: #C9A88D;
            margin-bottom: 1px;
            font-weight: 700;
            letter-spacing: 0.2px;
          }
          
          .designation {
            font-size: 14px;
            color: #444;
            font-weight: 600;
            margin-bottom: 1px;
          }
          
          .reg-no {
            font-size: 12px;
            color: #777;
            font-style: italic;
            margin-bottom: 2px;
          }
          
          .specialities {
            font-size: 12px;
            color: #333;
            padding: 2px 6px;
            background: #F5EBE0;
            border-radius: 3px;
            margin: 2px auto;
            max-width: 90%;
            border-left: 3px solid #C9A88D;
            line-height: 1.2;
          }
          
          .specialities strong {
            color: #C9A88D;
            font-weight: 700;
          }
          
          .contact-info {
            margin-top: 3px;
            padding-top: 3px;
            border-top: 1.5px solid #E8D5C4;
          }
          
          .address {
            font-size: 12px;
            color: #444;
            margin-bottom: 2px;
            line-height: 1.2;
            font-weight: 500;
          }
          
          .phone {
            font-size: 12px;
            color: #333;
            font-weight: 700;
            letter-spacing: 0.1px;
          }
          
          .consultation-times {
            font-size: 11px;
            color: #222;
            margin-top: 2px;
            line-height: 1.3;
            font-weight: 600;
          }
          
          .consultation-times strong {
            color: #C9A88D;
            font-weight: 700;
          }
          
          .generation-date {
            text-align: center;
            color: #888;
            font-size: 9px;
            font-style: italic;
            margin-top: 2px;
          }
          
          @media print {
            html, body {
              width: 210mm;
            }
            
            .page {
              page-break-after: always;
            }
            
            .page:last-child {
              page-break-after: auto;
            }
            
            .footer {
              page-break-inside: avoid;
              position: absolute;
              bottom: 0;
            }
            
            .signature-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <!-- PAGE 1 -->
        <div class="page">
          <div class="content-wrapper">
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
              <span class="info-value">${formData.gender === 'Male' ? 'Mr. ' : 'Ms. '}${formData.patient_name || 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Date:</span>
              <span class="info-value">${formData.date || 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Age:</span>
              <span class="info-value">${formData.age ? formData.age + ' Years' : 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Blood Pressure:</span>
              <span class="info-value">${formData.blood_pressure ? formData.blood_pressure + ' mmHg' : 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Pulse:</span>
              <span class="info-value">${formData.pulse ? formData.pulse + ' bpm' : 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Gender:</span>
              <span class="info-value">${formData.gender || 'N/A'}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Weight:</span>
              <span class="info-value">${formData.weight ? formData.weight + ' Kg' : 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Findings and Symptoms</div>
            <div class="section-content">${formData.symptoms || 'No findings and symptoms recorded'}</div>
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
            <table class="medicines-table ${
              formData.medicines.length >= 16 ? 'med-count-16-plus' :
              formData.medicines.length >= 11 ? 'med-count-11-15' :
              formData.medicines.length >= 6 ? 'med-count-6-10' : ''
            }">
              <thead>
                <tr>
                  <th style="width: 8%;">Sr.</th>
                  <th style="width: 32%;">Medicine</th>
                  <th style="width: 10%;">Qty</th>
                  <th style="width: 10%;">Time</th>
                  <th style="width: 22%;">Area/Site</th>
                  <th style="width: 18%;">Duration</th>
                </tr>
              </thead>
              <tbody>
                ${formData.medicines.map((med: Medicine, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${med.name}</td>
                    <td>${med.quantity || 'N/A'}</td>
                    <td>${med.time}</td>
                    <td>${med.areasite}</td>
                    <td>${med.duration}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${instructions ? `
          <div class="section">
            <div class="section-title">Instructions</div>
            <div class="section-content" style="min-height: 40px; font-size: 14px; line-height: 1.3;">${instructions}</div>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <p class="signature-label">Doctor's Signature</p>
            </div>
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
              <p class="consultation-times">
                <strong>Consultation Hours:</strong> Mon-Sat: 10:00 AM - 3:00 PM | Tue/Thu/Sat: 6:00 PM - 8:00 PM | Sun: 10:00 AM - 1:00 PM
              </p>
            </div>
          </div>
          <p class="generation-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
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
        </div>

        <div className="form-section">
          <h2 className="section-heading">Additional Information (Print Only)</h2>
          <div className="form-group">
            <label>Instructions</label>
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
                  onClick={() => {
                    setCustomInstructionMode(false);
                    setInstructions('Apply Shampoo');
                  }}
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
                    setInstructions('');
                  } else {
                    setInstructions(e.target.value);
                  }
                }}
              >
                {instructionOptions.map((instruction) => (
                  <option key={instruction} value={instruction}>
                    {instruction}
                  </option>
                ))}
              </select>
            )}
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
                        </div>
                      )}
                    </div>

                    <div className="form-group">
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
                            style={{ marginTop: '5px', fontSize: '12px' }}
                          >
                            &larr; Back to dropdown
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
                          {timeOptions.map((timeOpt) => (
                            <option key={timeOpt} value={timeOpt}>
                              {timeOpt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
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
                            style={{ marginTop: '5px', fontSize: '12px' }}
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
                          {durationOptions.map((dur) => (
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
