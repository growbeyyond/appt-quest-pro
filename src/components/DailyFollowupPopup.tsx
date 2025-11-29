import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageCircle, CheckCircle, Calendar, User, Bell, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Followup {
  id: string;
  reason: string;
  urgency: string;
  notes: string | null;
  status: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface MissedAppointment {
  id: string;
  appointment_time: string;
  reason: string | null;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface DailyFollowupPopupProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyFollowupPopup({
  date,
  open,
  onOpenChange,
}: DailyFollowupPopupProps) {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [missedAppointments, setMissedAppointments] = useState<MissedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, date]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load follow-ups for this date
      const { data: followupsData, error: followupsError } = await supabase
        .from('followups')
        .select(`
          id,
          reason,
          urgency,
          notes,
          status,
          patients (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('followup_date', date)
        .eq('status', 'pending')
        .order('urgency', { ascending: false });

      if (followupsError) throw followupsError;

      // Load no-show appointments from this date
      const { data: missedData, error: missedError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          reason,
          patients (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('appointment_date', date)
        .eq('status', 'no_show');

      if (missedError) throw missedError;

      setFollowups(followupsData as Followup[]);
      setMissedAppointments(missedData as MissedAppointment[]);
    } catch (error) {
      console.error('Error loading follow-ups:', error);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleMessage = (phone: string, name: string) => {
    const message = `Hi ${name}, this is a follow-up from Dr. Prasanna's clinic. Please call us back to reschedule your appointment.`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleMarkDone = async (followupId: string) => {
    try {
      const { error } = await supabase
        .from('followups')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', followupId);

      if (error) throw error;
      toast.success('Follow-up marked as done');
      loadData();
    } catch (error) {
      console.error('Error marking follow-up:', error);
      toast.error('Failed to update follow-up');
    }
  };

  const handleReschedule = (patientId: string) => {
    navigate(`/appointments/new?patientId=${patientId}`);
    onOpenChange(false);
  };

  const handleOpenPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
    onOpenChange(false);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-destructive/10 text-destructive';
      case 'normal':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const hasData = followups.length > 0 || missedAppointments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Follow-ups - {format(new Date(date), 'MMM dd, yyyy')}</DialogTitle>
          <DialogDescription>
            {hasData
              ? 'Review pending follow-ups and missed appointments'
              : 'No follow-ups or missed appointments for this date'}
          </DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>All clear for {format(new Date(date), 'MMM dd')}!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {followups.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Follow-ups ({followups.length})
                </h3>
                <div className="space-y-3">
                  {followups.map((followup) => (
                    <div
                      key={followup.id}
                      className="p-4 rounded-lg border border-border bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {followup.patients.first_name} {followup.patients.last_name}
                            </span>
                            <Badge className={getUrgencyColor(followup.urgency)}>
                              {followup.urgency}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{followup.reason}</p>
                          {followup.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              {followup.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCall(followup.patients.phone)}
                          className="gap-2"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleMessage(
                              followup.patients.phone,
                              followup.patients.first_name
                            )
                          }
                          className="gap-2"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkDone(followup.id)}
                          className="gap-2"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReschedule(followup.patients.id)}
                          className="gap-2"
                        >
                          <Calendar className="h-3 w-3" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPatient(followup.patients.id)}
                          className="gap-2"
                        >
                          <User className="h-3 w-3" />
                          Open Patient
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {followups.length > 0 && missedAppointments.length > 0 && (
              <Separator />
            )}

            {missedAppointments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Missed Appointments ({missedAppointments.length})
                </h3>
                <div className="space-y-3">
                  {missedAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3"
                    >
                      <div>
                        <div className="font-medium">
                          {appointment.patients.first_name}{' '}
                          {appointment.patients.last_name}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Scheduled: {appointment.appointment_time}
                        </p>
                        {appointment.reason && (
                          <p className="text-sm text-muted-foreground">
                            {appointment.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCall(appointment.patients.phone)}
                          className="gap-2"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleMessage(
                              appointment.patients.phone,
                              appointment.patients.first_name
                            )
                          }
                          className="gap-2"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReschedule(appointment.patients.id)}
                          className="gap-2"
                        >
                          <Calendar className="h-3 w-3" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPatient(appointment.patients.id)}
                          className="gap-2"
                        >
                          <User className="h-3 w-3" />
                          Open Patient
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
