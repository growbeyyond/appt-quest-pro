import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Stethoscope, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  patient_id: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  checked_in_at: string | null;
  consultation_started_at: string | null;
  duration_minutes: number;
  patients: {
    first_name: string;
    last_name: string;
    photo_url: string | null;
  };
}

export function CheckInQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('appointments-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadQueue = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          appointment_time,
          appointment_type,
          status,
          checked_in_at,
          consultation_started_at,
          duration_minutes,
          patients (
            first_name,
            last_name,
            photo_url
          )
        `)
        .eq('appointment_date', today)
        .in('status', ['checked_in', 'in_consultation'])
        .order('checked_in_at', { ascending: true });

      if (error) throw error;
      setQueue(data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
      toast.error('Failed to load check-in queue');
    } finally {
      setLoading(false);
    }
  };

  const startConsultation = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'in_consultation',
          consultation_started_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Consultation started');
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Failed to start consultation');
    }
  };

  const completeAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment completed');
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    }
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getWaitTime = (checkedInAt: string) => {
    const diff = Date.now() - new Date(checkedInAt).getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading queue...</div>;
  }

  if (queue.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No patients in queue</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={item.patients.photo_url || undefined} />
                <AvatarFallback>
                  {getPatientInitials(
                    item.patients.first_name,
                    item.patients.last_name
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    {item.patients.first_name} {item.patients.last_name}
                  </h4>
                  <Badge variant={item.status === 'in_consultation' ? 'default' : 'secondary'}>
                    {item.status === 'checked_in' ? 'Waiting' : 'In Consultation'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.appointment_time}
                  </span>
                  <span className="capitalize">{item.appointment_type.replace('_', ' ')}</span>
                  {item.checked_in_at && (
                    <span className="text-orange-600 font-medium">
                      Waiting {getWaitTime(item.checked_in_at)} min
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {item.status === 'checked_in' && (
                <Button
                  onClick={() => startConsultation(item.id)}
                  className="gap-2"
                >
                  <Stethoscope className="h-4 w-4" />
                  Start Consultation
                </Button>
              )}
              
              {item.status === 'in_consultation' && (
                <Button
                  onClick={() => completeAppointment(item.id)}
                  variant="default"
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
