// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import LandingPage from './LandingPage';
import { ThemeProvider } from '@/lib/themeContext';
import * as authLib from '@/lib/auth';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

describe('LandingPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders sign in button when unauthenticated and triggers login', () => {
    const loginMock = vi.fn();
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      login: loginMock,
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Visual collaboration, simplified for everyone/i)).toBeDefined();
    expect(screen.getByText(/Simple, transparent pricing/i)).toBeDefined();
    const signInButtons = screen.getAllByRole('button', { name: /Sign In/i });
    expect(signInButtons.length).toBeGreaterThan(0);

    fireEvent.click(signInButtons[0]);
    expect(loginMock).toHaveBeenCalledTimes(1);
  });

  it('automatically redirects authenticated user to /board', () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: {
        profile: {
          sub: '123',
          preferred_username: 'alice',
          email: 'alice@floxboard.io',
        },
      } as any,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/board" element={<div>Board Page Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Board Page Target')).toBeDefined();
  });

  it('restores saved post auth action from sessionStorage and navigates with query params', () => {
    sessionStorage.setItem('flox_post_auth_action', JSON.stringify({
      returnTo: '/board/board-123',
      openModal: 'account',
      tab: 'profile'
    }));

    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: {
        profile: {
          sub: '123',
          preferred_username: 'alice',
          email: 'alice@floxboard.io',
        },
      } as any,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/board/board-123" element={<div>Specific Board Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Specific Board Target')).toBeDefined();
    expect(sessionStorage.getItem('flox_post_auth_action')).toBeNull();
  });

  it('restores saved returnTo URL with modal and tab parameters for access request emails', () => {
    sessionStorage.setItem('flox_post_auth_action', JSON.stringify({
      returnTo: '/board/c50813cd-ffc1-4a1e-8ba6-7ad4ce7da087?modal=share&tab=requests',
    }));

    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: {
        profile: {
          sub: '123',
          preferred_username: 'alice',
          email: 'alice@floxboard.io',
        },
      } as any,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/board/:id" element={<div>Target Board with Share Modal</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Target Board with Share Modal')).toBeDefined();
    expect(sessionStorage.getItem('flox_post_auth_action')).toBeNull();
  });

  it('renders theme toggle button in navigation header and toggles theme', () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    render(
      <ThemeProvider defaultTheme="light">
        <MemoryRouter initialEntries={['/']}>
          <LandingPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('landing-theme-toggle-btn');
    expect(toggleBtn).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
