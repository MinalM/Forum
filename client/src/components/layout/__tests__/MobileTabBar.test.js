import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import MobileTabBar from '../MobileTabBar';
import Alert from '../Alert';
import { AlertProvider } from '../../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const renderTabBar = (initialEntries = ['/']) =>
  render(
    <AlertProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Alert />
        <MobileTabBar />
      </MemoryRouter>
    </AlertProvider>
  );

beforeEach(() => {
  axios.get.mockReset();
  axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 0 } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MobileTabBar', () => {
  it('renders all five tabs with their links', () => {
    renderTabBar();

    expect(screen.getByRole('link', { name: /Feed/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Answer/ })).toHaveAttribute(
      'href',
      '/?feed=unanswered'
    );
    expect(screen.getByRole('link', { name: /Ask a question/ })).toHaveAttribute(
      'href',
      '/create-post'
    );
    expect(screen.getByRole('button', { name: /Saved/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /You/ })).toHaveAttribute('href', '/dashboard');
  });

  it('fetches and shows the unanswered count as a badge on the Answer tab', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 5 } });
    renderTabBar();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('feed=unanswered')
      );
    });

    expect(await screen.findByText('5')).toBeInTheDocument();
  });

  it('does not show a badge when there are no unanswered posts', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 0 } });
    renderTabBar();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('marks Feed active on "/" with no query', () => {
    renderTabBar(['/']);
    expect(screen.getByRole('link', { name: /Feed/ })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /Answer/ })).not.toHaveClass('active');
  });

  it('marks Answer active on "/?feed=unanswered"', () => {
    renderTabBar(['/?feed=unanswered']);
    expect(screen.getByRole('link', { name: /Answer/ })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /Feed/ })).not.toHaveClass('active');
  });

  it('marks Ask active on "/create-post"', () => {
    renderTabBar(['/create-post']);
    expect(screen.getByRole('link', { name: /Ask a question/ })).toHaveClass('active');
  });

  it('marks You active on "/dashboard"', () => {
    renderTabBar(['/dashboard']);
    expect(screen.getByRole('link', { name: /You/ })).toHaveClass('active');
  });

  it('shows a "coming soon" alert instead of navigating when Saved is tapped', async () => {
    const user = userEvent.setup();
    renderTabBar();

    await user.click(screen.getByRole('button', { name: /Saved/ }));

    expect(await screen.findByText(/coming soon/i)).toBeInTheDocument();
  });

  it('stops polling for the unanswered count after unmount', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const { unmount } = renderTabBar();

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    unmount();

    jest.advanceTimersByTime(120000);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
