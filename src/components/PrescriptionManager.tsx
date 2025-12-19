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
import { Plus, Pill, Printer, MessageCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";

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
  patientName?: string;
  patientPhone?: string;
  appointmentId?: string;
}

export const PrescriptionManager = ({
  patientId,
  patientName,
  patientPhone,
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

  const handleWhatsAppShare = (prescription: Prescription) => {
    if (!patientPhone) {
      toast({
        title: "Error",
        description: "Patient phone number not available",
        variant: "destructive",
      });
      return;
    }

    // Build prescription message with clinic branding
    const medications = prescription.prescription_items
      .map((item, idx) => 
        `${idx + 1}. *${item.drug_name}* - ${item.dosage}\n   ${item.frequency} for ${item.duration}${item.instructions ? `\n   _(${item.instructions})_` : ""}`
      )
      .join("\n\n");

    const message = `🌿 *Dr. Prasanna Boddupally's*\n*PCOS & Thyrocure Homeopathy*\n━━━━━━━━━━━━━━━\n\n📋 *PRESCRIPTION*\n\n📅 Date: ${new Date(prescription.prescribed_date).toLocaleDateString()}\n👤 Patient: ${patientName || "Patient"}${prescription.diagnosis ? `\n🔬 Diagnosis: ${prescription.diagnosis}` : ""}\n\n💊 *Medications:*\n${medications}${prescription.notes ? `\n\n📝 *Notes:* ${prescription.notes}` : ""}\n\n━━━━━━━━━━━━━━━\n_For queries, contact the clinic._\n🌐 Homeopathy for PCOS & Thyroid`;

    const whatsappUrl = `https://wa.me/${patientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp opened",
      description: "Prescription message prepared for sending",
    });
  };

  const handlePrint = (prescription: Prescription) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - Dr. Prasanna Boddupally</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #6b21a8; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-section { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 10px; }
          .logo { width: 80px; height: 80px; border-radius: 12px; object-fit: cover; }
          .clinic-name { color: #6b21a8; font-size: 28px; font-weight: bold; margin: 0; }
          .clinic-subtitle { color: #16a34a; font-size: 16px; font-weight: 600; margin: 5px 0 0 0; }
          .clinic-tagline { color: #666; font-size: 12px; margin-top: 5px; }
          .rx-symbol { font-size: 40px; color: #6b21a8; font-weight: bold; margin: 20px 0; }
          .patient-info { background: #f8f7ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #6b21a8; }
          .patient-info p { margin: 5px 0; }
          .medications { margin: 25px 0; }
          .medication { background: #fff; border: 1px solid #e5e5e5; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #16a34a; }
          .drug-name { font-weight: bold; color: #6b21a8; font-size: 16px; margin-bottom: 5px; }
          .drug-details { color: #555; font-size: 14px; }
          .drug-instructions { color: #16a34a; font-style: italic; font-size: 13px; margin-top: 5px; }
          .notes { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #16a34a; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e5e5; color: #666; font-size: 12px; }
          .signature-line { margin-top: 50px; text-align: right; }
          .signature-line p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${logo}" class="logo" alt="Clinic Logo" />
            <div>
              <h1 class="clinic-name">Dr. Prasanna Boddupally's</h1>
              <p class="clinic-subtitle">PCOS & Thyrocure Homeopathy</p>
            </div>
          </div>
          <p class="clinic-tagline">Specialized Homeopathic Treatment for PCOS & Thyroid Disorders</p>
        </div>
        
        <div class="rx-symbol">℞</div>
        
        <div class="patient-info">
          <p><strong>Patient:</strong> ${patientName || "Patient"}</p>
          <p><strong>Date:</strong> ${new Date(prescription.prescribed_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ""}
        </div>
        
        <div class="medications">
          <h3 style="color: #6b21a8; margin-bottom: 15px;">Medications</h3>
          ${prescription.prescription_items.map((item, idx) => `
            <div class="medication">
              <div class="drug-name">${idx + 1}. ${item.drug_name}</div>
              <div class="drug-details">${item.dosage} • ${item.frequency} • ${item.duration}</div>
              ${item.instructions ? `<div class="drug-instructions">${item.instructions}</div>` : ""}
            </div>
          `).join("")}
        </div>
        
        ${prescription.notes ? `
          <div class="notes">
            <strong>Notes:</strong> ${prescription.notes}
          </div>
        ` : ""}
        
        <div class="signature-line">
          <p>_____________________________</p>
          <p><strong>Dr. Prasanna Boddupally</strong></p>
          <p>PCOS & Thyrocure Homeopathy</p>
        </div>
        
        <div class="footer">
          <p>This prescription is computer-generated and valid without signature for homeopathic medicines.</p>
          <p>For any queries, please contact the clinic.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Print prescription"
                      onClick={() => handlePrint(prescription)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleWhatsAppShare(prescription)}
                      title="Share via WhatsApp"
                      className="text-green-600 hover:text-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
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