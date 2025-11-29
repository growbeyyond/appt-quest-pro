import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Calendar, Clock, UserCheck, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Waitlist() {
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    branch_id: "",
    preferred_date: "",
    preferred_time_start: "",
    preferred_time_end: "",
    appointment_type: "new" as any,
    reason: "",
    priority: "normal",
    notes: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [waitlistRes, patientsRes, branchesRes] = await Promise.all([
        supabase
          .from("waitlist")
          .select(`
            *,
            patients (id, first_name, last_name, phone),
            branches (name)
          `)
          .eq("status", "waiting")
          .order("priority", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase.from("patients").select("id, first_name, last_name").order("first_name"),
        supabase.from("branches").select("*").eq("is_active", true),
      ]);

      setWaitlistEntries(waitlistRes.data || []);
      setPatients(patientsRes.data || []);
      setBranches(branchesRes.data || []);

      if (branchesRes.data && branchesRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (error) {
      console.error("Error loading waitlist:", error);
      toast.error("Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("waitlist").insert({
        ...formData,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success("Added to waitlist");
      setDialogOpen(false);
      setFormData({
        patient_id: "",
        branch_id: branches[0]?.id || "",
        preferred_date: "",
        preferred_time_start: "",
        preferred_time_end: "",
        appointment_type: "new",
        reason: "",
        priority: "normal",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      console.error("Error adding to waitlist:", error);
      toast.error(error.message || "Failed to add to waitlist");
    }
  };

  const handleContactPatient = (phone: string, name: string) => {
    const message = `Hi ${name}, a slot has opened up at Dr. Prasanna's clinic. Please call us to schedule your appointment.`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleScheduleAppointment = (entry: any) => {
    navigate(`/appointments/new?patientId=${entry.patient_id}&waitlistId=${entry.id}`);
  };

  const handleMarkContacted = async (id: string) => {
    try {
      const { error } = await supabase
        .from("waitlist")
        .update({
          status: "contacted",
          contacted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Marked as contacted");
      loadData();
    } catch (error) {
      console.error("Error updating waitlist:", error);
      toast.error("Failed to update waitlist");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("waitlist")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Removed from waitlist");
      loadData();
    } catch (error) {
      console.error("Error removing from waitlist:", error);
      toast.error("Failed to remove from waitlist");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Waitlist</h1>
            <p className="text-muted-foreground">
              Manage patients waiting for available appointments
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add to Waitlist
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Patient to Waitlist</DialogTitle>
                <DialogDescription>
                  Add a patient to the waiting list for an available appointment slot
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, patient_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_id">Branch *</Label>
                  <Select
                    value={formData.branch_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, branch_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment_type">Appointment Type</Label>
                  <Select
                    value={formData.appointment_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, appointment_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Patient</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="teleconsult">Teleconsult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_date">Preferred Date</Label>
                    <Input
                      id="preferred_date"
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) =>
                        setFormData({ ...formData, preferred_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_time">Preferred Time Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={formData.preferred_time_start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            preferred_time_start: e.target.value,
                          })
                        }
                        placeholder="From"
                      />
                      <Input
                        type="time"
                        value={formData.preferred_time_end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            preferred_time_end: e.target.value,
                          })
                        }
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="Reason for visit..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add to Waitlist</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Waitlist ({waitlistEntries.length})</CardTitle>
            <CardDescription>
              Patients sorted by priority and wait time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : waitlistEntries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No patients on waitlist</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add patients when appointment slots are full
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitlistEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-lg font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </div>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getPatientInitials(
                            entry.patients.first_name,
                            entry.patients.last_name
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {entry.patients.first_name} {entry.patients.last_name}
                          </p>
                          <Badge className={getPriorityColor(entry.priority)}>
                            {entry.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.branches.name} • {entry.appointment_type.replace("_", " ")}
                          {entry.preferred_date && (
                            <> • Prefers {format(new Date(entry.preferred_date), "MMM dd")}</>
                          )}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            {entry.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleContactPatient(
                            entry.patients.phone,
                            entry.patients.first_name
                          )
                        }
                        className="gap-2"
                      >
                        <Phone className="h-3 w-3" />
                        Contact
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleScheduleAppointment(entry)}
                        className="gap-2"
                      >
                        <Calendar className="h-3 w-3" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkContacted(entry.id)}
                        className="gap-2"
                      >
                        <UserCheck className="h-3 w-3" />
                        Contacted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(entry.id)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
