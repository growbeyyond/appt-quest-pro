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
import logo from "@/assets/logo.jpeg";

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

  const downloadPrescription = async (prescription: any) => {
    const patientName = `${patient.first_name} ${patient.last_name}`;
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - Dr. Prasanna Boddupally</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #6b21a8; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { color: #6b21a8; font-size: 28px; font-weight: bold; margin: 0; }
          .clinic-subtitle { color: #16a34a; font-size: 16px; font-weight: 600; margin: 5px 0 0 0; }
          .rx-symbol { font-size: 40px; color: #6b21a8; font-weight: bold; margin: 20px 0; }
          .patient-info { background: #f8f7ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #6b21a8; }
          .patient-info p { margin: 5px 0; }
          .medications { margin: 25px 0; }
          .medication { background: #fff; border: 1px solid #e5e5e5; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #16a34a; }
          .drug-name { font-weight: bold; color: #6b21a8; font-size: 16px; margin-bottom: 5px; }
          .drug-details { color: #555; font-size: 14px; }
          .drug-instructions { color: #16a34a; font-style: italic; font-size: 13px; margin-top: 5px; }
          .notes { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #16a34a; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e5e5; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">Dr. Prasanna Boddupally's</h1>
          <p class="clinic-subtitle">PCOS & Thyrocure Homeopathy</p>
        </div>
        
        <div class="rx-symbol">℞</div>
        
        <div class="patient-info">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Date:</strong> ${format(new Date(prescription.prescribed_date), "MMMM d, yyyy")}</p>
          ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ""}
        </div>
        
        <div class="medications">
          <h3 style="color: #6b21a8; margin-bottom: 15px;">Medications</h3>
          ${prescription.prescription_items.map((item: any, idx: number) => `
            <div class="medication">
              <div class="drug-name">${idx + 1}. ${item.drug_name}</div>
              <div class="drug-details">${item.dosage} • ${item.frequency} • ${item.duration}</div>
              ${item.instructions ? `<div class="drug-instructions">${item.instructions}</div>` : ""}
            </div>
          `).join("")}
        </div>
        
        ${prescription.notes ? `
          <div class="notes">
            <strong>Notes:</strong> ${prescription.notes}
          </div>
        ` : ""}
        
        <div class="footer">
          <p>For any queries, please contact the clinic.</p>
          <p>🌿 PCOS & Thyrocure Homeopathy</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <img src={logo} alt="Clinic Logo" className="h-20 w-20 mx-auto rounded-2xl shadow-lg mb-4" />
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Card className="w-full max-w-md border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <img src={logo} alt="Clinic Logo" className="h-20 w-20 mx-auto rounded-2xl shadow-lg mb-4" />
            <CardTitle className="text-primary">Access Denied</CardTitle>
            <CardDescription>Invalid or expired access token</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b border-primary/20 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Clinic Logo" className="h-14 w-14 rounded-xl shadow-md" />
            <div>
              <h1 className="text-xl font-bold text-primary">Patient Portal</h1>
              <p className="text-sm text-secondary font-medium">
                Welcome, {patient.first_name} {patient.last_name}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-primary/30">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="bg-card border border-primary/20">
            <TabsTrigger value="appointments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="reschedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="mr-2 h-4 w-4" />
              Reschedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Your Appointments</CardTitle>
                <CardDescription>View your upcoming and past appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No appointments found</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <Card key={apt.id} className="border-secondary/20">
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
                                <Badge variant="outline" className="border-secondary/50 text-secondary">
                                  {apt.appointment_type}
                                </Badge>
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
                                className="border-primary/30"
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
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Your Prescriptions</CardTitle>
                <CardDescription>View and download your prescriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No prescriptions found</p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((rx) => (
                      <Card key={rx.id} className="border-secondary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-medium text-primary">
                                {format(new Date(rx.prescribed_date), "MMMM d, yyyy")}
                              </p>
                              {rx.diagnosis && (
                                <p className="text-sm text-muted-foreground">Diagnosis: {rx.diagnosis}</p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPrescription(rx)}
                              className="border-secondary/30 text-secondary hover:bg-secondary/10"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-primary">Medications:</p>
                            {rx.prescription_items?.map((item: any) => (
                              <div key={item.id} className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <p className="font-medium text-primary">{item.drug_name}</p>
                                <p className="text-muted-foreground">
                                  {item.dosage} - {item.frequency} - {item.duration}
                                </p>
                                {item.instructions && (
                                  <p className="text-secondary text-xs mt-1">{item.instructions}</p>
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
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary">Request Reschedule</CardTitle>
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
                        className="border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Time</Label>
                      <Input
                        type="time"
                        value={rescheduleForm.requestedTime}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, requestedTime: e.target.value })}
                        className="border-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for Reschedule</Label>
                    <Textarea
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                      placeholder="Please explain why you need to reschedule..."
                      className="border-primary/20"
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

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Your Reschedule Requests</CardTitle>
                <CardDescription>Track the status of your reschedule requests</CardDescription>
              </CardHeader>
              <CardContent>
                {rescheduleRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No reschedule requests</p>
                ) : (
                  <div className="space-y-4">
                    {rescheduleRequests.map((req) => (
                      <Card key={req.id} className="border-secondary/20">
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
                                <p className="text-sm text-secondary">Staff Notes: {req.notes}</p>
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

      <footer className="border-t border-primary/20 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <img src={logo} alt="Clinic Logo" className="h-12 w-12 mx-auto rounded-xl shadow-md mb-3" />
          <p className="text-primary font-semibold">Dr. Prasanna Boddupally's</p>
          <p className="text-secondary text-sm">PCOS & Thyrocure Homeopathy</p>
          <p className="text-muted-foreground text-xs mt-2">For any queries, please contact the clinic.</p>
        </div>
      </footer>
    </div>
  );
}