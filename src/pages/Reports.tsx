import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const Reports = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    monthlyAppointments: 0,
    completedAppointments: 0,
    pendingFollowups: 0,
    averageWaitTime: 0,
    noShowRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      // Total patients
      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      // Monthly appointments
      const { count: monthlyApptCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd);

      // Completed appointments this month
      const { count: completedCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd);

      // Pending follow-ups
      const { count: followupCount } = await supabase
        .from("followups")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // No-show appointments this month
      const { count: noShowCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "no_show")
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd);

      const noShowRate = monthlyApptCount
        ? ((noShowCount || 0) / monthlyApptCount) * 100
        : 0;

      setStats({
        totalPatients: patientCount || 0,
        monthlyAppointments: monthlyApptCount || 0,
        completedAppointments: completedCount || 0,
        pendingFollowups: followupCount || 0,
        averageWaitTime: 0, // Placeholder
        noShowRate: Math.round(noShowRate),
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            View clinic performance and analytics
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">Loading reports...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPatients}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registered in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Monthly Appointments
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.monthlyAppointments}</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed Appointments
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedAppointments}</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                  <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.noShowRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Wait Time</CardTitle>
                  <Clock className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-lg font-bold">
                      {stats.monthlyAppointments > 0
                        ? Math.round(
                            (stats.completedAppointments / stats.monthlyAppointments) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm font-medium">Patient Retention</span>
                    <span className="text-lg font-bold">—</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium">Average Consultation Time</span>
                    <span className="text-lg font-bold">—</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
