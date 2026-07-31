import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { BillingPanel } from "@/components/BillingPanel";

const AppointmentDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;

  // URL params for pre-filling
  const prefilledPatientId = searchParams.get("patientId") || searchParams.get("patient");
  const waitlistId = searchParams.get("waitlistId");
  const prefilledDate = searchParams.get("date");
  const prefilledTime = searchParams.get("time");
  const prefilledBranchId = searchParams.get("branchId");

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
        supabase.from("patients").select("id, first_name, last_name, branch_id").order("first_name"),
        supabase.from("branches").select("*").eq("is_active", true),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (branchesRes.error) throw branchesRes.error;
      setPatients(patientsRes.data || []);
      setBranches(branchesRes.data || []);

      // Pre-fill form from URL params
      if (isNew) {
        const updates: any = {};
        
        if (prefilledPatientId) {
          updates.patient_id = prefilledPatientId;
        }
        if (prefilledDate) {
          updates.appointment_date = prefilledDate;
        }
        if (prefilledTime) {
          updates.appointment_time = prefilledTime;
        }
        if (prefilledBranchId) {
          updates.branch_id = prefilledBranchId;
        } else if (branchesRes.data && branchesRes.data.length > 0) {
          updates.branch_id = branchesRes.data[0].id;
        }

        if (Object.keys(updates).length > 0) {
          setFormData((prev) => ({ ...prev, ...updates }));
        }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Appointment not found", description: "It may have been removed or you may not have access.", variant: "destructive" });
        navigate("/appointments");
        return;
      }
      setFormData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkForConflicts = async (): Promise<boolean> => {
    if (!formData.appointment_date || !formData.appointment_time || !formData.branch_id) {
      return false;
    }

    const [hours, minutes] = formData.appointment_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + formData.duration_minutes;

    const { data, error } = await supabase
      .from('appointments')
      .select('id, appointment_time, duration_minutes, buffer_minutes')
      .eq('appointment_date', formData.appointment_date)
      .eq('branch_id', formData.branch_id)
      .in('status', ['scheduled', 'checked_in', 'in_consultation']);

    if (error) throw error;
    if (!data) return false;

    const conflicts = data.filter((appt) => {
      if (!isNew && appt.id === id) return false;
      
      const [apptHours, apptMinutes] = appt.appointment_time.split(':').map(Number);
      const apptStart = apptHours * 60 + apptMinutes;
      const apptEnd = apptStart + appt.duration_minutes + (appt.buffer_minutes || 0);

      return (
        (startMinutes >= apptStart && startMinutes < apptEnd) ||
        (endMinutes > apptStart && endMinutes <= apptEnd) ||
        (startMinutes <= apptStart && endMinutes >= apptEnd)
      );
    });

    return conflicts.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent, forceBook = false) => {
    e.preventDefault();

    // Check for conflicts if not forcing
    if (!forceBook && formData.appointment_date && formData.appointment_time && formData.branch_id) {
      const hasConflicts = await checkForConflicts();
      if (hasConflicts) {
        setPendingSubmit(true);
        setConflictDialogOpen(true);
        return;
      }
    }

    setLoading(true);

    try {
      const selectedPatient = patients.find((patient) => patient.id === formData.patient_id);
      if (selectedPatient?.branch_id && selectedPatient.branch_id !== formData.branch_id) {
        throw new Error("The appointment branch must match the patient’s branch");
      }
      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Your session has expired. Please sign in again.");
        const { data: newAppointment, error } = await supabase.from("appointments").insert({
          ...formData,
          created_by: user.id,
        }).select().maybeSingle();
        if (error) throw error;

        // If created from waitlist, update the waitlist entry
        if (waitlistId && newAppointment) {
          const { error: waitlistError } = await supabase
            .from("waitlist")
            .update({
              status: "scheduled",
              scheduled_appointment_id: newAppointment.id,
            })
            .eq("id", waitlistId);
          if (waitlistError) {
            toast({
              title: "Appointment created",
              description: "The waitlist entry could not be updated. Please update it manually.",
              variant: "destructive",
            });
          }
        }

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
                    onValueChange={(value) => {
                      const patient = patients.find((item) => item.id === value);
                      setFormData({ ...formData, patient_id: value, branch_id: patient?.branch_id || formData.branch_id });
                    }}
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

          {!isNew && formData.patient_id && formData.branch_id && (
            <div className="mt-6">
              <BillingPanel appointmentId={id!} patientId={formData.patient_id} branchId={formData.branch_id} />
            </div>
          )}

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
