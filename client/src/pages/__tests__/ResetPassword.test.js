import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import ResetPassword from '../ResetPassword';
import Login from '../Login';
import Alert from '../../components/layout/Alert';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn()
}));

const renderAtToken = (token = 'sometoken123') =>
  render(
    <AuthProvider>
      <AlertProvider>
        <Alert />
        <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
          <Routes>
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const fillAndSubmit = async (password, confirm) => {
  await userEvent.type(screen.getByLabelText(/^new password$/i), password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm);
  await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
};

describe('ResetPassword document title and heading', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
    axios.put.mockReset();
  });

  it('sets the document title and a level-1 heading', async () => {
    renderAtToken();

    await screen.findByLabelText(/^new password$/i);
    expect(document.title).toBe('Reset Password | AI/ML Career Forum');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/reset password/i);
  });
});

describe('ResetPassword submit flow', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
    axios.put.mockReset();
  });

  it('submits the new password to the reset endpoint using the URL token', async () => {
    axios.put.mockResolvedValue({ data: { success: true, token: 'jwt123' } });
    renderAtToken('abc123');

    await fillAndSubmit('newSecret1', 'newSecret1');

    expect(axios.put).toHaveBeenCalledWith('/api/users/resetpassword/abc123', {
      password: 'newSecret1'
    });
  });

  it('redirects to login with a success message on 200', async () => {
    axios.put.mockResolvedValue({ data: { success: true, token: 'jwt123' } });
    renderAtToken();

    await fillAndSubmit('newSecret1', 'newSecret1');

    expect(
      await screen.findByText('Sign in to your AI/ML Career Forum account')
    ).toBeInTheDocument();
    expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
  });

  it('shows an inline invalid/expired error on 400 instead of navigating', async () => {
    axios.put.mockRejectedValue({
      response: { status: 400, data: { error: 'Invalid or expired token' } }
    });
    renderAtToken();

    await fillAndSubmit('newSecret1', 'newSecret1');

    expect(await screen.findByText(/invalid or expired link/i)).toBeInTheDocument();
    expect(
      screen.queryByText('Sign in to your AI/ML Career Forum account')
    ).not.toBeInTheDocument();
  });

  it('shows a mismatch message without calling the API when passwords differ', async () => {
    renderAtToken();

    await fillAndSubmit('newSecret1', 'differentSecret');

    expect(axios.put).not.toHaveBeenCalled();
  });
});
