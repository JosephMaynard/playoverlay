import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard/Dashboard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = createRoot(rootElement);
root.render(<Dashboard />);
