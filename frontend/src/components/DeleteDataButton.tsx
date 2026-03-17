import { useState } from 'react';
import { API_URL } from '../config';
import './DeleteDataButton.css';

interface DeleteDataButtonProps {
  onDeleted?: () => void;
}

export function DeleteDataButton({ onDeleted }: DeleteDataButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/account`, {
        method: 'DELETE',
        credentials: 'include', // Send httpOnly cookie
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear local storage
      localStorage.clear();
      setDeleted(true);
      setShowConfirm(false);
      
      if (onDeleted) {
        onDeleted();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete account. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="delete-success">
        <span className="success-icon">✓</span>
        <span className="success-text">All data has been deleted</span>
      </div>
    );
  }

  return (
    <div className="delete-data-container">
      <button 
        className="delete-data-btn"
        onClick={() => setShowConfirm(true)}
        aria-label="Delete all data"
      >
        🗑️ Delete All Data
      </button>
      <p className="delete-hint">This will permanently remove all your wellness data.</p>

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Delete All Data?</h3>
            <p className="confirm-text">
              This will permanently delete all your wellness check-ins, medications, activities, and doctor visits.
            </p>
            <p className="confirm-warning">
              <strong>This cannot be undone.</strong>
            </p>
            
            {error && <p className="error-message">{error}</p>}
            
            <div className="confirm-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
