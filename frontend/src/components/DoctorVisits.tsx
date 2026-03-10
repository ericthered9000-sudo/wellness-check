import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './DoctorVisits.css';

interface DoctorVisit {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty: string;
  date_time: string;
  location: string;
  notes: string;
  reminder_days_before: number;
  reminder_sent: boolean;
  created_at: string;
}

interface DoctorVisitsProps {
  userId: string;
}


export function DoctorVisits({ userId }: DoctorVisitsProps) {
  const [visits, setVisits] = useState<DoctorVisit[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderDays, setReminderDays] = useState(1);

  useEffect(() => {
    loadVisits();
  }, [userId]);

  const loadVisits = async () => {
    try {
      const response = await fetch(`${API_URL}/api/visits/upcoming/${userId}`);
      if (!response.ok) throw new Error('Failed to load visits');
      const data = await response.json();
      setVisits(data);
    } catch (err) {
      console.error('Error loading visits:', err);
      setError('Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorName || !dateTime) {
      setError('Doctor name and date/time are required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          doctorName,
          dateTime,
          specialty,
          location,
          notes,
          reminderDaysBefore: reminderDays
        })
      });

      if (!response.ok) throw new Error('Failed to create visit');

      // Reset form
      setDoctorName('');
      setSpecialty('');
      setDateTime('');
      setLocation('');
      setNotes('');
      setReminderDays(1);
      setShowAddForm(false);
      
      // Reload visits
      loadVisits();
    } catch (err) {
      console.error('Error creating visit:', err);
      setError('Failed to create visit');
    }
  };

  const handleDelete = async (visitId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const response = await fetch(`${API_URL}/api/visits/${visitId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete visit');
      
      setVisits(visits.filter(v => v.id !== visitId));
    } catch (err) {
      console.error('Error deleting visit:', err);
      setError('Failed to delete visit');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDaysUntilLabel = (days: number) => {
    if (days < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    if (days <= 14) return `In 1 week`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
    return `In ${Math.ceil(days / 30)} month(s)`;
  };

  if (loading) return <div className="visits-loading">Loading appointments...</div>;
  if (error) return <div className="visits-error">{error}</div>;

  return (
    <div className="doctor-visits">
      {/* Header */}
      <div className="visits-header">
        <h3>📅 Doctor Appointments</h3>
        <button 
          className="add-visit-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Appointment'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form className="add-visit-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="doctorName">Doctor Name *</label>
            <input
              type="text"
              id="doctorName"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. Smith"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialty">Specialty</label>
            <input
              type="text"
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Cardiology"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateTime">Date & Time *</label>
            <input
              type="datetime-local"
              id="dateTime"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City Medical Center"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reminderDays">Remind Me</label>
            <select
              id="reminderDays"
              value={reminderDays}
              onChange={(e) => setReminderDays(parseInt(e.target.value))}
            >
              <option value={0}>Same day</option>
              <option value={1}>1 day before</option>
              <option value={2}>2 days before</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bring medication list, questions to ask..."
              rows={3}
            />
          </div>

          <button type="submit" className="submit-btn">
            💾 Save Appointment
          </button>
        </form>
      )}

      {/* Visits List */}
      <div className="visits-list">
        {visits.length === 0 ? (
          <div className="no-visits">
            <p>No upcoming appointments</p>
            <p className="hint">Click "+ Add Appointment" to schedule one</p>
          </div>
        ) : (
          visits.map(visit => {
            const daysUntil = getDaysUntil(visit.date_time);
            return (
              <div key={visit.id} className={`visit-card ${daysUntil <= 1 ? 'urgent' : daysUntil <= 7 ? 'soon' : ''}`}>
                <div className="visit-header">
                  <div className="visit-doctor">
                    <span className="doctor-name">{visit.doctor_name}</span>
                    {visit.specialty && <span className="specialty">{visit.specialty}</span>}
                  </div>
                  <span className={`days-until ${daysUntil <= 1 ? 'urgent' : daysUntil <= 7 ? 'soon' : ''}`}>
                    {getDaysUntilLabel(daysUntil)}
                  </span>
                </div>
                
                <div className="visit-details">
                  <div className="visit-date">
                    📅 {formatDate(visit.date_time)} at {formatTime(visit.date_time)}
                  </div>
                  {visit.location && (
                    <div className="visit-location">📍 {visit.location}</div>
                  )}
                  {visit.notes && (
                    <div className="visit-notes">📝 {visit.notes}</div>
                  )}
                </div>

                <div className="visit-actions">
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(visit.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}