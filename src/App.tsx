import * as Sentry from '@sentry/electron/renderer';
import { init as reactInit } from '@sentry/react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard/Dashboard';

// Crash reporting is opt-in: builds without SENTRY_DSN send nothing.
// The renderer inherits the DSN from the main process.
if (__SENTRY_DSN__) {
  Sentry.init(
    {
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,

      // Capture Replay for 10% of all sessions,
      // plus for 100% of sessions with an error
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    },
    reactInit
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Dashboard />);
