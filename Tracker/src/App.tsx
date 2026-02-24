import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { supabase } from '@/integrations/supabase/client';
// import Index from "./pages/Index";
import Admin from './pages/Admin';
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/auth${location.search}${location.hash}`} replace />;
};

const AppRoutes = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMaintenanceState = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('is_maintenance_mode')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setIsMaintenanceMode(data?.is_maintenance_mode || false);
      } catch (err) {
        console.error("Failed to check maintenance state:", err);
        setIsMaintenanceMode(false); // Default to off if we can't reach DB
      }
    };

    checkMaintenanceState();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_settings',
          filter: 'id=eq.1',
        },
        (payload) => {
          setIsMaintenanceMode(payload.new.is_maintenance_mode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isMaintenanceMode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        {/* {isMaintenanceMode ? (
          <Route path="*" element={<Maintenance />} />
        ) : ( */}
          <>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </>
        {/* )} */}
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
