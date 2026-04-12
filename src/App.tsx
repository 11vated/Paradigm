import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import LandingPage from "@/pages/LandingPage";
import StudioPage from "@/pages/StudioPage";
import AuthPage from "@/pages/AuthPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <StudioPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
