import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pill, Printer, Mail, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  prescribed_date: string;
  status: string;
  prescription_items: PrescriptionItem[];
}

interface PrescriptionItem {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string | null;
  instructions: string | null;
}

interface PrescriptionManagerProps {
  patientId: string;
  patientEmail?: string;
  appointmentId?: string;
}

export const PrescriptionManager = ({
  patientId,
  patientEmail,
  appointmentId,
}: PrescriptionManagerProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: "",
    notes: "",
    items: [
      {
        drug_name: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        instructions: "",
      },
    ],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPrescriptions();
  }, [patientId]);

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, prescription_items(*)")
        .eq("patient_id", patientId)
        .order("prescribed_date", { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          drug_name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          instructions: "",
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: prescription, error: prescriptionError } = await supabase
        .from("prescriptions")
        .insert([
          {
            patient_id: patientId,
            doctor_id: user.id,
            appointment_id: appointmentId,
            diagnosis: formData.diagnosis,
            notes: formData.notes,
            prescribed_date: new Date().toISOString().split("T")[0],
          },
        ])
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      const items = formData.items.map((item) => ({
        prescription_id: prescription.id,
        ...item,
        quantity: item.quantity || null,
        instructions: item.instructions || null,
      }));

      const { error: itemsError } = await supabase
        .from("prescription_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Prescription created successfully",
      });

      setDialogOpen(false);
      setFormData({
        diagnosis: "",
        notes: "",
        items: [
          {
            drug_name: "",
            dosage: "",
            frequency: "",
            duration: "",
            quantity: "",
            instructions: "",
          },
        ],
      });
      loadPrescriptions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPrescription = async (prescriptionId: string) => {
    if (!patientEmail) {
      toast({
        title: "Error",
        description: "Patient email not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke(
        "send-prescription-email",
        {
          body: { prescriptionId, patientEmail },
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription sent via email",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescriptions
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Prescription</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input
                    id="diagnosis"
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Medications</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Medication
                    </Button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-4 relative"
                    >
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Drug Name</Label>
                          <Input
                            value={item.drug_name}
                            onChange={(e) =>
                              handleItemChange(index, "drug_name", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dosage</Label>
                          <Input
                            value={item.dosage}
                            onChange={(e) =>
                              handleItemChange(index, "dosage", e.target.value)
                            }
                            placeholder="e.g., 500mg"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Input
                            value={item.frequency}
                            onChange={(e) =>
                              handleItemChange(index, "frequency", e.target.value)
                            }
                            placeholder="e.g., Twice daily"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            value={item.duration}
                            onChange={(e) =>
                              handleItemChange(index, "duration", e.target.value)
                            }
                            placeholder="e.g., 7 days"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity (Optional)</Label>
                          <Input
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Instructions (Optional)</Label>
                          <Input
                            value={item.instructions}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "instructions",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Take after meals"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Prescription"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No prescriptions yet
            </p>
          ) : (
            prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {new Date(prescription.prescribed_date).toLocaleDateString()}
                    </p>
                    {prescription.diagnosis && (
                      <p className="text-sm text-muted-foreground">
                        Diagnosis: {prescription.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEmailPrescription(prescription.id)}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {prescription.prescription_items.map((item) => (
                    <div
                      key={item.id}
                      className="text-sm bg-muted/50 rounded p-2"
                    >
                      <p className="font-medium">{item.drug_name}</p>
                      <p className="text-muted-foreground">
                        {item.dosage} • {item.frequency} • {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-muted-foreground text-xs mt-1">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {prescription.notes && (
                  <p className="text-sm text-muted-foreground">
                    Notes: {prescription.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
