import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import AddVisitModal from '../components/AddVisitModal';
import EditVisitModal from '../components/EditVisitModal';
import './Tests.css';

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

export default function Tests() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const visitsPerPage = 20;
  
  const [searchName, setSearchName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [consultationType, setConsultationType] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null);

  const fetchVisits = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('visits')
        .select('*', { count: 'exact' });

      // Apply name search
      if (searchName.trim()) {
        query = query.ilike('fullname', `%${searchName.trim()}%`);
      }

      // Apply date range filter
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      // Apply consultation type filter
      if (consultationType !== 'All') {
        query = query.eq('consultation_type', consultationType);
      }

      // Pagination
      const from = (currentPage - 1) * visitsPerPage;
      const to = from + visitsPerPage - 1;
      
      const { data, error: fetchError, count } = await query
        .order('visit_id', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setVisits(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visits');
      console.error('Error fetching visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [currentPage, consultationType, searchName, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalCount / visitsPerPage);

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
    setDateFrom('');
    setDateTo('');
    setConsultationType('All');
    setCurrentPage(1);
  };

  const handleEditClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setIsEditModalOpen(true);
  };

  const toggleExpand = (visitId: number) => {
    setExpandedVisitId(expandedVisitId === visitId ? null : visitId);
  };

  const handlePatientNameClick = async (e: React.MouseEvent, phoneNo: string) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('patient_id')
        .eq('phone_no', phoneNo)
        .single();
      
      if (error) throw error;
      if (data) {
        navigate(`/patient/${data.patient_id}`);
      }
    } catch (err) {
      console.error('Error finding patient:', err);
      alert('Could not find patient record');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="tests-page">
      <div className="page-header">
        <h1 className="page-title">All Visits</h1>
        <div className="header-actions">
          <span className="count-badge">{totalCount} Total Visits</span>
          <button className="btn-add-visit" onClick={() => setIsAddModalOpen(true)}>
            + Add New Visit
          </button>
        </div>
      </div>

      <AddVisitModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVisitAdded={() => {
          fetchVisits();
        }}
      />

      {selectedVisit && (
        <EditVisitModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onVisitUpdated={() => {
            fetchVisits();
          }}
          visit={selectedVisit}
        />
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Search by Patient Name</label>
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
          <label>Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Consultation Type</label>
          <select
            value={consultationType}
            onChange={(e) => {
              setConsultationType(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="All">All Types</option>
            <option value="Skin">Skin</option>
            <option value="Hair">Hair</option>
            <option value="Nail">Nail</option>
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
          <p>Loading visits...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="empty-state">
          <p>No visits found matching your criteria</p>
          <button className="btn-secondary" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="visits-table-container">
            <table className="visits-table">
              <thead>
                <tr>
                  <th>Visit ID</th>
                  <th>Date</th>
                  <th>Patient Name</th>
                  <th>Consultation Type</th>
                  <th>Consultation Fee</th>
                  <th>Drug Fee</th>
                  <th>Procedure Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <React.Fragment key={visit.visit_id}>
                  <tr className="visit-row" onClick={() => toggleExpand(visit.visit_id)}>
                    <td className="visit-id">#{visit.visit_id}</td>
                    <td className="visit-date">{formatDate(visit.date)}</td>
                    <td className="patient-name">
                      <span 
                        className="patient-name-link" 
                        onClick={(e) => handlePatientNameClick(e, visit.phoneno)}
                      >
                        {visit.fullname}
                      </span>
                    </td>
                    <td>
                      <span className={`consultation-badge ${visit.consultation_type?.toLowerCase()}`}>
                        {visit.consultation_type || 'N/A'}
                      </span>
                    </td>
                    <td className="fee">{formatCurrency(visit.consultation_fee)}</td>
                    <td className="fee">{formatCurrency(visit.drug_fee)}</td>
                    <td className="fee">{formatCurrency(visit.Procedure_Fee || 0)}</td>
                    <td className="actions">
                      <button 
                        className="btn-edit-icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(visit);
                        }} 
                        title="Edit Visit"
                      >
                        ✏️
                      </button>
                      <span className="expand-indicator">
                        {expandedVisitId === visit.visit_id ? '▼' : '▶'}
                      </span>
                    </td>
                  </tr>
                  {expandedVisitId === visit.visit_id && (
                    <tr className="expandable-details">
                      <td colSpan={8}>
                        <div className="visit-details-expanded">
                          <div className="detail-section">
                            <h4>Patient Information</h4>
                            <div className="detail-grid">
                              <span><strong>Full Name:</strong> {visit.fullname}</span>
                              <span><strong>Sex:</strong> {visit.sex === 'M' ? 'Male' : 'Female'}</span>
                              <span><strong>Age:</strong> {visit.age} years</span>
                              <span><strong>Phone:</strong> {visit.phoneno}</span>
                              <span><strong>Hometown:</strong> {visit.hometown}</span>
                              <span><strong>Patient Type:</strong> {visit.new_old || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="detail-section">
                            <h4>Financial Summary</h4>
                            <div className="detail-grid">
                              <span><strong>Consultation Fee:</strong> {formatCurrency(visit.consultation_fee)}</span>
                              <span><strong>Drug Fee:</strong> {formatCurrency(visit.drug_fee)}</span>
                              <span><strong>Procedure Fee:</strong> {formatCurrency(visit.Procedure_Fee)}</span>
                              <span><strong>Total:</strong> {formatCurrency((visit.consultation_fee || 0) + (visit.drug_fee || 0) + (visit.Procedure_Fee || 0))}</span>
                              <span><strong>Payment Method:</strong> {visit.paymentmethod || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="detail-section">
                            <h4>Medicals</h4>
                            <div className="detail-grid">
                              <span><strong>Weight:</strong> {visit.weight || 'Not recorded'}</span>
                              <span><strong>Blood Pressure:</strong> {visit.blood_pressure || 'Not recorded'}</span>
                              <span><strong>Pulse:</strong> {visit.pulse || 'Not recorded'}</span>
                            </div>
                          </div>
                          {visit.extra_procedures && (
                            <div className="detail-section">
                              <h4>Extra Procedures</h4>
                              <p className="procedures-text">{visit.extra_procedures}</p>
                            </div>
                          )}
                          <div className="detail-section">
                            <h4>Referral Information</h4>
                            <p className="referral-text">{visit.referral || 'None'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
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
                Showing {((currentPage - 1) * visitsPerPage) + 1} - {Math.min(currentPage * visitsPerPage, totalCount)} of {totalCount}
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
