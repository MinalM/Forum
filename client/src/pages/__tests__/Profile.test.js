import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import Profile from '../Profile';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const PROFILE_USER_ID = '000000000000000000000001';

describe('Profile document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    axios.get.mockImplementation((url) => {
      if (url === `/api/users/${PROFILE_USER_ID}/profile`) {
        return Promise.resolve({
          data: { data: { _id: PROFILE_USER_ID, name: 'Grace Hopper', role: 'user' } }
        });
      }
      if (url === `/api/users/${PROFILE_USER_ID}/posts`) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('sets the document title to the profile user\'s name once loaded', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter initialEntries={[`/profile/${PROFILE_USER_ID}`]}>
            <Routes>
              <Route path="/profile/:id" element={<Profile />} />
            </Routes>
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Grace Hopper');
    expect(document.title).toBe('Grace Hopper | AI/ML Career Forum');
  });
});

describe('Profile avatar', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
  });

  const renderProfileWithAvatar = (avatar) => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/users/${PROFILE_USER_ID}/profile`) {
        return Promise.resolve({
          data: { data: { _id: PROFILE_USER_ID, name: 'Grace Hopper', role: 'user', avatar } }
        });
      }
      if (url === `/api/users/${PROFILE_USER_ID}/posts`) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
    return render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter initialEntries={[`/profile/${PROFILE_USER_ID}`]}>
            <Routes>
              <Route path="/profile/:id" element={<Profile />} />
            </Routes>
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );
  };

  it('resolves the legacy bare default filename to the real default asset', async () => {
    renderProfileWithAvatar('default-avatar.jpg');

    const avatar = await screen.findByAltText('Grace Hopper');
    expect(avatar).toHaveAttribute('src', '/images/default-avatar1.png');
  });

  it('renders a real avatar URL untouched', async () => {
    renderProfileWithAvatar('https://lh3.googleusercontent.com/a/photo.jpg');

    const avatar = await screen.findByAltText('Grace Hopper');
    expect(avatar).toHaveAttribute('src', 'https://lh3.googleusercontent.com/a/photo.jpg');
  });
});
