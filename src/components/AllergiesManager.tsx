import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reaction: string | null;
  notes: string | null;
}

const severityColor: Record<string, string> = {
  mild: "bg-yellow-100 text-yellow-800",
  moderate: "bg-orange-100 text-orange-800",
  severe: "bg-red-100 text-red-800",
};

export const AllergiesManager = ({ patientId }: { patientId: string }) => {
  const [items, setItems] = useState<Allergy[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ allergen: "", severity: "mild", reaction: "", notes: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("patient_allergies").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [patientId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("patient_allergies").insert({
        patient_id: patientId,
        allergen: form.allergen,
        severity: form.severity,
        reaction: form.reaction || null,
        notes: form.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Allergy added" });
      setOpen(false);
      setForm({ allergen: "", severity: "mild", reaction: "", notes: "" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this allergy?")) return;
    await (supabase as any).from("patient_allergies").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Allergies</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Allergy</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Allergy</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1"><Label>Allergen *</Label><Input required value={form.allergen} onChange={(e) => setForm({ ...form, allergen: e.target.value })} placeholder="e.g. Penicillin, Peanuts" /></div>
                <div className="space-y-1">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Reaction</Label><Input value={form.reaction} onChange={(e) => setForm({ ...form, reaction: e.target.value })} placeholder="e.g. Rash, swelling" /></div>
                <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No known allergies</p>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="border rounded-lg p-3 flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{a.allergen}</p>
                    <Badge className={severityColor[a.severity] || ""} variant="secondary">{a.severity}</Badge>
                  </div>
                  {a.reaction && <p className="text-sm text-muted-foreground mt-1">Reaction: {a.reaction}</p>}
                  {a.notes && <p className="text-sm mt-1">{a.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};