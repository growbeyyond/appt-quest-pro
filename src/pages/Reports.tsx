import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, Users, CalendarCheck, DollarSign, TrendingUp, FileText, Activity, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval, startOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("thisMonth");
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    noShows: 0,
    revenue: 0,
    newPatients: 0,
    followups: 0,
    prescriptions: 0
  });
  const [appointmentsByType, setAppointmentsByType] = useState<any[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<any[]>([]);
  const [dailyAppointments, setDailyAppointments] = useState<any[]>([]);
  const [topReasons, setTopReasons] = useState<any[]>([]);
  const [patientGrowth, setPatientGrowth] = useState<any[]>([]);
  const [branchStats, setBranchStats] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "last3Months":
        start = startOfMonth(subMonths(now, 3));
        end = endOfMonth(now);
        break;
      case "last6Months":
        start = startOfMonth(subMonths(now, 6));
        end = endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd"), startDate: start, endDate: end };
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const { start, end, startDate, endDate } = getDateRangeFilter();

      // Total patients
      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      // New patients in range
      const { count: newPatientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start)
        .lte("created_at", end);

      // Patient growth data
      const { data: patientsData } = await supabase
        .from("patients")
        .select("created_at")
        .gte("created_at", format(subMonths(new Date(), 6), "yyyy-MM-dd"));

      // Calculate patient growth by month
      const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
      const growthData = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const count = patientsData?.filter(p => {
          const date = new Date(p.created_at);
          return date >= monthStart && date <= monthEnd;
        }).length || 0;
        return {
          month: format(month, "MMM yyyy"),
          patients: count,
        };
      });
      setPatientGrowth(growthData);

      // Appointments stats
      const { data: appointments, count: appointmentCount } = await supabase
        .from("appointments")
        .select("*, branches(name)", { count: "exact" })
        .gte("appointment_date", start)
        .lte("appointment_date", end);

      const completedCount = appointments?.filter(a => a.status === "completed").length || 0;
      const noShowCount = appointments?.filter(a => a.status === "no_show").length || 0;

      // Branch-wise stats
      const branchData = appointments?.reduce((acc: any, apt) => {
        const branchName = apt.branches?.name || "Unknown";
        if (!acc[branchName]) {
          acc[branchName] = { total: 0, completed: 0, noShow: 0 };
        }
        acc[branchName].total++;
        if (apt.status === "completed") acc[branchName].completed++;
        if (apt.status === "no_show") acc[branchName].noShow++;
        return acc;
      }, {});
      const branchStatsData = Object.entries(branchData || {}).map(([name, stats]: [string, any]) => ({
        name,
        total: stats.total,
        completed: stats.completed,
        noShow: stats.noShow,
      }));
      setBranchStats(branchStatsData);

      // Appointments by type
      const typeStats = appointments?.reduce((acc: any, apt) => {
        acc[apt.appointment_type] = (acc[apt.appointment_type] || 0) + 1;
        return acc;
      }, {});
      const typeData = Object.entries(typeStats || {}).map(([name, value]) => ({ name, value }));

      // Appointments by status
      const statusStats = appointments?.reduce((acc: any, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {});
      const statusData = Object.entries(statusStats || {}).map(([name, value]) => ({ name, value }));

      // Daily appointments trend
      const dailyStats = appointments?.reduce((acc: any, apt) => {
        const date = apt.appointment_date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      const dailyData = Object.entries(dailyStats || {})
        .map(([date, count]) => ({ date: format(new Date(date), "MMM dd"), count }))
        .slice(0, 30);

      // Top reasons
      const reasonStats = appointments?.reduce((acc: any, apt) => {
        if (apt.reason) {
          acc[apt.reason] = (acc[apt.reason] || 0) + 1;
        }
        return acc;
      }, {});
      const reasonData = Object.entries(reasonStats || {})
        .map(([reason, count]) => ({ reason, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      // Followups
      const { count: followupCount } = await supabase
        .from("followups")
        .select("*", { count: "exact", head: true })
        .gte("followup_date", start)
        .lte("followup_date", end);

      // Prescriptions
      const { count: prescriptionCount } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .gte("prescribed_date", start)
        .lte("prescribed_date", end);

      setStats({
        totalPatients: patientCount || 0,
        totalAppointments: appointmentCount || 0,
        completedAppointments: completedCount,
        noShows: noShowCount,
        revenue: completedCount * 1000, // Mock revenue calculation
        newPatients: newPatientCount || 0,
        followups: followupCount || 0,
        prescriptions: prescriptionCount || 0
      });

      setAppointmentsByType(typeData);
      setAppointmentsByStatus(statusData);
      setDailyAppointments(dailyData);
      setTopReasons(reasonData);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      stats,
      appointmentsByType,
      appointmentsByStatus,
      branchStats,
      patientGrowth,
    };

    const csvRows = [
      "Report Summary",
      `Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`,
      `Date Range: ${dateRange}`,
      "",
      "Key Metrics",
      `Total Patients,${stats.totalPatients}`,
      `New Patients,${stats.newPatients}`,
      `Total Appointments,${stats.totalAppointments}`,
      `Completed Appointments,${stats.completedAppointments}`,
      `No Shows,${stats.noShows}`,
      `Follow-ups,${stats.followups}`,
      `Prescriptions,${stats.prescriptions}`,
      "",
      "Branch Statistics",
      "Branch,Total,Completed,No Shows",
      ...branchStats.map(b => `${b.name},${b.total},${b.completed},${b.noShow}`),
      "",
      "Patient Growth (Last 6 Months)",
      "Month,New Patients",
      ...patientGrowth.map(p => `${p.month},${p.patients}`),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinic-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const StatCard = ({ title, value, icon: Icon, description }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your clinic performance
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
                <SelectItem value="last6Months">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={Users}
            description={`${stats.newPatients} new this period`}
          />
          <StatCard
            title="Appointments"
            value={stats.totalAppointments}
            icon={Calendar}
            description={`${stats.completedAppointments} completed`}
          />
          <StatCard
            title="No Shows"
            value={stats.noShows}
            icon={Activity}
            description={`${((stats.noShows / stats.totalAppointments) * 100 || 0).toFixed(1)}% rate`}
          />
          <StatCard
            title="Revenue"
            value={`₹${stats.revenue.toLocaleString()}`}
            icon={DollarSign}
            description="Based on completed"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Follow-ups"
            value={stats.followups}
            icon={CalendarCheck}
            description="Scheduled this period"
          />
          <StatCard
            title="Prescriptions"
            value={stats.prescriptions}
            icon={FileText}
            description="Issued this period"
          />
          <StatCard
            title="Completion Rate"
            value={`${((stats.completedAppointments / stats.totalAppointments) * 100 || 0).toFixed(1)}%`}
            icon={TrendingUp}
            description="Of scheduled appointments"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Type</CardTitle>
                  <CardDescription>Distribution of appointment types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={appointmentsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {appointmentsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Status</CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={appointmentsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Appointments Trend</CardTitle>
                <CardDescription>Number of appointments per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyAppointments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Appointment Reasons</CardTitle>
                <CardDescription>Most common reasons for visits</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topReasons} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="reason" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient Growth</CardTitle>
                <CardDescription>New patient registrations over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="patients" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Branch Performance</CardTitle>
                <CardDescription>Appointments by branch</CardDescription>
              </CardHeader>
              <CardContent>
                {branchStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={branchStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" />
                      <Bar dataKey="completed" name="Completed" fill="hsl(var(--secondary))" />
                      <Bar dataKey="noShow" name="No Shows" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No branch data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}