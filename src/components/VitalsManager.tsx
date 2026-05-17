import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Activity, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vital {
  id: string;
  recorded_at: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  temperature_c: number | null;
  spo2: number | null;
  notes: string | null;
}

export const VitalsManager = ({ patientId, appointmentId }: { patientId: string; appointmentId?: string }) => {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    weight_kg: "",
    height_cm: "",
    temperature_c: "",
    spo2: "",
    notes: "",
  });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("patient_vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false });
    setVitals(data || []);
  };

  useEffect(() => {
    load();
  }, [patientId]);

  const computeBmi = (w: string, h: string) => {
    const wn = parseFloat(w);
    const hn = parseFloat(h) / 100;
    if (wn > 0 && hn > 0) return +(wn / (hn * hn)).toFixed(1);
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        patient_id: patientId,
        appointment_id: appointmentId || null,
        recorded_by: user?.id,
        bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
        pulse: form.pulse ? parseInt(form.pulse) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        bmi: computeBmi(form.weight_kg, form.height_cm),
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
        spo2: form.spo2 ? parseInt(form.spo2) : null,
        notes: form.notes || null,
      };
      const { error } = await (supabase as any).from("patient_vitals").insert(payload);
      if (error) throw error;
      toast({ title: "Vitals recorded" });
      setOpen(false);
      setForm({ bp_systolic: "", bp_diastolic: "", pulse: "", weight_kg: "", height_cm: "", temperature_c: "", spo2: "", notes: "" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this vitals entry?")) return;
    await (supabase as any).from("patient_vitals").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Vitals
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Record Vitals</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Record Vitals</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>BP Systolic</Label><Input type="number" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} placeholder="120" /></div>
                  <div className="space-y-1"><Label>BP Diastolic</Label><Input type="number" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} placeholder="80" /></div>
                  <div className="space-y-1"><Label>Pulse (bpm)</Label><Input type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} placeholder="72" /></div>
                  <div className="space-y-1"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Height (cm)</Label><Input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></div>
                  <div className="space-y-1"><Label>BMI (auto)</Label><Input disabled value={computeBmi(form.weight_kg, form.height_cm) ?? ""} /></div>
                  <div className="space-y-1"><Label>Temp (°C)</Label><Input type="number" step="0.1" value={form.temperature_c} onChange={(e) => setForm({ ...form, temperature_c: e.target.value })} placeholder="36.6" /></div>
                  <div className="space-y-1"><Label>SpO₂ (%)</Label><Input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} placeholder="98" /></div>
                </div>
                <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Vitals"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {vitals.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No vitals recorded yet</p>
        ) : (
          <div className="space-y-2">
            {vitals.map((v) => (
              <div key={v.id} className="border rounded-lg p-3 flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium">{new Date(v.recorded_at).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    {v.bp_systolic && v.bp_diastolic && <span>BP {v.bp_systolic}/{v.bp_diastolic}</span>}
                    {v.pulse && <span>Pulse {v.pulse}</span>}
                    {v.weight_kg && <span>Wt {v.weight_kg}kg</span>}
                    {v.height_cm && <span>Ht {v.height_cm}cm</span>}
                    {v.bmi && <span>BMI {v.bmi}</span>}
                    {v.temperature_c && <span>Temp {v.temperature_c}°C</span>}
                    {v.spo2 && <span>SpO₂ {v.spo2}%</span>}
                  </div>
                  {v.notes && <p className="text-sm mt-1">{v.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};