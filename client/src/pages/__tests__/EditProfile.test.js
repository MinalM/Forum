import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import EditProfile from '../EditProfile';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

describe('EditProfile document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  it('sets the document title to Edit Profile', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <EditProfile />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Update your profile information');
    expect(document.title).toBe('Edit Profile | AI/ML Career Forum');
  });
});
