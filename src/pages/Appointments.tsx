import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClipboardList, Plus, MessageCircle, UserCheck, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CheckInDialog } from "@/components/CheckInDialog";
import { NoShowDialog } from "@/components/NoShowDialog";

const Appointments = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInDialog, setCheckInDialog] = useState<{
    open: boolean;
    appointmentId: string;
    patientName: string;
  }>({ open: false, appointmentId: "", patientName: "" });
  const [noShowDialog, setNoShowDialog] = useState<{
    open: boolean;
    appointmentId: string;
    patientId: string;
    patientName: string;
    branchId: string;
  }>({ open: false, appointmentId: "", patientId: "", patientName: "", branchId: "" });
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(50);

      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: "bg-info/10 text-info",
      checked_in: "bg-warning/10 text-warning",
      in_consultation: "bg-secondary/10 text-secondary",
      completed: "bg-success/10 text-success",
      no_show: "bg-destructive/10 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const sendWhatsAppMessage = (phone: string, appointment: any) => {
    const message = `Hi ${appointment.patients.first_name}, this is a reminder about your appointment on ${format(new Date(appointment.appointment_date), 'MMM d')} at ${appointment.appointment_time}. Please arrive 10 minutes early. Reply CONFIRM to confirm.`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openCheckInDialog = (appointment: any) => {
    setCheckInDialog({
      open: true,
      appointmentId: appointment.id,
      patientName: `${appointment.patients.first_name} ${appointment.patients.last_name}`,
    });
  };

  const openNoShowDialog = (appointment: any) => {
    setNoShowDialog({
      open: true,
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      patientName: `${appointment.patients.first_name} ${appointment.patients.last_name}`,
      branchId: appointment.branch_id,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">
              View and manage all appointments
            </p>
          </div>
          <Button onClick={() => navigate("/appointments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              All Appointments ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading appointments...
              </p>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No appointments yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Schedule your first appointment to get started
                </p>
              </div>
            ) : (
                <div className="space-y-4">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigate(`/appointments/${appt.id}`)}
                    >
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getPatientInitials(
                          appt.patients?.first_name,
                          appt.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/appointments/${appt.id}`)}
                    >
                      <p className="font-medium">
                        {appt.patients?.first_name} {appt.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appt.appointment_date), "MMM dd, yyyy")} at{" "}
                        {appt.appointment_time} • {appt.duration_minutes} mins
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appt.status)}
                      {appt.status === 'scheduled' && (
                        <>
                          <Button
                            size="icon"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckInDialog(appt);
                            }}
                            title="Check in patient"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNoShowDialog(appt);
                            }}
                            title="Mark as no-show"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(appt.status === 'checked_in' || appt.status === 'in_consultation') && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNoShowDialog(appt);
                          }}
                          title="Mark as no-show"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsAppMessage(appt.patients?.phone, appt);
                        }}
                        disabled={!appt.patients?.phone}
                        title="Send WhatsApp message"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CheckInDialog
        appointmentId={checkInDialog.appointmentId}
        patientName={checkInDialog.patientName}
        open={checkInDialog.open}
        onOpenChange={(open) => setCheckInDialog({ ...checkInDialog, open })}
      />

      <NoShowDialog
        appointmentId={noShowDialog.appointmentId}
        patientId={noShowDialog.patientId}
        patientName={noShowDialog.patientName}
        branchId={noShowDialog.branchId}
        open={noShowDialog.open}
        onOpenChange={(open) => setNoShowDialog({ ...noShowDialog, open })}
        onSuccess={loadAppointments}
      />
    </DashboardLayout>
  );
};

export default Appointments;
