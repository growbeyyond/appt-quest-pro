import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardReminders } from "@/components/DashboardReminders";
import { BranchSelector } from "@/components/BranchSelector";
import {
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Plus,
  UserPlus,
  TrendingUp,
  Activity,
  CheckCircle,
  Building2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

const Dashboard = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingFollowups: 0,
    totalPatients: 0,
    completedToday: 0,
    checkedInToday: 0,
    monthlyRevenue: 0,
    activeUsers: 0,
    branchCount: 0,
    avgWaitTime: 0,
    newPatientsThisMonth: 0,
  });
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedBranch]);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Build branch filter
      const branchFilter = selectedBranch !== "all" ? selectedBranch : null;

      // Get today's appointments
      let apptQuery = supabase
        .from("appointments")
        .select(`
          *,
          patients (first_name, last_name, phone, photo_thumbnail_url)
        `)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });
      
      if (branchFilter) {
        apptQuery = apptQuery.eq("branch_id", branchFilter);
      }

      const { data: apptData } = await apptQuery;
      setAppointments(apptData || []);

      // Get pending follow-ups
      let followupQuery = supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .eq("status", "pending")
        .lte("followup_date", today)
        .order("followup_date", { ascending: true })
        .limit(5);

      if (branchFilter) {
        followupQuery = followupQuery.eq("branch_id", branchFilter);
      }

      const { data: followupData } = await followupQuery;
      setFollowups(followupData || []);

      // Get stats with branch filter
      let apptCountQuery = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today);
      if (branchFilter) apptCountQuery = apptCountQuery.eq("branch_id", branchFilter);
      const { count: apptCount } = await apptCountQuery;

      let followupCountQuery = supabase
        .from("followups")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (branchFilter) followupCountQuery = followupCountQuery.eq("branch_id", branchFilter);
      const { count: followupCount } = await followupCountQuery;

      let patientCountQuery = supabase
        .from("patients")
        .select("*", { count: "exact", head: true });
      if (branchFilter) patientCountQuery = patientCountQuery.eq("branch_id", branchFilter);
      const { count: patientCount } = await patientCountQuery;

      let completedCountQuery = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today)
        .eq("status", "completed");
      if (branchFilter) completedCountQuery = completedCountQuery.eq("branch_id", branchFilter);
      const { count: completedCount } = await completedCountQuery;

      let checkedInCountQuery = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today)
        .eq("status", "checked_in");
      if (branchFilter) checkedInCountQuery = checkedInCountQuery.eq("branch_id", branchFilter);
      const { count: checkedInCount } = await checkedInCountQuery;

      // Get new patients this month
      let newPatientsQuery = supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);
      if (branchFilter) newPatientsQuery = newPatientsQuery.eq("branch_id", branchFilter);
      const { count: newPatientsCount } = await newPatientsQuery;

      // Get active users count
      const { count: activeUsersCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });

      // Get branch count
      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Calculate average wait time from today's completed appointments
      let waitTimeQuery = supabase
        .from("appointments")
        .select("checked_in_at, consultation_started_at")
        .eq("appointment_date", today)
        .eq("status", "completed")
        .not("checked_in_at", "is", null)
        .not("consultation_started_at", "is", null);
      if (branchFilter) waitTimeQuery = waitTimeQuery.eq("branch_id", branchFilter);
      const { data: waitTimeData } = await waitTimeQuery;

      let avgWaitTime = 0;
      if (waitTimeData && waitTimeData.length > 0) {
        const totalWait = waitTimeData.reduce((acc, appt) => {
          const checkedIn = new Date(appt.checked_in_at);
          const consultStarted = new Date(appt.consultation_started_at);
          return acc + differenceInMinutes(consultStarted, checkedIn);
        }, 0);
        avgWaitTime = Math.round(totalWait / waitTimeData.length);
      }

      setStats({
        todayAppointments: apptCount || 0,
        pendingFollowups: followupCount || 0,
        totalPatients: patientCount || 0,
        completedToday: completedCount || 0,
        checkedInToday: checkedInCount || 0,
        monthlyRevenue: 0,
        activeUsers: activeUsersCount || 0,
        branchCount: branchCount || 0,
        avgWaitTime,
        newPatientsThisMonth: newPatientsCount || 0,
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

  const renderAdminDashboard = () => (
    <>
      {/* Admin Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultations done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingFollowups}</div>
            <p className="text-xs text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Appointments</span>
                <span className="font-medium">{stats.todayAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Patients</span>
                <span className="font-medium">{stats.newPatientsThisMonth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-medium">₹{stats.monthlyRevenue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-medium">{stats.activeUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Branches</span>
                <span className="font-medium">{stats.branchCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Wait Time</span>
                <span className="font-medium">{stats.avgWaitTime > 0 ? `${stats.avgWaitTime} min` : "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Reminders */}
      <DashboardReminders />

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
                      {followup.patients?.first_name} {followup.patients?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{followup.reason}</p>
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
    </>
  );

  const renderDoctorDashboard = () => (
    <>
      {/* Doctor Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultations done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingFollowups}</div>
            <p className="text-xs text-muted-foreground mt-1">Require attention</p>
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
                      {getPatientInitials(appt.patients?.first_name, appt.patients?.last_name)}
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
                  <div className="flex items-center gap-2">{getStatusBadge(appt.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderReceptionistDashboard = () => {
    const scheduledAppointments = appointments.filter((appt) => appt.status === "scheduled");
    const checkedInAppointments = appointments.filter((appt) => appt.status === "checked_in");

    return (
      <>
        {/* Receptionist Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkedInToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Patients waiting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingFollowups}</div>
              <p className="text-xs text-muted-foreground mt-1">To contact</p>
            </CardContent>
          </Card>
        </div>

        {/* Check-ins Needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledAppointments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">All patients checked in</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-warning text-warning-foreground">
                        {getPatientInitials(appt.patients?.first_name, appt.patients?.last_name)}
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
                    <Button size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/appointments/${appt.id}`);
                    }}>
                      Check In
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checked In Patients */}
        {checkedInAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waiting Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkedInAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-success text-success-foreground">
                        {getPatientInitials(appt.patients?.first_name, appt.patients?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {appt.patients?.first_name} {appt.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Checked in at {appt.checked_in_at ? format(new Date(appt.checked_in_at), "HH:mm") : "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Waiting
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointment Reminders */}
        <DashboardReminders />
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              {userRole === "admin" && "Clinic overview and analytics"}
              {userRole === "doctor" && "Your appointments and schedule"}
              {userRole === "receptionist" && "Patient check-ins and follow-ups"}
              {!userRole && "Welcome back!"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BranchSelector 
              value={selectedBranch} 
              onChange={setSelectedBranch} 
              showAll={true}
            />
            {(userRole === "receptionist" || userRole === "admin") && (
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
            )}
          </div>
        </div>

        {/* Role-based Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {userRole === "admin" && renderAdminDashboard()}
            {userRole === "doctor" && renderDoctorDashboard()}
            {userRole === "receptionist" && renderReceptionistDashboard()}
            {!userRole && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No role assigned. Please contact an administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
