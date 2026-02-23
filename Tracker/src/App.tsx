import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
// import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const isMaintenanceMode = true; // Maintenance mode toggle

const RootRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/auth${location.search}${location.hash}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {isMaintenanceMode ? (
              <Route path="*" element={<Maintenance />} />
            ) : (
              <>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/friends" element={<Friends />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
