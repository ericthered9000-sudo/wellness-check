import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  unit?: string;
  instructions?: string;
  schedule: string;
  times: string[];
  next_due?: string;
  last_taken?: string;
  active: boolean;
}

interface Props {
  userId: string;
}

export function MedicationsTab({ userId }: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState<{ overall: number; byMedication: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    unit: 'pill',
    instructions: '',
    schedule: 'daily',
    times: ['08:00']
  });

  // Load medications
  useEffect(() => {
    if (userId) {
      loadMedications();
      loadAdherence();
    }
  }, [userId]);

  const loadMedications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/medications/${userId}`);
      const data = await res.json();
      setMedications(data);
    } catch (error) {
      console.error('Failed to load medications:', error);
    }
  };

  const loadAdherence = async () => {
    try {
      const res = await fetch(`${API_URL}/api/medications/adherence/${userId}`);
      const data = await res.json();
      setAdherence(data);
    } catch (error) {
      console.error('Failed to load adherence:', error);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: form.name,
          dosage: form.dosage || undefined,
          unit: form.unit,
          instructions: form.instructions || undefined,
          schedule: form.schedule,
          times: form.times
        })
      });

      if (res.ok) {
        await loadMedications();
        setShowAddModal(false);
        setForm({ name: '', dosage: '', unit: 'pill', instructions: '', schedule: 'daily', times: ['08:00'] });
      }
    } catch (error) {
      console.error('Failed to add medication:', error);
    }

    setLoading(false);
  };

  const handleTakeMedication = async (medId: string) => {
    try {
      await fetch(`${API_URL}/api/medications/${medId}/taken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      await loadMedications();
      await loadAdherence();
    } catch (error) {
      console.error('Failed to log medication:', error);
    }
  };

  const addTimeSlot = () => {
    setForm({ ...form, times: [...form.times, '12:00'] });
  };

  const removeTimeSlot = (index: number) => {
    setForm({ ...form, times: form.times.filter((_, i) => i !== index) });
  };

  const updateTimeSlot = (index: number, time: string) => {
    const newTimes = [...form.times];
    newTimes[index] = time;
    setForm({ ...form, times: newTimes });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="medications-tab">
      {/* Adherence Summary */}
      {adherence && (
        <div className="adherence-card">
          <h3>Medication Adherence</h3>
          <div className="adherence-score">
            <div className={`score ${adherence.overall >= 80 ? 'good' : adherence.overall >= 50 ? 'moderate' : 'low'}`}>
              {adherence.overall}%
            </div>
            <span className="label">Last 7 days</span>
          </div>
          {adherence.byMedication.length > 0 && (
            <div className="medication-breakdown">
              {adherence.byMedication.map((med: any) => (
                <div key={med.medicationId} className="med-stat">
                  <span className="med-name">{med.medicationName}</span>
                  <span className={`med-percent ${med.adherence >= 80 ? 'good' : med.adherence >= 50 ? 'moderate' : 'low'}`}>
                    {med.adherence}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medication List */}
      <div className="medications-list">
        <div className="list-header">
          <h3>Your Medications</h3>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Medication
          </button>
        </div>

        {medications.length === 0 ? (
          <div className="empty-state">
            <p>No medications added yet</p>
            <p className="hint">Tap "Add Medication" to get started</p>
          </div>
        ) : (
          <div className="medication-cards">
            {medications.map(med => {
              // Determine medication status
              const now = new Date();
              const currentTime = now.getHours() * 60 + now.getMinutes();
              const [hours, mins] = med.times[0]?.split(':').map(Number) || [0, 0];
              const dueTime = hours * 60 + mins;
              const timeDiff = currentTime - dueTime;
              
              let status = 'pending';
              let statusIcon = '⏰';
              let statusText = 'Scheduled';
              
              if (med.last_taken) {
                const lastTaken = new Date(med.last_taken);
                const today = new Date();
                if (lastTaken.toDateString() === today.toDateString()) {
                  status = 'taken';
                  statusIcon = '✅';
                  statusText = 'Taken today';
                } else if (timeDiff > 60) {
                  status = 'missed';
                  statusIcon = '❗';
                  statusText = 'Missed';
                } else if (timeDiff >= 0) {
                  status = 'due';
                  statusIcon = '⏰';
                  statusText = 'Due now';
                }
              } else if (timeDiff > 60) {
                status = 'missed';
                statusIcon = '❗';
                statusText = 'Missed';
              } else if (timeDiff >= -30 && timeDiff <= 0) {
                status = 'upcoming';
                statusIcon = '🔔';
                statusText = 'Coming up';
              }
              
              return (
              <div key={med.id} className={`medication-card status-${status}`}>
                <div className="med-status-badge">
                  <span className="status-icon">{statusIcon}</span>
                  <span className="status-text">{statusText}</span>
                </div>
                
                <div className="med-header">
                  <h4>{med.name}</h4>
                  {med.dosage && <span className="dosage">{med.dosage} {med.unit}</span>}
                </div>
                
                <div className="med-schedule">
                  <span className="schedule-type">{med.schedule}</span>
                  <span className="times">
                    {med.times.map(formatTime).join(', ')}
                  </span>
                </div>

                {med.instructions && (
                  <p className="instructions">{med.instructions}</p>
                )}

                <div className="med-actions">
                  <button 
                    className="btn btn-success btn-large"
                    onClick={() => handleTakeMedication(med.id)}
                  >
                    ✓ Mark as Taken
                  </button>
                </div>

                {med.last_taken && (
                  <p className="last-taken">
                    Last taken: {new Date(med.last_taken).toLocaleString()}
                  </p>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Medication</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddMedication}>
              <div className="form-group">
                <label>Medication Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Lisinopril"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dosage</label>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="pill">Pill(s)</option>
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="capsule">Capsule(s)</option>
                    <option value="drop">Drop(s)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Schedule</label>
                <select
                  value={form.schedule}
                  onChange={e => setForm({ ...form, schedule: e.target.value })}
                >
                  <option value="daily">Once daily</option>
                  <option value="twice daily">Twice daily</option>
                  <option value="three times daily">Three times daily</option>
                  <option value="every 8 hours">Every 8 hours</option>
                  <option value="weekly">Weekly</option>
                  <option value="as needed">As needed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Times</label>
                {form.times.map((time, index) => (
                  <div key={index} className="time-slot">
                    <input
                      type="time"
                      value={time}
                      onChange={e => updateTimeSlot(index, e.target.value)}
                    />
                    {form.times.length > 1 && (
                      <button type="button" onClick={() => removeTimeSlot(index)}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-small" onClick={addTimeSlot}>
                  + Add Time
                </button>
              </div>

              <div className="form-group">
                <label>Instructions</label>
                <input
                  type="text"
                  value={form.instructions}
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                  placeholder="e.g., Take with food"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}