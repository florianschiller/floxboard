// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from './themeContext';

function TestComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        Set System
      </button>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
    </div>
  );
}

describe('ThemeContext & ThemeProvider', () => {
  let matchMediaListeners: Array<(e: any) => void> = [];
  let matchesDark = false;
  let mockStore: Record<string, string> = {};

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    matchMediaListeners = [];
    matchesDark = false;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: (fn: any) => matchMediaListeners.push(fn),
      removeListener: (fn: any) => {
        matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
      },
      addEventListener: (type: string, fn: any) => {
        if (type === 'change') matchMediaListeners.push(fn);
      },
      removeEventListener: (type: string, fn: any) => {
        if (type === 'change') {
          matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
        }
      },
      dispatchEvent: vi.fn(),
    }));
  });

  it('provides default fallback values when useTheme is used outside of ThemeProvider', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('current-theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
  });

  it('initializes with default system theme and sets document classes', () => {
    matchesDark = false;
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('detects dark mode when OS prefers-color-scheme is dark in system mode', () => {
    matchesDark = true;
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('switches themes and persists choice to localStorage', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Switch to dark
    act(() => {
      screen.getByTestId('set-dark').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('floxboard-theme')).toBe('dark');

    // Switch back to light
    act(() => {
      screen.getByTestId('set-light').click();
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('floxboard-theme')).toBe('light');
  });

  it('toggleTheme switches between dark and light', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');

    act(() => {
      screen.getByTestId('toggle-theme').click();
    });

    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      screen.getByTestId('toggle-theme').click();
    });

    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reacts dynamically to OS prefers-color-scheme changes when in system mode', () => {
    matchesDark = false;
    render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Simulate system preference changing to dark
    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
