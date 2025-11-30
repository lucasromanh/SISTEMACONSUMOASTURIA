import { AppRouter } from './routes/AppRouter';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}

export default App;
