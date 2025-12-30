import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './DrugOrder.css';

interface CustomMedicine {
  id: number;
  medicine_name: string;
}

export default function DrugOrder() {
  const [customMedicines, setCustomMedicines] = useState<CustomMedicine[]>([]);
  const [newMedicine, setNewMedicine] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomMedicines();
  }, []);

  const fetchCustomMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_medicines')
        .select('*')
        .order('medicine_name', { ascending: true });

      if (error) throw error;
      setCustomMedicines(data || []);
    } catch (error: any) {
      console.error('Error fetching medicines:', error);
      alert('Failed to load medicines');
    }
  };

  const addMedicine = async () => {
    if (!newMedicine.trim()) {
      alert('Please enter a medicine name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_medicines')
        .insert([{ medicine_name: newMedicine.trim() }]);

      if (error) throw error;

      await logActivity(`Added custom medicine: ${newMedicine.trim()}`);
      setNewMedicine('');
      fetchCustomMedicines();
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      alert('Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const updateMedicine = async (id: number) => {
    if (!editingName.trim()) {
      alert('Medicine name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_medicines')
        .update({ medicine_name: editingName.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom medicine ID ${id}`);
      setEditingId(null);
      setEditingName('');
      fetchCustomMedicines();
    } catch (error: any) {
      console.error('Error updating medicine:', error);
      alert('Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  const deleteMedicine = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_medicines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Deleted custom medicine: ${name}`);
      fetchCustomMedicines();
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      alert('Failed to delete medicine');
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = customMedicines.filter(med =>
    med.medicine_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <h1 className="page-title">Drug Order</h1>
      
      <div className="drug-order-tabs">
        <button className="tab-button active">Customize Medicine Dropdown</button>
      </div>

      <div className="medicine-management">
        <div className="add-medicine-section">
          <h2>Add New Medicine</h2>
          <div className="add-medicine-form">
            <input
              type="text"
              placeholder="Enter medicine name..."
              value={newMedicine}
              onChange={(e) => setNewMedicine(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMedicine()}
              disabled={loading}
            />
            <button onClick={addMedicine} disabled={loading || !newMedicine.trim()}>
              + Add Medicine
            </button>
          </div>
        </div>

        <div className="medicine-list-section">
          <div className="list-header">
            <h2>Custom Medicines ({customMedicines.length})</h2>
            <input
              type="text"
              placeholder="🔍 Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="medicine-note">
            <strong>Note:</strong> These custom medicines will appear in the prescription medicine dropdown along with the default medicines list.
          </div>

          <div className="medicine-list">
            {filteredMedicines.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? 'No medicines found matching your search' : 'No custom medicines added yet'}
              </div>
            ) : (
              filteredMedicines.map((med) => (
                <div key={med.id} className="medicine-item">
                  {editingId === med.id ? (
                    <div className="edit-mode">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && updateMedicine(med.id)}
                        autoFocus
                      />
                      <button onClick={() => updateMedicine(med.id)} disabled={loading}>
                        ✓ Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        disabled={loading}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="view-mode">
                      <span className="medicine-name">{med.medicine_name}</span>
                      <div className="medicine-actions">
                        <button
                          onClick={() => {
                            setEditingId(med.id);
                            setEditingName(med.medicine_name);
                          }}
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteMedicine(med.id, med.medicine_name)}
                          disabled={loading}
                          className="delete-btn"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
