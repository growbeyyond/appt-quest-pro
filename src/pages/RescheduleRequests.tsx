import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X, User, Calendar, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RescheduleRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reschedule_requests")
        .select(`
          *,
          appointment:appointments (
            appointment_date,
            appointment_time,
            reason
          ),
          patient:patients (
            first_name,
            last_name,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load reschedule requests");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string, status: "approved" | "rejected") => {
    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      const request = requests.find(r => r.id === requestId);

      // Update reschedule request status
      const { error } = await supabase
        .from("reschedule_requests")
        .update({
          status,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          notes: staffNotes
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, update the appointment with new date/time
      if (status === "approved" && request) {
        const { error: appointmentError } = await supabase
          .from("appointments")
          .update({
            appointment_date: request.requested_date,
            appointment_time: request.requested_time,
            updated_at: new Date().toISOString()
          })
          .eq("id", request.appointment_id);

        if (appointmentError) {
          console.error("Error updating appointment:", appointmentError);
          toast.error("Request approved but failed to update appointment");
        } else {
          // Send WhatsApp notification to patient
          if (request.patient?.phone) {
            const message = `Hi ${request.patient.first_name}, your reschedule request has been approved! Your new appointment is on ${format(new Date(request.requested_date), "MMM d, yyyy")} at ${request.requested_time}. Thank you!`;
            const whatsappUrl = `https://wa.me/${request.patient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }
        }
      }

      toast.success(`Request ${status} successfully${status === "approved" ? " - Appointment updated" : ""}`);
      setSelectedRequest(null);
      setStaffNotes("");
      loadRequests();
    } catch (error: any) {
      console.error("Error processing request:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  const openProcessDialog = (request: any) => {
    setSelectedRequest(request);
    setStaffNotes("");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reschedule Requests</h1>
          <p className="text-muted-foreground">
            Manage patient reschedule requests
          </p>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Requests awaiting your action</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {request.patient?.first_name} {request.patient?.last_name}
                              </span>
                              <Badge variant="outline">{request.patient?.phone}</Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <p className="text-muted-foreground">
                                <strong>Current:</strong> {format(new Date(request.appointment?.appointment_date), "MMM d, yyyy")} at {request.appointment?.appointment_time}
                              </p>
                              <p className="text-primary">
                                <strong>Requested:</strong> {format(new Date(request.requested_date), "MMM d, yyyy")} at {request.requested_time}
                              </p>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-1">Reason:</p>
                              <p className="text-sm text-muted-foreground">{request.reason}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Requested {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openProcessDialog(request)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openProcessDialog(request)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Processed Requests</CardTitle>
            <CardDescription>Recently approved or rejected requests</CardDescription>
          </CardHeader>
          <CardContent>
            {processedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No processed requests</p>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {request.patient?.first_name} {request.patient?.last_name}
                            </span>
                            <Badge variant={request.status === "approved" ? "default" : "destructive"}>
                              {request.status}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="text-muted-foreground">
                              Requested: {format(new Date(request.requested_date), "MMM d, yyyy")} at {request.requested_time}
                            </p>
                            {request.notes && (
                              <div className="bg-muted p-2 rounded text-xs">
                                <strong>Staff Notes:</strong> {request.notes}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Processed {format(new Date(request.processed_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Reschedule Request</DialogTitle>
            <DialogDescription>
              Add notes and approve or reject this request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Notes (Optional)</Label>
              <Textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Add any notes for the patient or record..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleProcessRequest(selectedRequest?.id, "approved")}
                disabled={processing}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Request
              </Button>
              <Button
                onClick={() => handleProcessRequest(selectedRequest?.id, "rejected")}
                disabled={processing}
                variant="destructive"
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}