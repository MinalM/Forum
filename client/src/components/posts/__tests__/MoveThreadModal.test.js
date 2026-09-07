import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MoveThreadModal from '../MoveThreadModal';
import { AlertProvider } from '../../../context/AlertContext';
import Alert from '../../layout/Alert';

// moveThread (PUT /api/posts/:id/move) has always existed server-side and
// is correctly permission-gated, but nothing in the client ever called it -
// see the "moveThread has no UI and is dead code end to end" backlog item.
// This modal is the UI: it lists categories, moves the thread on submit,
// and (like handleLockThread/handlePinThread) hands the caller a fully
// populated category object to merge into post state rather than the raw
// unpopulated id the move endpoint's response carries.

jest.mock('axios');

const POST_ID = '000000000000000000000001';
const CURRENT_CATEGORY_ID = '000000000000000000000002';
const OTHER_CATEGORY = { _id: '000000000000000000000003', name: 'Interview Prep' };
const CATEGORIES = [
  { _id: CURRENT_CATEGORY_ID, name: 'Career Advice' },
  OTHER_CATEGORY
];

const renderModal = (props = {}) =>
  render(
    <AlertProvider>
      <Alert />
      <MoveThreadModal
        isOpen={true}
        onClose={jest.fn()}
        onMoved={jest.fn()}
        postId={POST_ID}
        currentCategoryId={CURRENT_CATEGORY_ID}
        {...props}
      />
    </AlertProvider>
  );

beforeEach(() => {
  axios.get.mockReset();
  axios.put.mockReset();
  axios.get.mockResolvedValue({ data: { success: true, data: CATEGORIES } });
});

describe('MoveThreadModal', () => {
  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/move thread/i)).not.toBeInTheDocument();
  });

  it('fetches categories and excludes the post current category from the picker', async () => {
    renderModal();

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/categories'));
    expect(
      await screen.findByRole('option', { name: OTHER_CATEGORY.name })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Career Advice' })
    ).not.toBeInTheDocument();
  });

  it('moves the thread and reports the populated target category, not the raw id', async () => {
    axios.put.mockResolvedValueOnce({
      data: { success: true, data: { _id: POST_ID, category: OTHER_CATEGORY._id } }
    });
    const onMoved = jest.fn();
    const onClose = jest.fn();
    renderModal({ onMoved, onClose });

    await screen.findByRole('option', { name: OTHER_CATEGORY.name });
    fireEvent.change(screen.getByLabelText(/move to category/i), {
      target: { value: OTHER_CATEGORY._id }
    });
    fireEvent.click(screen.getByRole('button', { name: /^move$/i }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(`/api/posts/${POST_ID}/move`, {
        category: OTHER_CATEGORY._id
      })
    );
    expect(onMoved).toHaveBeenCalledWith(OTHER_CATEGORY);
  });

  it('does not submit without a chosen category', async () => {
    renderModal();

    await screen.findByRole('option', { name: OTHER_CATEGORY.name });
    fireEvent.click(screen.getByRole('button', { name: /^move$/i }));

    expect(axios.put).not.toHaveBeenCalled();
  });

  it('calls onClose without moving when Cancel is clicked', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    await screen.findByRole('option', { name: OTHER_CATEGORY.name });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('shows an alert and does not call onMoved when the move request fails', async () => {
    axios.put.mockRejectedValueOnce(new Error('network error'));
    const onMoved = jest.fn();
    renderModal({ onMoved });

    await screen.findByRole('option', { name: OTHER_CATEGORY.name });
    fireEvent.change(screen.getByLabelText(/move to category/i), {
      target: { value: OTHER_CATEGORY._id }
    });
    fireEvent.click(screen.getByRole('button', { name: /^move$/i }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(onMoved).not.toHaveBeenCalled();
    expect(await screen.findByText(/error moving thread/i)).toBeInTheDocument();
  });
});
