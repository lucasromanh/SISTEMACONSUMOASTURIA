import { AppRouter } from './routes/AppRouter';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
