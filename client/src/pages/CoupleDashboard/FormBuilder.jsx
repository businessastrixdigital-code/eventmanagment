import React, { useState, useEffect } from 'react';
import CoupleDashboardLayout from '../../components/CoupleDashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, X, PlusCircle, AlertCircle, LayoutList } from 'lucide-react';

export default function FormBuilder() {
  const { apiRequest } = useAuth();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/couple/custom-fields');
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      } else {
        setError('Failed to fetch custom RSVP fields.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleAddField = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!label) {
      setError('Field label is required.');
      return;
    }

    if (type === 'dropdown' && options.length === 0) {
      setError('Dropdown fields must have at least one option.');
      return;
    }

    try {
      const res = await apiRequest('/api/couple/custom-fields', {
        method: 'POST',
        body: JSON.stringify({ label, type, required, options })
      });
      if (res.ok) {
        setSuccess(`Custom RSVP field "${label}" added!`);
        // Reset
        setLabel('');
        setType('text');
        setRequired(false);
        setOptions([]);
        setNewOption('');
        fetchFields();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create field.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleDeleteField = async (id) => {
    if (!confirm('Are you sure you want to delete this custom field? All answers already collected from guests for this field will be permanently deleted.')) {
      return;
    }
    setError('');
    try {
      const res = await apiRequest(`/api/couple/custom-fields/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Custom field deleted.');
        fetchFields();
      } else {
        setError('Failed to delete field.');
      }
    } catch (err) {
      setError('Network error.');
    }
  };

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <CoupleDashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-jost text-wedding-dark">RSVP Form Builder</h1>
        <p className="text-sm text-wedding-brown/70 mt-1">Add custom fields (food preference, allergies, stay requirements) to the RSVP form</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl text-sm text-green-700 mb-8">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator panel */}
        <div className="lg:col-span-1">
          <div className="wedding-card bg-white">
            <h3 className="text-lg font-bold font-jost text-wedding-dark mb-4">Create Field</h3>
            
            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Field Label / Question</label>
                <input 
                  type="text" 
                  required 
                  value={label} 
                  onChange={(e) => setLabel(e.target.value)} 
                  className="wedding-input" 
                  placeholder="e.g. Dietary Preferences"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Input Type</label>
                <select 
                  value={type} 
                  onChange={(e) => { setType(e.target.value); setOptions([]); }} 
                  className="wedding-input"
                >
                  <option value="text">Text Response</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                  <option value="dropdown">Dropdown (Select Option)</option>
                </select>
              </div>

              {/* Options field for dropdown */}
              {type === 'dropdown' && (
                <div className="border border-wedding-gold/15 bg-wedding-beige/10 rounded-2xl p-4 space-y-3">
                  <label className="block text-xs font-semibold uppercase text-wedding-brown/70">Dropdown Options</label>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      className="wedding-input py-1.5 text-xs" 
                      placeholder="Add option"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddOption}
                      className="outline-button px-3 py-1.5 flex items-center justify-center"
                    >
                      <PlusCircle className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-white border border-wedding-gold/25 px-2.5 py-1 rounded-full text-xs font-semibold text-wedding-brown">
                        {opt}
                        <button type="button" onClick={() => handleRemoveOption(idx)} className="text-red-500 hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="accent-wedding-brown cursor-pointer h-4 w-4"
                />
                <label htmlFor="required" className="text-xs font-semibold text-wedding-brown select-none cursor-pointer">
                  Mark as Required Field
                </label>
              </div>

              <button type="submit" className="gold-button w-full">Add to RSVP Form</button>
            </form>
          </div>
        </div>

        {/* Display / Preview list panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LayoutList className="h-5 w-5 text-wedding-gold" />
            <h3 className="text-lg font-bold font-jost text-wedding-dark">Active Custom Fields</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wedding-gold"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-wedding-gold/10 p-6">
                  <p className="text-sm text-wedding-brown/50 italic">No custom fields created. Standard RSVP forms only capture Attending/Declined status.</p>
                </div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="wedding-card bg-white flex justify-between items-center relative overflow-hidden">
                    <div className="floral-corner-tl opacity-40"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-wedding-dark">{field.label}</span>
                        {field.required && (
                          <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-wedding-brown/60 mt-1 uppercase tracking-wider font-semibold">
                        Input Type: <span className="text-[#C9A66B]">{field.type}</span>
                      </p>
                      
                      {field.type === 'dropdown' && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {field.options?.map((opt, idx) => (
                            <span key={idx} className="bg-wedding-beige/40 px-2 py-0.5 rounded-md text-[10px] text-wedding-brown font-medium">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => handleDeleteField(field.id)}
                      className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors z-10"
                      title="Delete Field"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </CoupleDashboardLayout>
  );
}
