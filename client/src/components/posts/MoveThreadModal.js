import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAlert } from '../../context/AlertContext';
import './MoveThreadModal.css';

const MoveThreadModal = ({ isOpen, onClose, onMoved, postId, currentCategoryId }) => {
  const { setAlert } = useAlert();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedCategoryId('');

    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await axios.get('/api/categories');
        setCategories(res.data.data);
      } catch (err) {
        setAlert('Error fetching categories', 'danger');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [isOpen, setAlert]);

  if (!isOpen) return null;

  const targetCategories = categories.filter((category) => category._id !== currentCategoryId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      setAlert('Please choose a category to move this thread to', 'danger');
      return;
    }

    try {
      setSubmitting(true);
      await axios.put(`/api/posts/${postId}/move`, { category: selectedCategoryId });

      // The move endpoint's response carries the raw post with an
      // unpopulated `category` id, not the populated object the thread page
      // renders - use the category already fetched for the picker instead,
      // the same merge-not-replace fix applied to handleLockThread/
      // handlePinThread.
      const movedCategory = categories.find((category) => category._id === selectedCategoryId);
      onMoved(movedCategory);
      setAlert('Thread moved successfully', 'success');
    } catch (err) {
      setAlert('Error moving thread', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="move-thread-modal-overlay">
      <div className="move-thread-modal">
        <div className="move-thread-modal-header">
          <h2>Move thread</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close move thread dialog"
          >
            &times;
          </button>
        </div>

        <div className="move-thread-modal-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="move-thread-category">Move to category</label>
              <select
                id="move-thread-category"
                className="form-control"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={categoriesLoading || submitting}
                required
              >
                <option value="" disabled>
                  {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                </option>
                {targetCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="move-thread-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting || categoriesLoading}>
                {submitting ? 'Moving...' : 'Move'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MoveThreadModal;
