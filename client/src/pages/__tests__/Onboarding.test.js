import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import Onboarding from '../Onboarding';
import { AlertProvider } from '../../context/AlertContext';

let mockUser;
const mockUpdateProfile = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateProfile: mockUpdateProfile })
}));

const renderOnboarding = () =>
  render(
    <AlertProvider>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<div>Feed page</div>} />
        </Routes>
      </MemoryRouter>
    </AlertProvider>
  );

describe('Onboarding chip selection', () => {
  beforeEach(() => {
    mockUser = { _id: 'u1', onboardingCompleted: false };
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('marks a role chip active when clicked, and swaps to a newly clicked one', () => {
    renderOnboarding();

    const mlEngineer = screen.getByRole('button', { name: 'ML Engineer' });
    const research = screen.getByRole('button', { name: 'Research' });

    expect(mlEngineer).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(mlEngineer);
    expect(mlEngineer).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(research);
    expect(research).toHaveAttribute('aria-pressed', 'true');
    expect(mlEngineer).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a skill chip active and back off on repeated clicks', () => {
    renderOnboarding();

    const python = screen.getByRole('button', { name: 'Python' });
    expect(python).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(python);
    expect(python).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(python);
    expect(python).toHaveAttribute('aria-pressed', 'false');
  });

  it('allows selecting more than one skill', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'Python' }));
    fireEvent.click(screen.getByRole('button', { name: 'SQL' }));

    expect(screen.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'SQL' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Onboarding "Nothing yet" is mutually exclusive', () => {
  beforeEach(() => {
    mockUser = { _id: 'u1', onboardingCompleted: false };
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('clears any chosen skills when "Nothing yet" is picked', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'Python' }));
    fireEvent.click(screen.getByRole('button', { name: 'SQL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nothing yet' }));

    expect(screen.getByRole('button', { name: 'Nothing yet' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'SQL' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('deselects "Nothing yet" when a real skill is picked afterwards', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'Nothing yet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Python' }));

    expect(screen.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nothing yet' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Onboarding feed preview', () => {
  beforeEach(() => {
    mockUser = { _id: 'u1', onboardingCompleted: false };
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('shows a placeholder before any track is picked', () => {
    renderOnboarding();
    expect(screen.getByText('Pick a track above to preview your feed.')).toBeInTheDocument();
  });

  it('renders preview posts once a role is picked, and updates when the role changes', () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'ML Engineer' }));
    expect(
      screen.getByText('Transitioning from Data Analysis to ML Engineering')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Research' }));
    expect(
      screen.queryByText('Transitioning from Data Analysis to ML Engineering')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Reading papers without a maths background — a route in')
    ).toBeInTheDocument();
  });
});

describe('Onboarding skip', () => {
  beforeEach(() => {
    mockUser = { _id: 'u1', onboardingCompleted: false };
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('marks onboarding complete without setting targetRole/skills, and goes to the feed', async () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'ML Engineer' }));
    fireEvent.click(
      screen.getByRole('button', { name: /^Skip/ })
    );

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ onboardingCompleted: true });
    });
    await screen.findByText('Feed page');
  });
});

describe('Onboarding submit', () => {
  beforeEach(() => {
    mockUser = { _id: 'u1', onboardingCompleted: false };
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(true);
  });

  it('persists the picked role and skills, then goes to the feed', async () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'Data Scientist' }));
    fireEvent.click(screen.getByRole('button', { name: 'pandas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show my feed' }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        onboardingCompleted: true,
        skills: ['pandas'],
        targetRole: 'Data Scientist'
      });
    });
    await screen.findByText('Feed page');
  });

  it('still saves and moves on when nothing was picked', async () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole('button', { name: 'Show my feed' }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        onboardingCompleted: true,
        skills: []
      });
    });
    await screen.findByText('Feed page');
  });
});

describe('Onboarding does not reappear once completed', () => {
  it('redirects straight to the feed for a user who already completed it', async () => {
    mockUser = { _id: 'u1', onboardingCompleted: true };
    mockUpdateProfile.mockReset();

    renderOnboarding();

    await screen.findByText('Feed page');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
