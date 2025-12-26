import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import './StaffOverview.css';

interface ActivityLog {
  log_id: number;
  action: string;
  created_at: string;
  user_name: string;
}

interface User {
  uuid: string;
  screenname: string | null;
  email: string;
}

export default function StaffOverview() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const logsPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, dateFrom, dateTo, selectedUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('uuid, screenname, email')
        .order('screenname', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      
      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: logsPerPage.toString(),
      });

      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedUser) params.append('user_uuid', selectedUser);

      const response = await fetch(`${apiBase}/activity-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    
    return istDate.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const totalPages = Math.ceil(totalCount / logsPerPage);

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

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedUser('');
    setCurrentPage(1);
  };

  return (
    <div className="staff-overview-page">
      <div className="staff-header">
        <h1 className="page-title">Staff Activity Logs</h1>
        <p className="page-subtitle">Track all system activities and changes</p>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>From Date:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <label>To Date:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <label>User:</label>
          <select
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.uuid} value={user.uuid}>
                {user.screenname || user.email}
              </option>
            ))}
          </select>
        </div>

        {(dateFrom || dateTo || selectedUser) && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading activity logs...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchLogs} className="retry-btn">Retry</button>
        </div>
      ) : (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Log ID</th>
                  <th style={{ width: '25%' }}>Date & Time (IST)</th>
                  <th style={{ width: '20%' }}>User</th>
                  <th style={{ width: '40%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.log_id}>
                      <td>#{log.log_id}</td>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td className="user-name">{log.user_name}</td>
                      <td className="action-text">{log.action}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="no-data">
                      No activity logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalCount > logsPerPage && (
            <div className="pagination">
              <button 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages} ({totalCount} total logs)
              </span>
              <button 
                onClick={handleNextPage} 
                disabled={currentPage >= totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
