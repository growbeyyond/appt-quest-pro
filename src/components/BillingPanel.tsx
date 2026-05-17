import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Receipt, Plus, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  consultation_fee: number;
  discount: number;
  tax: number;
  other_charges: number;
  total: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
}
interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paid_at: string;
}

const statusColor: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  unpaid: "bg-red-100 text-red-800",
};

export const BillingPanel = ({ appointmentId, patientId, branchId }: { appointmentId: string; patientId: string; branchId: string }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const { toast } = useToast();
  const [inv, setInv] = useState({ consultation_fee: "", discount: "0", tax: "0", other_charges: "0", notes: "" });
  const [pay, setPay] = useState({ amount: "", method: "cash", reference: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("invoices").select("*").eq("appointment_id", appointmentId).maybeSingle();
    setInvoice(data);
    if (data) {
      const { data: pays } = await (supabase as any).from("payments").select("*").eq("invoice_id", data.id).order("paid_at", { ascending: false });
      setPayments(pays || []);
    } else {
      setPayments([]);
    }
  };
  useEffect(() => { if (appointmentId) load(); }, [appointmentId]);

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fee = parseFloat(inv.consultation_fee) || 0;
      const disc = parseFloat(inv.discount) || 0;
      const tax = parseFloat(inv.tax) || 0;
      const other = parseFloat(inv.other_charges) || 0;
      const total = fee + tax + other - disc;
      const { error } = await (supabase as any).from("invoices").insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        branch_id: branchId,
        consultation_fee: fee,
        discount: disc,
        tax,
        other_charges: other,
        total,
        notes: inv.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Invoice created" });
      setInvoiceOpen(false);
      setInv({ consultation_fee: "", discount: "0", tax: "0", other_charges: "0", notes: "" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("payments").insert({
        invoice_id: invoice.id,
        amount: parseFloat(pay.amount),
        method: pay.method,
        reference: pay.reference || null,
        received_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setPay({ amount: "", method: "cash", reference: "" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const balance = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Billing</CardTitle>
          {!invoice && (
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                <form onSubmit={createInvoice} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Consultation Fee (₹) *</Label><Input required type="number" step="0.01" value={inv.consultation_fee} onChange={(e) => setInv({ ...inv, consultation_fee: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Discount (₹)</Label><Input type="number" step="0.01" value={inv.discount} onChange={(e) => setInv({ ...inv, discount: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Tax (₹)</Label><Input type="number" step="0.01" value={inv.tax} onChange={(e) => setInv({ ...inv, tax: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Other Charges (₹)</Label><Input type="number" step="0.01" value={inv.other_charges} onChange={(e) => setInv({ ...inv, other_charges: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1"><Label>Notes</Label><Input value={inv.notes} onChange={(e) => setInv({ ...inv, notes: e.target.value })} /></div>
                  <Button type="submit">Create</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!invoice ? (
          <p className="text-muted-foreground text-center py-6">No invoice for this appointment yet</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-muted-foreground">Consultation</p><p className="font-medium">{fmt(invoice.consultation_fee)}</p></div>
              <div><p className="text-muted-foreground">Discount</p><p className="font-medium">-{fmt(invoice.discount)}</p></div>
              <div><p className="text-muted-foreground">Tax + Other</p><p className="font-medium">{fmt(Number(invoice.tax) + Number(invoice.other_charges))}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="font-bold text-lg">{fmt(invoice.total)}</p></div>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Badge className={statusColor[invoice.status] || ""} variant="secondary">{invoice.status.toUpperCase()}</Badge>
                <span className="text-sm">Paid {fmt(invoice.amount_paid)} of {fmt(invoice.total)}</span>
                {balance > 0 && <span className="text-sm font-medium text-destructive">Balance {fmt(balance)}</span>}
              </div>
              {balance > 0 && (
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild><Button size="sm"><IndianRupee className="h-4 w-4 mr-1" />Record Payment</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                    <form onSubmit={addPayment} className="space-y-3">
                      <div className="space-y-1"><Label>Amount (₹) *</Label><Input required type="number" step="0.01" max={balance} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
                      <div className="space-y-1">
                        <Label>Method</Label>
                        <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Reference (txn id / receipt no.)</Label><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
                      <Button type="submit">Save Payment</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {payments.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">Payment history</p>
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm border rounded p-2">
                    <div>
                      <span className="font-medium">{fmt(p.amount)}</span>
                      <span className="text-muted-foreground ml-2">{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};