import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import Queue from "./pages/Queue";
import Followups from "./pages/Followups";
import Waitlist from "./pages/Waitlist";
import PrescriptionTemplates from "./pages/PrescriptionTemplates";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import BranchManagement from "./pages/BranchManagement";
import AuditLogs from "./pages/AuditLogs";
import PatientPortal from "./pages/PatientPortal";
import RescheduleRequests from "./pages/RescheduleRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/appointments/new" element={<AppointmentDetail />} />
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/followups" element={<Followups />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/prescription-templates" element={<PrescriptionTemplates />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/branches" element={<BranchManagement />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/patient-portal" element={<PatientPortal />} />
          <Route path="/reschedule-requests" element={<RescheduleRequests />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
