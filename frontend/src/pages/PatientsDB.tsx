import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase, { getPatientImageUrl } from '../lib/supabaseClient';
import AddPatientModal from '../components/AddPatientModal';
import './PatientsDB.css';

interface Patient {
  patient_id: number;
  name: string;
  sex: string;
  phone_no: string;
  year_of_birth: number;
  pic_filename: string | null;
  hometown: string;
}
export default function PatientsDB() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const patientsPerPage = 10;
  
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const fetchPatients = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' });

      // Apply gender filter
      if (genderFilter !== 'All') {
        query = query.eq('sex', genderFilter);
      }

      // Apply name search (case-insensitive, starts with or contains)
      if (searchName.trim()) {
        query = query.ilike('name', `%${searchName.trim()}%`);
      }

      // Apply phone search
      if (searchPhone.trim()) {
        query = query.ilike('phone_no', `%${searchPhone.trim()}%`);
      }

      // Pagination
      const from = (currentPage - 1) * patientsPerPage;
      const to = from + patientsPerPage - 1;
      
      const { data, error: fetchError, count } = await query
        .order('patient_id', { ascending: true })
        .range(from, to);

      if (fetchError) throw fetchError;

      setPatients(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [currentPage, genderFilter, searchName, searchPhone]);

  const totalPages = Math.ceil(totalCount / patientsPerPage);

  const calculateAge = (yearOfBirth: number) => {
    return new Date().getFullYear() - yearOfBirth;
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const resetFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setGenderFilter('All');
    setCurrentPage(1);
  };

  return (
    <div className="patients-db-page">
      <div className="page-header">
        <h1 className="page-title">Patients Database</h1>
        <div className="header-actions">
          <span className="count-badge">{totalCount} Total Patients</span>
          <button className="btn-add-patient" onClick={() => setIsAddModalOpen(true)}>
            + Add New Patient
          </button>
        </div>
      </div>

      <AddPatientModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPatientAdded={() => {
          fetchPatients();
          setImageVersion(Date.now());
        }}
      />

      <div className="filters-section">
        <div className="filter-group">
          <label>Search by Name</label>
          <input
            type="text"
            placeholder="Type patient name..."
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Search by Phone</label>
          <input
            type="text"
            placeholder="Type phone number..."
            value={searchPhone}
            onChange={(e) => {
              setSearchPhone(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Gender</label>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="All">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>

        <div className="filter-group">
          <button className="btn-reset" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading patients...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <p>No patients found matching your criteria</p>
          <button className="btn-secondary" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="patients-list">
            {patients.map((patient) => (
              <div key={patient.patient_id} className="patient-card">
                <div className="patient-avatar">
                  {patient.pic_filename ? (
                    <img 
                      src={`${getPatientImageUrl(patient.pic_filename)}${imageVersion ? `?v=${imageVersion}` : ''}`}
                      alt={patient.name}
                      className="avatar-image"
                      onError={(e) => {
                        const imgElement = e.currentTarget as HTMLImageElement;
                        const nextElement = imgElement.nextElementSibling as HTMLElement;
                        imgElement.style.display = 'none';
                        if (nextElement) nextElement.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span className="avatar-text" style={{ display: patient.pic_filename ? 'none' : 'flex' }}>
                    {patient.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={`gender-badge ${patient.sex === 'M' ? 'male' : 'female'}`}>
                    {patient.sex === 'M' ? '♂' : '♀'}
                  </span>
                </div>

                <div className="patient-info">
                  <h3 className="patient-name">{patient.name}</h3>
                  
                  <div className="info-row">
                    <span className="info-label">ID:</span>
                    <span className="info-value">{patient.patient_id}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Age:</span>
                    <span className="info-value">
                      {calculateAge(patient.year_of_birth)} years (Born {patient.year_of_birth})
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Phone:</span>
                    <span className="info-value phone">{patient.phone_no || 'N/A'}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Hometown:</span>
                    <span className="info-value">{patient.hometown || 'N/A'}</span>
                  </div>
                </div>

                <div className="patient-actions">
                  <button 
                    className="btn-view-details"
                    onClick={() => navigate(`/patient/${patient.patient_id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>

            <div className="pagination-info">
              <span className="current-page">Page {currentPage} of {totalPages}</span>
              <span className="showing-count">
                Showing {((currentPage - 1) * patientsPerPage) + 1} - {Math.min(currentPage * patientsPerPage, totalCount)} of {totalCount}
              </span>
            </div>

            <button
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
