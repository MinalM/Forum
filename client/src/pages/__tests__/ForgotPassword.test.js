import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import ForgotPassword from '../ForgotPassword';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

const renderPage = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const submitEmail = async (email) => {
  await userEvent.type(screen.getByLabelText(/email address/i), email);
  await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
};

describe('ForgotPassword document title and heading', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
    axios.post.mockReset();
  });

  it('sets the document title and a level-1 heading', async () => {
    renderPage();

    await screen.findByLabelText(/email address/i);
    expect(document.title).toBe('Forgot Password | AI/ML Career Forum');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/forgot password/i);
  });
});

describe('ForgotPassword request-reset form', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
    axios.post.mockReset();
  });

  it('submits the email to the forgot-password endpoint', async () => {
    axios.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderPage();

    await submitEmail('known@example.com');

    expect(axios.post).toHaveBeenCalledWith('/api/users/forgotpassword', {
      email: 'known@example.com'
    });
  });

  it('shows the generic confirmation when the API reports success', async () => {
    axios.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderPage();

    await submitEmail('known@example.com');

    expect(
      await screen.findByText(/if an account exists for that email/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('shows the same generic confirmation even when the request fails', async () => {
    axios.post.mockRejectedValue({ response: { status: 500, data: { error: 'boom' } } });
    renderPage();

    await submitEmail('unknown@example.com');

    expect(
      await screen.findByText(/if an account exists for that email/i)
    ).toBeInTheDocument();
  });
});
