import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConflictDetectionDialog } from "@/components/ConflictDetectionDialog";

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    branch_id: "",
    appointment_type: "new" as "new" | "follow_up" | "procedure" | "teleconsult",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: 30,
    buffer_minutes: 10,
    reason: "",
    notes: "",
    source: "walk_in",
    status: "scheduled" as any,
  });

  useEffect(() => {
    loadData();
    if (!isNew && id) {
      loadAppointment();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [patientsRes, branchesRes] = await Promise.all([
        supabase.from("patients").select("id, first_name, last_name").order("first_name"),
        supabase.from("branches").select("*").eq("is_active", true),
      ]);

      setPatients(patientsRes.data || []);
      setBranches(branchesRes.data || []);

      if (branchesRes.data && branchesRes.data.length > 0 && isNew) {
        setFormData((prev) => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) setFormData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceBook = false) => {
    e.preventDefault();

    // Check for conflicts if not forcing
    if (!forceBook && formData.appointment_date && formData.appointment_time && formData.branch_id) {
      setPendingSubmit(true);
      setConflictDialogOpen(true);
      return;
    }

    setLoading(true);

    try {
      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("appointments").insert({
          ...formData,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: "Appointment created successfully",
        });
      } else {
        const { error } = await supabase
          .from("appointments")
          .update(formData)
          .eq("id", id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Appointment updated successfully",
        });
      }
      navigate("/appointments");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPendingSubmit(false);
    }
  };

  const handleForceBook = () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent, true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/appointments")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "New Appointment" : "Appointment Details"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Schedule a new appointment" : "View and edit appointment"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient *</Label>
                  <Select 
                    value={formData.patient_id} 
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
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
                    onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
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
                  <Label htmlFor="appointment_type">Appointment Type *</Label>
                  <Select 
                    value={formData.appointment_type} 
                    onValueChange={(value: any) => setFormData({ ...formData, appointment_type: value })}
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
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="checked_in">Checked In</SelectItem>
                      <SelectItem value="in_consultation">In Consultation</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Date *</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment_time">Time *</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="15"
                    step="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buffer_minutes">Buffer (minutes)</Label>
                  <Input
                    id="buffer_minutes"
                    type="number"
                    value={formData.buffer_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) })}
                    min="0"
                    step="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={formData.reason || ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for visit..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/appointments")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : isNew ? "Create Appointment" : "Save Changes"}
            </Button>
          </div>
        </form>

        <ConflictDetectionDialog
          date={formData.appointment_date}
          time={formData.appointment_time}
          duration={formData.duration_minutes}
          branchId={formData.branch_id}
          excludeAppointmentId={isNew ? undefined : id}
          open={conflictDialogOpen && pendingSubmit}
          onOpenChange={(open) => {
            setConflictDialogOpen(open);
            if (!open) setPendingSubmit(false);
          }}
          onForceBook={handleForceBook}
          onChangeSlot={() => {
            setConflictDialogOpen(false);
            setPendingSubmit(false);
            toast({
              title: "Pick a different time",
              description: "Please select a different date or time slot",
            });
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default AppointmentDetail;
