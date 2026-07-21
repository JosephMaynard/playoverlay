import { createRoot } from 'react-dom/client';
import './i18n';
import Display from './components/Display/Display';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = createRoot(rootElement);
root.render(<Display />);
