import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CheckInDialogProps {
  appointmentId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckInDialog({
  appointmentId,
  patientName,
  open,
  onOpenChange,
  onSuccess,
}: CheckInDialogProps) {
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    temperature: "",
    pulse: "",
    weight: "",
  });
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async (skipVitals = false) => {
    setLoading(true);
    try {
      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // If vitals were provided, save them as a medical record
      if (!skipVitals && (vitals.bloodPressure || vitals.temperature || vitals.pulse || vitals.weight)) {
        // First get the patient_id from the appointment
        const { data: apptData, error: apptError } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('id', appointmentId)
          .single();

        if (apptError) throw apptError;

        const vitalsContent = `
Blood Pressure: ${vitals.bloodPressure || 'Not recorded'}
Temperature: ${vitals.temperature || 'Not recorded'}
Pulse: ${vitals.pulse || 'Not recorded'}
Weight: ${vitals.weight || 'Not recorded'}
        `.trim();

        const { error: recordError } = await supabase
          .from('medical_records')
          .insert({
            patient_id: apptData.patient_id,
            appointment_id: appointmentId,
            record_type: 'vitals',
            title: 'Check-in Vitals',
            content: vitalsContent,
          });

        if (recordError) throw recordError;
      }

      toast.success(`${patientName} checked in successfully`);
      onOpenChange(false);
      onSuccess?.();
      setVitals({ bloodPressure: "", temperature: "", pulse: "", weight: "" });
    } catch (error) {
      console.error('Error checking in patient:', error);
      toast.error('Failed to check in patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In Patient</DialogTitle>
          <DialogDescription>
            Check in {patientName}. You can optionally record vitals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp">Blood Pressure</Label>
              <Input
                id="bp"
                placeholder="120/80"
                value={vitals.bloodPressure}
                onChange={(e) =>
                  setVitals({ ...vitals, bloodPressure: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temp">Temperature</Label>
              <Input
                id="temp"
                placeholder="98.6°F"
                value={vitals.temperature}
                onChange={(e) =>
                  setVitals({ ...vitals, temperature: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pulse">Pulse</Label>
              <Input
                id="pulse"
                placeholder="72 bpm"
                value={vitals.pulse}
                onChange={(e) =>
                  setVitals({ ...vitals, pulse: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                placeholder="150 lbs"
                value={vitals.weight}
                onChange={(e) =>
                  setVitals({ ...vitals, weight: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => handleCheckIn(true)}
            disabled={loading}
          >
            Skip Vitals
          </Button>
          <Button onClick={() => handleCheckIn(false)} disabled={loading}>
            Check In {vitals.bloodPressure || vitals.temperature || vitals.pulse || vitals.weight ? 'with Vitals' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
