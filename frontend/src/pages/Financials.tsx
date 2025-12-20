import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import './Financials.css';

interface DailyStats {
  consultationFees: number;
  drugFees: number;
  procedureFees: number;
  totalRevenue: number;
  cashPayments: number;
  cardPayments: number;
  gpayPayments: number;
  newPatientsCount: number;
}

interface DailyBreakdown {
  date: string;
  totalVisits: number;
  drugVisits: number;
  newPatients: number;
  totalRevenue: number;
}

interface MonthlyBreakdown {
  month: string;
  totalVisits: number;
  drugVisits: number;
  totalRevenue: number;
  avgDailyRevenue: number;
  newPatients: number;
  googleReferrals: number;
}

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'age' | 'graphs'>('daily');
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    consultationFees: 0,
    drugFees: 0,
    procedureFees: 0,
    totalRevenue: 0,
    cashPayments: 0,
    cardPayments: 0,
    gpayPayments: 0,
    newPatientsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const rowsPerPage = 10;
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdown[]>([]);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const monthlyRowsPerPage = 10;

  useEffect(() => {
    fetchDailyStats();
    fetchDailyBreakdown();
    fetchMonthlyBreakdown();
  }, []);

  const fetchDailyBreakdown = async () => {
    setLoadingBreakdown(true);
    try {
      // Fetch all visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('date, consultation_fee, drug_fee, Procedure_Fee, new_old')
        .order('date', { ascending: false });

      if (visitsError) throw visitsError;

      // Fetch all medicines
      const { data: medicinesData, error: medicinesError } = await supabase
        .from('medicines')
        .select('date, drug_fee')
        .order('date', { ascending: false });

      if (medicinesError) throw medicinesError;

      // Group by date
      const dateMap = new Map<string, DailyBreakdown>();

      // Process visits
      (visitsData || []).forEach(visit => {
        const date = visit.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            totalVisits: 0,
            drugVisits: 0,
            newPatients: 0,
            totalRevenue: 0,
          });
        }
        const stats = dateMap.get(date)!;
        stats.totalVisits++;
        if (visit.new_old === 'New') stats.newPatients++;
        stats.totalRevenue += (visit.consultation_fee || 0) + (visit.drug_fee || 0) + (visit.Procedure_Fee || 0);
      });

      // Process medicines
      (medicinesData || []).forEach(medicine => {
        const date = medicine.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            totalVisits: 0,
            drugVisits: 0,
            newPatients: 0,
            totalRevenue: 0,
          });
        }
        const stats = dateMap.get(date)!;
        stats.drugVisits++;
        stats.totalRevenue += medicine.drug_fee || 0;
      });

      // Convert to array and sort by date descending
      const breakdown = Array.from(dateMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setDailyBreakdown(breakdown);
    } catch (err: any) {
      console.error('Error fetching daily breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const fetchMonthlyBreakdown = async () => {
    setLoadingMonthly(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiBase}/financials/monthly-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly stats');
      }
      const data = await response.json();
      setMonthlyBreakdown(data);
    } catch (err: any) {
      console.error('Error fetching monthly breakdown:', err);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const fetchDailyStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old')
        .gte('date', today)
        .lte('date', today);

      if (visitsError) throw visitsError;

      // Count new patients from today's visits
      const newPatientsCount = (visitsData || []).filter(visit => visit.new_old === 'New').length;

      // Fetch today's medicines
      const { data: medicinesData, error: medicinesError } = await supabase
        .from('medicines')
        .select('drug_fee, payment_method')
        .gte('date', today)
        .lte('date', today);

      if (medicinesError) throw medicinesError;

      // Calculate stats from visits
      const visitStats = (visitsData || []).reduce((acc, visit) => {
        acc.consultationFees += visit.consultation_fee || 0;
        acc.drugFees += visit.drug_fee || 0;
        acc.procedureFees += visit.Procedure_Fee || 0;

        const method = visit.paymentmethod?.toLowerCase();
        if (method === 'cash') acc.cashPayments += (visit.consultation_fee || 0) + (visit.drug_fee || 0) + (visit.Procedure_Fee || 0);
        else if (method === 'card') acc.cardPayments += (visit.consultation_fee || 0) + (visit.drug_fee || 0) + (visit.Procedure_Fee || 0);
        else if (method === 'gpay') acc.gpayPayments += (visit.consultation_fee || 0) + (visit.drug_fee || 0) + (visit.Procedure_Fee || 0);

        return acc;
      }, { consultationFees: 0, drugFees: 0, procedureFees: 0, cashPayments: 0, cardPayments: 0, gpayPayments: 0 });

      // Calculate stats from medicines
      const medicineStats = (medicinesData || []).reduce((acc, medicine) => {
        acc.drugFees += medicine.drug_fee || 0;

        const method = medicine.payment_method?.toLowerCase();
        if (method === 'cash') acc.cashPayments += medicine.drug_fee || 0;
        else if (method === 'card') acc.cardPayments += medicine.drug_fee || 0;
        else if (method === 'gpay') acc.gpayPayments += medicine.drug_fee || 0;

        return acc;
      }, { drugFees: 0, cashPayments: 0, cardPayments: 0, gpayPayments: 0 });

      // Combine stats
      const totalDrugFees = visitStats.drugFees + medicineStats.drugFees;
      const totalCash = visitStats.cashPayments + medicineStats.cashPayments;
      const totalCard = visitStats.cardPayments + medicineStats.cardPayments;
      const totalGpay = visitStats.gpayPayments + medicineStats.gpayPayments;
      const totalRevenue = visitStats.consultationFees + totalDrugFees + visitStats.procedureFees;

      setDailyStats({
        consultationFees: visitStats.consultationFees,
        drugFees: totalDrugFees,
        procedureFees: visitStats.procedureFees,
        totalRevenue,
        cashPayments: totalCash,
        cardPayments: totalCard,
        gpayPayments: totalGpay,
        newPatientsCount,
      });
    } catch (err: any) {
      console.error('Error fetching daily stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalPages = Math.ceil(dailyBreakdown.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = dailyBreakdown.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const totalMonthlyPages = Math.ceil(monthlyBreakdown.length / monthlyRowsPerPage);
  const monthlyStartIndex = (monthlyPage - 1) * monthlyRowsPerPage;
  const monthlyEndIndex = monthlyStartIndex + monthlyRowsPerPage;
  const currentMonthlyData = monthlyBreakdown.slice(monthlyStartIndex, monthlyEndIndex);

  const handlePrevMonthlyPage = () => {
    if (monthlyPage > 1) setMonthlyPage(monthlyPage - 1);
  };

  const handleNextMonthlyPage = () => {
    if (monthlyPage < totalMonthlyPages) setMonthlyPage(monthlyPage + 1);
  };

  return (
    <div className="financials-page">
      <div className="financials-header">
        <h1 className="page-title">Financial Overview</h1>
        <p className="page-subtitle">Track revenue, payments, and financial statistics</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading financial data...</p>
        </div>
      ) : (
        <>
          {/* Revenue Cards */}
          <div className="stats-grid">
            <div className="stat-card revenue-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Today's Consultation Fees</div>
                <div className="stat-value">{formatCurrency(dailyStats.consultationFees)}</div>
              </div>
            </div>

            <div className="stat-card revenue-card">
              <div className="stat-icon">💊</div>
              <div className="stat-content">
                <div className="stat-label">Today's Drug Fees</div>
                <div className="stat-value">{formatCurrency(dailyStats.drugFees)}</div>
              </div>
            </div>

            <div className="stat-card revenue-card">
              <div className="stat-icon">⚕️</div>
              <div className="stat-content">
                <div className="stat-label">Today's Procedure Fees</div>
                <div className="stat-value">{formatCurrency(dailyStats.procedureFees)}</div>
              </div>
            </div>

            <div className="stat-card total-revenue-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-label">Today's Total Revenue</div>
                <div className="stat-value total-value">{formatCurrency(dailyStats.totalRevenue)}</div>
              </div>
            </div>
          </div>

          {/* Payment Method Cards */}
          <div className="payment-methods-section">
            <h2 className="section-heading">Payment Methods Breakdown</h2>
            <div className="payment-stats-grid">
              <div className="payment-stat-card cash">
                <div className="payment-icon">💵</div>
                <div className="payment-content">
                  <div className="payment-label">Cash Payments</div>
                  <div className="payment-value">{formatCurrency(dailyStats.cashPayments)}</div>
                </div>
              </div>

              <div className="payment-stat-card card">
                <div className="payment-icon">💳</div>
                <div className="payment-content">
                  <div className="payment-label">Card Payments</div>
                  <div className="payment-value">{formatCurrency(dailyStats.cardPayments)}</div>
                </div>
              </div>

              <div className="payment-stat-card gpay">
                <div className="payment-icon">📱</div>
                <div className="payment-content">
                  <div className="payment-label">GPay Payments</div>
                  <div className="payment-value">{formatCurrency(dailyStats.gpayPayments)}</div>
                </div>
              </div>

              <div className="payment-stat-card new-patients">
                <div className="payment-icon">👥</div>
                <div className="payment-content">
                  <div className="payment-label">New Patients Today</div>
                  <div className="payment-value">{dailyStats.newPatientsCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="tabs-section">
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
                onClick={() => setActiveTab('daily')}
              >
                Daily Stats
              </button>
              <button
                className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setActiveTab('monthly')}
              >
                Monthly Stats
              </button>
              <button
                className={`tab-btn ${activeTab === 'age' ? 'active' : ''}`}
                onClick={() => setActiveTab('age')}
              >
                Age Stats
              </button>
              <button
                className={`tab-btn ${activeTab === 'graphs' ? 'active' : ''}`}
                onClick={() => setActiveTab('graphs')}
              >
                Graphs
              </button>
            </div>

            <div className="tabs-content">
              {activeTab === 'daily' && (
                <div className="tab-panel">
                  <h3>Daily Statistics Breakdown</h3>
                  {loadingBreakdown ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading daily breakdown...</p>
                    </div>
                  ) : dailyBreakdown.length === 0 ? (
                    <p className="coming-soon">No data available</p>
                  ) : (
                    <>
                      <div className="daily-breakdown-table-container">
                        <table className="daily-breakdown-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Total Visits</th>
                              <th>Drug Visits</th>
                              <th>New Patients</th>
                              <th>Total Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentData.map((day) => (
                              <tr key={day.date}>
                                <td className="date-cell">{formatDate(day.date)}</td>
                                <td className="number-cell">{day.totalVisits}</td>
                                <td className="number-cell">{day.drugVisits}</td>
                                <td className="number-cell">{day.newPatients}</td>
                                <td className="revenue-cell">{formatCurrency(day.totalRevenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="daily-pagination">
                        <button
                          className="pagination-btn"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          ← Previous
                        </button>
                        <div className="pagination-info">
                          <span>Page {currentPage} of {totalPages}</span>
                          <span className="showing-text">
                            Showing {startIndex + 1}-{Math.min(endIndex, dailyBreakdown.length)} of {dailyBreakdown.length} days
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
              )}

              {activeTab === 'monthly' && (
                <div className="tab-panel">
                  <h3>Monthly Statistics Breakdown</h3>
                  {loadingMonthly ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading monthly breakdown...</p>
                    </div>
                  ) : monthlyBreakdown.length === 0 ? (
                    <p className="coming-soon">No data available</p>
                  ) : (
                    <>
                      <div className="monthly-breakdown-table-container">
                        <table className="monthly-breakdown-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Total Visits</th>
                              <th>Drug Visits</th>
                              <th>Total Revenue</th>
                              <th>Avg Daily Revenue</th>
                              <th>New Patients</th>
                              <th>Google Referrals</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentMonthlyData.map((monthData) => (
                              <tr key={monthData.month}>
                                <td className="month-cell">{formatMonth(monthData.month)}</td>
                                <td className="number-cell">{monthData.totalVisits}</td>
                                <td className="number-cell">{monthData.drugVisits}</td>
                                <td className="revenue-cell">{formatCurrency(monthData.totalRevenue)}</td>
                                <td className="revenue-cell">{formatCurrency(monthData.avgDailyRevenue)}</td>
                                <td className="number-cell">{monthData.newPatients}</td>
                                <td className="number-cell">{monthData.googleReferrals}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="daily-pagination">
                        <button
                          className="pagination-btn"
                          onClick={handlePrevMonthlyPage}
                          disabled={monthlyPage === 1}
                        >
                          ← Previous
                        </button>
                        <div className="pagination-info">
                          <span>Page {monthlyPage} of {totalMonthlyPages}</span>
                          <span className="showing-text">
                            Showing {monthlyStartIndex + 1}-{Math.min(monthlyEndIndex, monthlyBreakdown.length)} of {monthlyBreakdown.length} months
                          </span>
                        </div>
                        <button
                          className="pagination-btn"
                          onClick={handleNextMonthlyPage}
                          disabled={monthlyPage === totalMonthlyPages}
                        >
                          Next →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'age' && (
                <div className="tab-panel">
                  <h3>Age Demographics</h3>
                  <p className="coming-soon">Patient age distribution and statistics coming soon...</p>
                </div>
              )}

              {activeTab === 'graphs' && (
                <div className="tab-panel">
                  <h3>Visual Analytics</h3>
                  <p className="coming-soon">Charts and graphs for revenue visualization coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
