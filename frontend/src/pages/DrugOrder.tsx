import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { logActivity } from '../lib/activityLog';
import './DrugOrder.css';

interface CustomMedicine {
  id: number;
  medicine_name: string;
}

interface CustomQuantity {
  id: number;
  quantity_value: string;
}

interface CustomTime {
  id: number;
  time_value: string;
}

interface CustomFrequency {
  id: number;
  frequency_value: string;
}

interface CustomDuration {
  id: number;
  duration_value: string;
}

type TabType = 'medicines' | 'quantities' | 'times' | 'frequencies' | 'durations';

export default function DrugOrder() {
  const [activeTab, setActiveTab] = useState<TabType>('medicines');
  
  // Medicines state
  const [customMedicines, setCustomMedicines] = useState<CustomMedicine[]>([]);
  const [newMedicine, setNewMedicine] = useState('');
  
  // Quantities state
  const [customQuantities, setCustomQuantities] = useState<CustomQuantity[]>([]);
  const [newQuantity, setNewQuantity] = useState('');
  
  // Times state
  const [customTimes, setCustomTimes] = useState<CustomTime[]>([]);
  const [newTime, setNewTime] = useState('');
  
  // Frequencies state
  const [customFrequencies, setCustomFrequencies] = useState<CustomFrequency[]>([]);
  const [newFrequency, setNewFrequency] = useState('');
  
  // Durations state
  const [customDurations, setCustomDurations] = useState<CustomDuration[]>([]);
  const [newDuration, setNewDuration] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = () => {
    fetchCustomMedicines();
    fetchCustomQuantities();
    fetchCustomTimes();
    fetchCustomFrequencies();
    fetchCustomDurations();
  };

  // MEDICINES CRUD
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
    if (!editingValue.trim()) {
      alert('Medicine name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_medicines')
        .update({ medicine_name: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom medicine ID ${id}`);
      setEditingId(null);
      setEditingValue('');
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

  // QUANTITIES CRUD
  const fetchCustomQuantities = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_quantities')
        .select('*')
        .order('quantity_value', { ascending: true });

      if (error) throw error;
      setCustomQuantities(data || []);
    } catch (error: any) {
      console.error('Error fetching quantities:', error);
    }
  };

  const addQuantity = async () => {
    if (!newQuantity.trim()) {
      alert('Please enter a quantity value');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_quantities')
        .insert([{ quantity_value: newQuantity.trim() }]);

      if (error) throw error;

      await logActivity(`Added custom quantity: ${newQuantity.trim()}`);
      setNewQuantity('');
      fetchCustomQuantities();
    } catch (error: any) {
      console.error('Error adding quantity:', error);
      alert('Failed to add quantity');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: number) => {
    if (!editingValue.trim()) {
      alert('Quantity value cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_quantities')
        .update({ quantity_value: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom quantity ID ${id}`);
      setEditingId(null);
      setEditingValue('');
      fetchCustomQuantities();
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuantity = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_quantities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Deleted custom quantity: ${value}`);
      fetchCustomQuantities();
    } catch (error: any) {
      console.error('Error deleting quantity:', error);
      alert('Failed to delete quantity');
    } finally {
      setLoading(false);
    }
  };

  // TIMES CRUD
  const fetchCustomTimes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_times')
        .select('*')
        .order('time_value', { ascending: true });

      if (error) throw error;
      setCustomTimes(data || []);
    } catch (error: any) {
      console.error('Error fetching times:', error);
    }
  };

  const addTime = async () => {
    if (!newTime.trim()) {
      alert('Please enter a time value');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_times')
        .insert([{ time_value: newTime.trim() }]);

      if (error) throw error;

      await logActivity(`Added custom time: ${newTime.trim()}`);
      setNewTime('');
      fetchCustomTimes();
    } catch (error: any) {
      console.error('Error adding time:', error);
      alert('Failed to add time');
    } finally {
      setLoading(false);
    }
  };

  const updateTime = async (id: number) => {
    if (!editingValue.trim()) {
      alert('Time value cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_times')
        .update({ time_value: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom time ID ${id}`);
      setEditingId(null);
      setEditingValue('');
      fetchCustomTimes();
    } catch (error: any) {
      console.error('Error updating time:', error);
      alert('Failed to update time');
    } finally {
      setLoading(false);
    }
  };

  const deleteTime = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_times')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Deleted custom time: ${value}`);
      fetchCustomTimes();
    } catch (error: any) {
      console.error('Error deleting time:', error);
      alert('Failed to delete time');
    } finally {
      setLoading(false);
    }
  };

  // FREQUENCIES CRUD
  const fetchCustomFrequencies = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_frequencies')
        .select('*')
        .order('frequency_value', { ascending: true });

      if (error) throw error;
      setCustomFrequencies(data || []);
    } catch (error: any) {
      console.error('Error fetching frequencies:', error);
    }
  };

  const addFrequency = async () => {
    if (!newFrequency.trim()) {
      alert('Please enter a frequency value');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_frequencies')
        .insert([{ frequency_value: newFrequency.trim() }]);

      if (error) throw error;

      await logActivity(`Added custom frequency: ${newFrequency.trim()}`);
      setNewFrequency('');
      fetchCustomFrequencies();
    } catch (error: any) {
      console.error('Error adding frequency:', error);
      alert('Failed to add frequency');
    } finally {
      setLoading(false);
    }
  };

  const updateFrequency = async (id: number) => {
    if (!editingValue.trim()) {
      alert('Frequency value cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_frequencies')
        .update({ frequency_value: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom frequency ID ${id}`);
      setEditingId(null);
      setEditingValue('');
      fetchCustomFrequencies();
    } catch (error: any) {
      console.error('Error updating frequency:', error);
      alert('Failed to update frequency');
    } finally {
      setLoading(false);
    }
  };

  const deleteFrequency = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_frequencies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Deleted custom frequency: ${value}`);
      fetchCustomFrequencies();
    } catch (error: any) {
      console.error('Error deleting frequency:', error);
      alert('Failed to delete frequency');
    } finally {
      setLoading(false);
    }
  };

  // DURATIONS CRUD
  const fetchCustomDurations = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_durations')
        .select('*')
        .order('duration_value', { ascending: true });

      if (error) throw error;
      setCustomDurations(data || []);
    } catch (error: any) {
      console.error('Error fetching durations:', error);
    }
  };

  const addDuration = async () => {
    if (!newDuration.trim()) {
      alert('Please enter a duration value');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_durations')
        .insert([{ duration_value: newDuration.trim() }]);

      if (error) throw error;

      await logActivity(`Added custom duration: ${newDuration.trim()}`);
      setNewDuration('');
      fetchCustomDurations();
    } catch (error: any) {
      console.error('Error adding duration:', error);
      alert('Failed to add duration');
    } finally {
      setLoading(false);
    }
  };

  const updateDuration = async (id: number) => {
    if (!editingValue.trim()) {
      alert('Duration value cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_durations')
        .update({ duration_value: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Updated custom duration ID ${id}`);
      setEditingId(null);
      setEditingValue('');
      fetchCustomDurations();
    } catch (error: any) {
      console.error('Error updating duration:', error);
      alert('Failed to update duration');
    } finally {
      setLoading(false);
    }
  };

  const deleteDuration = async (id: number, value: string) => {
    if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_durations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity(`Deleted custom duration: ${value}`);
      fetchCustomDurations();
    } catch (error: any) {
      console.error('Error deleting duration:', error);
      alert('Failed to delete duration');
    } finally {
      setLoading(false);
    }
  };

  // Generic handlers
  const getCurrentData = () => {
    switch (activeTab) {
      case 'medicines':
        return customMedicines.map(m => ({ id: m.id, value: m.medicine_name }));
      case 'quantities':
        return customQuantities.map(q => ({ id: q.id, value: q.quantity_value }));
      case 'times':
        return customTimes.map(t => ({ id: t.id, value: t.time_value }));
      case 'frequencies':
        return customFrequencies.map(f => ({ id: f.id, value: f.frequency_value }));
      case 'durations':
        return customDurations.map(d => ({ id: d.id, value: d.duration_value }));
      default:
        return [];
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'medicines': return 'Medicine';
      case 'quantities': return 'Quantity';
      case 'times': return 'Time';
      case 'frequencies': return 'Frequency';
      case 'durations': return 'Duration';
      default: return '';
    }
  };

  const getCurrentNewValue = () => {
    switch (activeTab) {
      case 'medicines': return newMedicine;
      case 'quantities': return newQuantity;
      case 'times': return newTime;
      case 'frequencies': return newFrequency;
      case 'durations': return newDuration;
      default: return '';
    }
  };

  const setCurrentNewValue = (value: string) => {
    switch (activeTab) {
      case 'medicines': setNewMedicine(value); break;
      case 'quantities': setNewQuantity(value); break;
      case 'times': setNewTime(value); break;
      case 'frequencies': setNewFrequency(value); break;
      case 'durations': setNewDuration(value); break;
    }
  };

  const handleAdd = () => {
    switch (activeTab) {
      case 'medicines': addMedicine(); break;
      case 'quantities': addQuantity(); break;
      case 'times': addTime(); break;
      case 'frequencies': addFrequency(); break;
      case 'durations': addDuration(); break;
    }
  };

  const handleUpdate = (id: number) => {
    switch (activeTab) {
      case 'medicines': updateMedicine(id); break;
      case 'quantities': updateQuantity(id); break;
      case 'times': updateTime(id); break;
      case 'frequencies': updateFrequency(id); break;
      case 'durations': updateDuration(id); break;
    }
  };

  const handleDelete = (id: number, value: string) => {
    switch (activeTab) {
      case 'medicines': deleteMedicine(id, value); break;
      case 'quantities': deleteQuantity(id, value); break;
      case 'times': deleteTime(id, value); break;
      case 'frequencies': deleteFrequency(id, value); break;
      case 'durations': deleteDuration(id, value); break;
    }
  };

  const currentData = getCurrentData();
  const filteredData = currentData.filter(item =>
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabLabel = getTabLabel();

  return (
    <div className="page-container">
      <h1 className="page-title">Drug Order</h1>
      
      <div className="drug-order-tabs">
        <button 
          className={`tab-button ${activeTab === 'medicines' ? 'active' : ''}`}
          onClick={() => setActiveTab('medicines')}
        >
          Medicines
        </button>
        <button 
          className={`tab-button ${activeTab === 'quantities' ? 'active' : ''}`}
          onClick={() => setActiveTab('quantities')}
        >
          Quantities
        </button>
        <button 
          className={`tab-button ${activeTab === 'times' ? 'active' : ''}`}
          onClick={() => setActiveTab('times')}
        >
          Times
        </button>
        <button 
          className={`tab-button ${activeTab === 'frequencies' ? 'active' : ''}`}
          onClick={() => setActiveTab('frequencies')}
        >
          Frequencies
        </button>
        <button 
          className={`tab-button ${activeTab === 'durations' ? 'active' : ''}`}
          onClick={() => setActiveTab('durations')}
        >
          Durations
        </button>
      </div>

      <div className="medicine-management">
        <div className="add-medicine-section">
          <h2>Add New {tabLabel}</h2>
          <div className="add-medicine-form">
            <input
              type="text"
              placeholder={`Enter ${tabLabel.toLowerCase()} value...`}
              value={getCurrentNewValue()}
              onChange={(e) => setCurrentNewValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              disabled={loading}
            />
            <button onClick={handleAdd} disabled={loading || !getCurrentNewValue().trim()}>
              + Add {tabLabel}
            </button>
          </div>
        </div>

        <div className="medicine-list-section">
          <div className="list-header">
            <h2>Custom {tabLabel}s ({currentData.length})</h2>
            <input
              type="text"
              placeholder={`🔍 Search ${tabLabel.toLowerCase()}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="medicine-note">
            <strong>Note:</strong> These custom {tabLabel.toLowerCase()}s will appear in the prescription {tabLabel.toLowerCase()} dropdown.
          </div>

          <div className="medicine-list">
            {filteredData.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? `No ${tabLabel.toLowerCase()}s found matching your search` : `No custom ${tabLabel.toLowerCase()}s added yet`}
              </div>
            ) : (
              filteredData.map((item) => (
                <div key={item.id} className="medicine-item">
                  {editingId === item.id ? (
                    <div className="edit-mode">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdate(item.id)}
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(item.id)} disabled={loading}>
                        ✓ Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingValue('');
                        }}
                        disabled={loading}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="view-mode">
                      <span className="medicine-name">{item.value}</span>
                      <div className="medicine-actions">
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingValue(item.value);
                          }}
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.value)}
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
