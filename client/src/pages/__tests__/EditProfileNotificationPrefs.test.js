import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import EditProfile from '../EditProfile';
import Alert from '../../components/layout/Alert';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  put: jest.fn()
}));

const TEST_USER = {
  _id: '000000000000000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  notificationPrefs: { digest: 'weekly' }
};

const renderEditProfile = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <Alert />
        <MemoryRouter>
          <EditProfile />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

describe('EditProfile notification preferences', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.put.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    axios.get.mockImplementation(url => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: TEST_USER } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('preselects the signed-in user\'s current digest preference', async () => {
    renderEditProfile();

    await screen.findByDisplayValue('Ada Lovelace');
    const select = screen.getByLabelText('Weekly digest email');
    expect(select.value).toBe('weekly');
  });

  it('saves the new preference when the toggle changes', async () => {
    axios.put.mockResolvedValue({ data: { success: true, data: { digest: 'off' } } });

    renderEditProfile();

    await screen.findByDisplayValue('Ada Lovelace');
    const select = screen.getByLabelText('Weekly digest email');
    fireEvent.change(select, { target: { value: 'off' } });

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/users/notification-prefs', { digest: 'off' })
    );
    expect(select.value).toBe('off');
    await screen.findByText('Notification preference saved');
  });

  it('reverts the toggle and shows an error when the save fails', async () => {
    axios.put.mockRejectedValue(new Error('network error'));

    renderEditProfile();

    await screen.findByDisplayValue('Ada Lovelace');
    const select = screen.getByLabelText('Weekly digest email');
    fireEvent.change(select, { target: { value: 'off' } });

    await screen.findByText('Failed to save notification preference');
    await waitFor(() => expect(select.value).toBe('weekly'));
  });
});
