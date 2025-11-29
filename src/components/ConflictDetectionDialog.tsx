import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ConflictingAppointment {
  id: string;
  appointment_time: string;
  duration_minutes: number;
  patients: {
    first_name: string;
    last_name: string;
  };
  status: string;
}

interface ConflictDetectionDialogProps {
  date: string;
  time: string;
  duration: number;
  branchId: string;
  excludeAppointmentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForceBook: () => void;
  onChangeSlot: () => void;
}

export function ConflictDetectionDialog({
  date,
  time,
  duration,
  branchId,
  excludeAppointmentId,
  open,
  onOpenChange,
  onForceBook,
  onChangeSlot,
}: ConflictDetectionDialogProps) {
  const [conflicts, setConflicts] = useState<ConflictingAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      checkConflicts();
      checkUserRole();
    }
  }, [open, date, time, duration, branchId]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    setUserRole(data?.role || null);
  };

  const checkConflicts = async () => {
    setLoading(true);
    try {
      // Convert time to minutes for easier comparison
      const [hours, minutes] = time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      // Get all appointments for this date and branch
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          duration_minutes,
          buffer_minutes,
          status,
          patients (
            first_name,
            last_name
          )
        `)
        .eq('appointment_date', date)
        .eq('branch_id', branchId)
        .in('status', ['scheduled', 'checked_in', 'in_consultation']);

      if (error) throw error;

      // Filter for overlapping appointments
      const conflicting = (data || []).filter((appt) => {
        if (excludeAppointmentId && appt.id === excludeAppointmentId) {
          return false;
        }

        const [apptHours, apptMinutes] = appt.appointment_time.split(':').map(Number);
        const apptStart = apptHours * 60 + apptMinutes;
        const apptEnd = apptStart + appt.duration_minutes + (appt.buffer_minutes || 0);

        // Check for overlap
        return (
          (startMinutes >= apptStart && startMinutes < apptEnd) ||
          (endMinutes > apptStart && endMinutes <= apptEnd) ||
          (startMinutes <= apptStart && endMinutes >= apptEnd)
        );
      });

      setConflicts(conflicting as ConflictingAppointment[]);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      toast.error('Failed to check for conflicts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWaitlist = () => {
    navigate(`/waitlist?date=${date}&time=${time}&branch=${branchId}`);
    onOpenChange(false);
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Appointment Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This time slot conflicts with {conflicts.length} existing appointment(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">
                  {conflict.patients.first_name} {conflict.patients.last_name}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {conflict.appointment_time} • {conflict.duration_minutes} min
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {conflict.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onChangeSlot}
            className="w-full sm:w-auto"
          >
            Pick Another Slot
          </Button>
          <Button
            variant="secondary"
            onClick={handleAddToWaitlist}
            className="w-full sm:w-auto"
          >
            Add to Waitlist
          </Button>
          {userRole === 'admin' && (
            <Button
              variant="destructive"
              onClick={() => {
                onForceBook();
                onOpenChange(false);
              }}
              className="w-full sm:w-auto"
            >
              Force Book (Admin)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
