import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Plus,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingFollowups: 0,
    totalPatients: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Get today's appointments
      const { data: apptData } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (first_name, last_name, phone, photo_thumbnail_url)
        `)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });

      setAppointments(apptData || []);

      // Get pending follow-ups
      const { data: followupData } = await supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .eq("status", "pending")
        .lte("followup_date", today)
        .order("followup_date", { ascending: true })
        .limit(5);

      setFollowups(followupData || []);

      // Get stats
      const { count: apptCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today);

      const { count: followupCount } = await supabase
        .from("followups")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      setStats({
        todayAppointments: apptCount || 0,
        pendingFollowups: followupCount || 0,
        totalPatients: patientCount || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's today's overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/patients/new")}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Patient
            </Button>
            <Button onClick={() => navigate("/appointments/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Follow-ups
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingFollowups}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patients
              </CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered patients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No appointments today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getPatientInitials(
                          appt.patients?.first_name,
                          appt.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {appt.patients?.first_name} {appt.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appt.appointment_time} • {appt.duration_minutes} mins
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appt.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        {followups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Pending Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {followups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-warning text-warning-foreground">
                        {getPatientInitials(
                          followup.patients?.first_name,
                          followup.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {followup.patients?.first_name}{" "}
                        {followup.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {followup.reason}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-warning">
                      {format(new Date(followup.followup_date), "MMM dd")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
