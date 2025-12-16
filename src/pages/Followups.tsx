import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, AlertCircle, Phone, MessageCircle, Check, Plus, Clock, Filter, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Followups = () => {
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const navigate = useNavigate();

  const [newFollowup, setNewFollowup] = useState({
    patient_id: "",
    branch_id: "",
    followup_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    reason: "",
    urgency: "normal",
    notes: "",
  });

  useEffect(() => {
    loadFollowups();
    loadPatientsAndBranches();
  }, []);

  const loadFollowups = async () => {
    try {
      const { data } = await supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .order("followup_date", { ascending: true });

      setFollowups(data || []);
    } catch (error) {
      console.error("Error loading followups:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientsAndBranches = async () => {
    const [patientsRes, branchesRes] = await Promise.all([
      supabase.from("patients").select("id, first_name, last_name").order("first_name"),
      supabase.from("branches").select("id, name").eq("is_active", true),
    ]);
    setPatients(patientsRes.data || []);
    setBranches(branchesRes.data || []);
    if (branchesRes.data?.length) {
      setNewFollowup(prev => ({ ...prev, branch_id: branchesRes.data[0].id }));
    }
  };

  const handleMarkDone = async (followupId: string) => {
    try {
      const { error } = await supabase
        .from("followups")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", followupId);

      if (error) throw error;
      toast.success("Follow-up marked as done");
      loadFollowups();
    } catch (error) {
      console.error("Error marking followup done:", error);
      toast.error("Failed to mark follow-up as done");
    }
  };

  const handleSnooze = async (followupId: string, days: number) => {
    try {
      const newDate = format(addDays(new Date(), days), "yyyy-MM-dd");
      const { error } = await supabase
        .from("followups")
        .update({ 
          status: "snoozed", 
          followup_date: newDate,
          notes: `Snoozed for ${days} day(s) on ${format(new Date(), "MMM d, yyyy")}`
        })
        .eq("id", followupId);

      if (error) throw error;
      toast.success(`Follow-up snoozed for ${days} day(s)`);
      loadFollowups();
    } catch (error) {
      console.error("Error snoozing followup:", error);
      toast.error("Failed to snooze follow-up");
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("followups").insert({
        ...newFollowup,
        created_by: user?.id,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Follow-up created successfully");
      setCreateDialogOpen(false);
      setNewFollowup({
        patient_id: "",
        branch_id: branches[0]?.id || "",
        followup_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        reason: "",
        urgency: "normal",
        notes: "",
      });
      loadFollowups();
    } catch (error: any) {
      console.error("Error creating followup:", error);
      toast.error("Failed to create follow-up");
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string, patientName: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${patientName}, this is a follow-up call from Dr. Prasanna's clinic.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const handleScheduleAppointment = (patientId: string) => {
    navigate(`/appointments/new?patient=${patientId}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      contacted: "bg-info/10 text-info",
      done: "bg-success/10 text-success",
      snoozed: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status}
      </Badge>
    );
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const filteredFollowups = followups.filter((f) => {
    if (urgencyFilter === "all") return true;
    return f.urgency === urgencyFilter;
  });

  const pendingFollowups = filteredFollowups.filter((f) => f.status === "pending" || f.status === "snoozed");
  const completedFollowups = filteredFollowups.filter((f) => f.status === "done");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Follow-ups</h1>
            <p className="text-muted-foreground">
              Manage patient follow-up reminders and contacts
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Follow-up</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateFollowup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <Select
                      value={newFollowup.patient_id}
                      onValueChange={(v) => setNewFollowup({ ...newFollowup, patient_id: v })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select
                      value={newFollowup.branch_id}
                      onValueChange={(v) => setNewFollowup({ ...newFollowup, branch_id: v })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Follow-up Date</Label>
                      <Input
                        type="date"
                        value={newFollowup.followup_date}
                        onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Urgency</Label>
                      <Select
                        value={newFollowup.urgency}
                        onValueChange={(v) => setNewFollowup({ ...newFollowup, urgency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={newFollowup.reason}
                      onChange={(e) => setNewFollowup({ ...newFollowup, reason: e.target.value })}
                      placeholder="Reason for follow-up"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={newFollowup.notes}
                      onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Follow-up
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {pendingFollowups.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Pending Follow-ups ({pendingFollowups.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(followup.followup_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(followup.status)}
                      {followup.urgency === "high" && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                      {followup.patients?.phone && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCall(followup.patients.phone)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleWhatsApp(
                                followup.patients.phone,
                                `${followup.patients.first_name} ${followup.patients.last_name}`
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleScheduleAppointment(followup.patient_id)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Clock className="h-4 w-4 mr-1" />
                            Snooze
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleSnooze(followup.id, 1)}>
                            1 Day
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSnooze(followup.id, 3)}>
                            3 Days
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSnooze(followup.id, 7)}>
                            1 Week
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkDone(followup.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              All Follow-ups ({followups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading follow-ups...
              </p>
            ) : followups.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No follow-ups scheduled
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Follow-ups will appear here when doctors flag patients for follow-up
                </p>
              </div>
            ) : completedFollowups.length > 0 ? (
              <div className="space-y-4">
                {completedFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border opacity-60"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-success text-success-foreground">
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
                    {getStatusBadge(followup.status)}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Followups;