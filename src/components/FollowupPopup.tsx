import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Check, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FollowupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  followups: any[];
  appointments: any[];
  onRefresh: () => void;
}

const FollowupPopup = ({ open, onOpenChange, date, followups, appointments, onRefresh }: FollowupPopupProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleMarkDone = async (followupId: string) => {
    setLoading(followupId);
    try {
      const { error } = await supabase
        .from("followups")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", followupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up marked as done",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    toast({
      title: "Calling",
      description: `Initiating call to ${phone}`,
    });
  };

  const handleMessage = (phone: string, name: string) => {
    toast({
      title: "Message",
      description: `Opening message to ${name}`,
    });
    // In production, this would open SMS/WhatsApp
  };

  const missedAppointments = appointments.filter(
    (appt) => appt.status === "no_show" || appt.status === "cancelled"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Follow-ups for {format(date, "MMMM dd, yyyy")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pending Follow-ups */}
          {followups.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge className="bg-warning/10 text-warning">
                  {followups.length}
                </Badge>
                Pending Follow-ups
              </h3>
              <div className="space-y-3">
                {followups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-warning text-warning-foreground">
                        {getPatientInitials(
                          followup.patients?.first_name,
                          followup.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {followup.patients?.first_name} {followup.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {followup.reason}
                      </p>
                      {followup.urgency && followup.urgency !== "normal" && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {followup.urgency}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCall(followup.patients?.phone)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleMessage(
                            followup.patients?.phone,
                            `${followup.patients?.first_name} ${followup.patients?.last_name}`
                          )
                        }
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/patients/${followup.patient_id}`)}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMarkDone(followup.id)}
                        disabled={loading === followup.id}
                        className="bg-success hover:bg-success/90"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missed Appointments */}
          {missedAppointments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge className="bg-destructive/10 text-destructive">
                  {missedAppointments.length}
                </Badge>
                Missed Appointments
              </h3>
              <div className="space-y-3">
                {missedAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-destructive text-destructive-foreground">
                        {getPatientInitials(
                          appt.patients?.first_name,
                          appt.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {appt.patients?.first_name} {appt.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appt.appointment_time} • {appt.reason || "General consultation"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCall(appt.patients?.phone)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/appointments/${appt.id}`)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {followups.length === 0 && missedAppointments.length === 0 && (
            <div className="text-center py-8">
              <Check className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">
                No follow-ups or missed appointments for this date
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowupPopup;
