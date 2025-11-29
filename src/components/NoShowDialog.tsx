import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NoShowDialogProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NoShowDialog({
  appointmentId,
  patientId,
  patientName,
  branchId,
  open,
  onOpenChange,
  onSuccess,
}: NoShowDialogProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMarkNoShow = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mark appointment as no-show
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'no_show',
          completed_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Create follow-up for the no-show
      const followupDate = new Date();
      followupDate.setDate(followupDate.getDate() + 7); // Follow up in 7 days

      const { error: followupError } = await supabase
        .from('followups')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          branch_id: branchId,
          followup_date: followupDate.toISOString().split('T')[0],
          reason: 'No-show follow-up',
          urgency: 'high',
          notes: notes || `Patient ${patientName} did not show up for appointment`,
          created_by: user.id,
          status: 'pending',
        });

      if (followupError) throw followupError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          entity_type: 'appointment',
          entity_id: appointmentId,
          action: 'mark_no_show',
          changes: {
            status: 'no_show',
            notes: notes,
            followup_created: true,
          },
        });

      if (auditError) console.error('Audit log error:', auditError);

      toast.success(`${patientName} marked as no-show. Follow-up created.`);
      setNotes("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error('Failed to mark as no-show');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
          <AlertDialogDescription>
            Mark {patientName} as no-show? This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Update appointment status to "No-Show"</li>
              <li>Create a follow-up task for 7 days from now</li>
              <li>Log this action in the audit trail</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this no-show..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleMarkNoShow}
            disabled={loading}
          >
            {loading ? 'Marking...' : 'Mark as No-Show'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
