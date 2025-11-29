import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, Clock, Download, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PatientPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentId: "",
    requestedDate: "",
    requestedTime: "",
    reason: ""
  });

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid access token");
      return;
    }
    loadPatientData();
  }, [token]);

  const loadPatientData = async () => {
    try {
      setLoading(true);

      // Verify token and get patient
      const { data: portalAccess, error: accessError } = await supabase
        .from("patient_portal_access")
        .select("patient_id, token_expires_at")
        .eq("login_token", token)
        .single();

      if (accessError || !portalAccess) {
        toast.error("Invalid or expired token");
        return;
      }

      if (new Date(portalAccess.token_expires_at) < new Date()) {
        toast.error("Token has expired");
        return;
      }

      // Get patient details
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", portalAccess.patient_id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Load appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", portalAccess.patient_id)
        .order("appointment_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);

      // Load prescriptions with items
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select(`
          *,
          prescription_items (*)
        `)
        .eq("patient_id", portalAccess.patient_id)
        .order("prescribed_date", { ascending: false });

      if (prescriptionsError) throw prescriptionsError;
      setPrescriptions(prescriptionsData || []);

      // Load reschedule requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("reschedule_requests")
        .select("*")
        .eq("patient_id", portalAccess.patient_id)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setRescheduleRequests(requestsData || []);
    } catch (error: any) {
      console.error("Error loading patient data:", error);
      toast.error("Failed to load your information");
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleRequest = async (appointmentId: string) => {
    setRescheduleForm({ ...rescheduleForm, appointmentId });
  };

  const submitRescheduleRequest = async () => {
    if (!rescheduleForm.requestedDate || !rescheduleForm.requestedTime || !rescheduleForm.reason) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("reschedule_requests")
        .insert({
          appointment_id: rescheduleForm.appointmentId,
          patient_id: patient.id,
          requested_date: rescheduleForm.requestedDate,
          requested_time: rescheduleForm.requestedTime,
          reason: rescheduleForm.reason
        });

      if (error) throw error;

      toast.success("Reschedule request submitted successfully");
      setRescheduleForm({ appointmentId: "", requestedDate: "", requestedTime: "", reason: "" });
      loadPatientData();
    } catch (error: any) {
      console.error("Error submitting reschedule request:", error);
      toast.error("Failed to submit request");
    }
  };

  const downloadPrescription = async (prescriptionId: string) => {
    toast.info("Prescription download will be implemented with PDF generation");
  };

  const handleLogout = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Invalid or expired access token</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Patient Portal</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {patient.first_name} {patient.last_name}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <FileText className="mr-2 h-4 w-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="reschedule">
              <Clock className="mr-2 h-4 w-4" />
              Reschedule Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Appointments</CardTitle>
                <CardDescription>View your upcoming and past appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No appointments found</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <Card key={apt.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  apt.status === "completed" ? "default" :
                                  apt.status === "cancelled" ? "destructive" :
                                  "secondary"
                                }>
                                  {apt.status}
                                </Badge>
                                <Badge variant="outline">{apt.appointment_type}</Badge>
                              </div>
                              <p className="font-medium">
                                {format(new Date(apt.appointment_date), "MMMM d, yyyy")} at {apt.appointment_time}
                              </p>
                              {apt.reason && (
                                <p className="text-sm text-muted-foreground">Reason: {apt.reason}</p>
                              )}
                            </div>
                            {apt.status === "scheduled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRescheduleRequest(apt.id)}
                              >
                                Request Reschedule
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Prescriptions</CardTitle>
                <CardDescription>View and download your prescriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No prescriptions found</p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((rx) => (
                      <Card key={rx.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-medium">
                                {format(new Date(rx.prescribed_date), "MMMM d, yyyy")}
                              </p>
                              {rx.diagnosis && (
                                <p className="text-sm text-muted-foreground">Diagnosis: {rx.diagnosis}</p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPrescription(rx.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Medications:</p>
                            {rx.prescription_items?.map((item: any) => (
                              <div key={item.id} className="text-sm bg-muted p-3 rounded-lg">
                                <p className="font-medium">{item.drug_name}</p>
                                <p className="text-muted-foreground">
                                  {item.dosage} - {item.frequency} - {item.duration}
                                </p>
                                {item.instructions && (
                                  <p className="text-muted-foreground text-xs mt-1">{item.instructions}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reschedule" className="space-y-4">
            {rescheduleForm.appointmentId && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Reschedule</CardTitle>
                  <CardDescription>Submit a request to reschedule your appointment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preferred Date</Label>
                      <Input
                        type="date"
                        value={rescheduleForm.requestedDate}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, requestedDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Time</Label>
                      <Input
                        type="time"
                        value={rescheduleForm.requestedTime}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, requestedTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for Reschedule</Label>
                    <Textarea
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                      placeholder="Please explain why you need to reschedule..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={submitRescheduleRequest}>Submit Request</Button>
                    <Button
                      variant="outline"
                      onClick={() => setRescheduleForm({ appointmentId: "", requestedDate: "", requestedTime: "", reason: "" })}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Your Reschedule Requests</CardTitle>
                <CardDescription>Track the status of your reschedule requests</CardDescription>
              </CardHeader>
              <CardContent>
                {rescheduleRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No reschedule requests</p>
                ) : (
                  <div className="space-y-4">
                    {rescheduleRequests.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <Badge variant={
                                req.status === "approved" ? "default" :
                                req.status === "rejected" ? "destructive" :
                                "secondary"
                              }>
                                {req.status}
                              </Badge>
                              <p className="font-medium">
                                Requested: {format(new Date(req.requested_date), "MMMM d, yyyy")} at {req.requested_time}
                              </p>
                              <p className="text-sm text-muted-foreground">{req.reason}</p>
                              {req.notes && (
                                <p className="text-sm text-muted-foreground">Staff Notes: {req.notes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}