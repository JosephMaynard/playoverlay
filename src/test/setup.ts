import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
// Side-effect import: initializes the shared i18next instance once for the
// whole test run, the same way App.tsx/DisplayApp.tsx do before rendering.
// Without this, any component using useTranslation() would render raw
// "namespace.key" strings instead of the seeded English text.
import i18n from '../i18n';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  // A test that exercises language propagation (e.g. i18n.changeLanguage)
  // must not leak its choice into the next test file's assertions.
  if (i18n.language !== 'en') {
    void i18n.changeLanguage('en');
  }
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

HTMLElement.prototype.scrollIntoView = vi.fn();
