import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import AddMedicineModal from '../components/AddMedicineModal';
import EditMedicineModal from '../components/EditMedicineModal';
import './Medicine.css';

interface Medicine {
  med_id: number;
  date: string;
  patient_name: string;
  drug_fee: number;
  payment_method: string;
  patient_id: number | null;
}

export default function Medicine() {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const medicinesPerPage = 20;
  
  const [searchName, setSearchName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  useEffect(() => {
    fetchMedicines();
  }, [currentPage, searchName, dateFrom, dateTo]);

  const fetchMedicines = async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('medicines')
        .select('*', { count: 'exact' })
        .order('med_id', { ascending: false });

      if (searchName) {
        query = query.ilike('patient_name', `%${searchName}%`);
      }

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const from = (currentPage - 1) * medicinesPerPage;
      const to = from + medicinesPerPage - 1;

      const { data, error: fetchError, count } = await query.range(from, to);

      if (fetchError) throw fetchError;

      setMedicines(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch medicines');
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patientId: number | null) => {
    if (patientId) {
      navigate(`/patient/${patientId}`);
    }
  };

  const handleEditClick = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setIsEditModalOpen(true);
  };

  const totalPages = Math.ceil(totalCount / medicinesPerPage);

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
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <h1 className="page-title">Old Medicine Records</h1>
        <div className="header-actions">
          <span className="count-badge">{totalCount} Total Records</span>
          <button className="btn-add-medicine" onClick={() => setIsAddModalOpen(true)}>
            + Add Medicine Visit
          </button>
        </div>
      </div>

      <AddMedicineModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMedicineAdded={() => {
          fetchMedicines();
        }}
      />

      {selectedMedicine && (
        <EditMedicineModal 
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMedicine(null);
          }}
          onMedicineUpdated={() => {
            fetchMedicines();
          }}
          medicine={selectedMedicine}
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

        <button className="btn-clear-filters" onClick={resetFilters}>
          Clear Filters
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading medicines...</p>
        </div>
      ) : medicines.length === 0 ? (
        <div className="empty-state">
          <p>No medicine records found</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="medicines-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Patient Name</th>
                  <th>Drug Fee</th>
                  <th>Payment Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine.med_id}>
                    <td>{medicine.med_id}</td>
                    <td>{formatDate(medicine.date)}</td>
                    <td>
                      <span 
                        className={`patient-link ${medicine.patient_id ? 'clickable' : 'disabled'}`}
                        onClick={() => handlePatientClick(medicine.patient_id)}
                      >
                        {medicine.patient_name}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(medicine.drug_fee)}</td>
                    <td>
                      <span className="payment-badge">{medicine.payment_method}</span>
                    </td>
                    <td>
                      <button 
                        className="btn-edit-icon"
                        onClick={() => handleEditClick(medicine)}
                        title="Edit medicine record"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
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
            <span className="pagination-info">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
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
