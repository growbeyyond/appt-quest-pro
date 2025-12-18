import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
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
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Setup />} />
          <Route path="/patient-portal" element={<PatientPortal />} />

          {/* Protected routes - All authenticated users */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/appointments/new" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
          <Route path="/appointments/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute><Queue /></ProtectedRoute>} />
          <Route path="/followups" element={<ProtectedRoute><Followups /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Receptionist & Admin routes */}
          <Route path="/waitlist" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><Waitlist /></ProtectedRoute>} />
          <Route path="/reschedule-requests" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><RescheduleRequests /></ProtectedRoute>} />

          {/* Doctor & Admin routes */}
          <Route path="/prescription-templates" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><PrescriptionTemplates /></ProtectedRoute>} />

          {/* Admin-only routes */}
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><Reports /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
          <Route path="/branches" element={<ProtectedRoute allowedRoles={["admin"]}><BranchManagement /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={["admin"]}><AuditLogs /></ProtectedRoute>} />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
