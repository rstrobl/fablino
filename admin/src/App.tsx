import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AudioProvider } from './audioContext';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Stories } from './pages/Stories';
import { StoryDetail } from './pages/StoryDetail';
import { Waitlist } from './pages/Waitlist';
import { Generator } from './pages/Generator';
import { Voices } from './pages/Voices';
import { SettingsPage } from './pages/SettingsPage';
import Login from './pages/Login';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Login />;

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#252538', color: '#e2e8f0', border: '1px solid #3a3a4e' } }} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:id" element={<StoryDetail />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/generate" element={<Generator />} />
          <Route path="/voices" element={<Voices />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AudioProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AudioProvider>
    </QueryClientProvider>
  );
}
