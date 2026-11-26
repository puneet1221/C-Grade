import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { CommandPalette } from './components/layout/CommandPalette.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { Navbar } from './components/layout/Navbar.jsx';
import { EmptyState } from './components/ui/EmptyState.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { ExplorePage } from './pages/ExplorePage.jsx';
import { FeedPage } from './pages/FeedPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ListDetailPage } from './pages/ListDetailPage.jsx';
import { ListsPage } from './pages/ListsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MovieDetailPage } from './pages/MovieDetailPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Root C-Grade application shell configuring TanStack Query, AuthContext,
 * React Router v7 routes, Command Palette, and glassmorphic Sonner toasts.
 */
export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-[#09090B] text-[#FAFAFA]">
            <Navbar onOpenSearch={() => setSearchOpen(true)} />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/movies/:slug" element={<MovieDetailPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/lists/:slug" element={<ListDetailPage />} />
                <Route path="/u/:username" element={<ProfilePage />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                <Route
                  path="/feed"
                  element={
                    <ProtectedRoute>
                      <FeedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="mx-auto max-w-2xl px-4 py-20">
                      <EmptyState
                        icon={Film}
                        title="Scene Not Found"
                        description="The reel you are looking for does not exist or has been moved."
                        actionLabel="Back to Home"
                        actionTo="/"
                      />
                    </div>
                  }
                />
              </Routes>
            </main>
            <Footer />

            <CommandPalette
              open={searchOpen}
              onClose={(action) => setSearchOpen((prev) => (action === 'toggle' ? !prev : false))}
            />

            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'rgba(24, 24, 27, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FAFAFA',
                  backdropFilter: 'blur(16px)',
                },
              }}
            />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
