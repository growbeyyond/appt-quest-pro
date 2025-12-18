import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface PatientAppointmentHistoryProps {
  patientId: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  duration_minutes: number;
  branches: { name: string } | null;
}

export const PatientAppointmentHistory = ({ patientId }: PatientAppointmentHistoryProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, [patientId]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, branches(name)")
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success";
      case "scheduled":
        return "bg-primary/10 text-primary";
      case "checked_in":
        return "bg-warning/10 text-warning";
      case "in_consultation":
        return "bg-info/10 text-info";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      case "no_show":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "new":
        return "New Visit";
      case "follow_up":
        return "Follow-up";
      case "procedure":
        return "Procedure";
      case "teleconsult":
        return "Teleconsult";
      default:
        return type;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const upcomingAppointments = appointments.filter(
    (a) => new Date(`${a.appointment_date}T${a.appointment_time}`) >= new Date() && a.status === "scheduled"
  );

  const pastAppointments = appointments.filter(
    (a) => new Date(`${a.appointment_date}T${a.appointment_time}`) < new Date() || a.status !== "scheduled"
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment History ({appointments.length})
          </CardTitle>
          <Button onClick={() => navigate("/appointments/new?patient=" + patientId)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule an appointment to get started
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingAppointments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-primary">Upcoming Appointments</h3>
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
                        onClick={() => navigate(`/appointments/${appointment.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold">
                              {format(new Date(appointment.appointment_date), "dd")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appointment.appointment_date), "MMM")}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{formatTime(appointment.appointment_time)}</span>
                              <Badge variant="outline">{getTypeLabel(appointment.appointment_type)}</Badge>
                            </div>
                            {appointment.branches && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {appointment.branches.name}
                              </div>
                            )}
                            {appointment.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{appointment.reason}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-muted-foreground">Past Appointments</h3>
                  <div className="space-y-2">
                    {pastAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/appointments/${appointment.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[40px]">
                            <p className="font-medium">
                              {format(new Date(appointment.appointment_date), "dd")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appointment.appointment_date), "MMM yy")}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{formatTime(appointment.appointment_time)}</span>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm">{getTypeLabel(appointment.appointment_type)}</span>
                            </div>
                            {appointment.branches && (
                              <p className="text-xs text-muted-foreground">{appointment.branches.name}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
