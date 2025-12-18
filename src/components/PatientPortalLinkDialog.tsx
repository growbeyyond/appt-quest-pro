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
import { Copy, Link, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface PatientPortalLinkDialogProps {
  patientId: string;
  patientName: string;
  patientPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientPortalLinkDialog({
  patientId,
  patientName,
  patientPhone,
  open,
  onOpenChange,
}: PatientPortalLinkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      // Generate a unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

      // Check if portal access exists
      const { data: existing } = await supabase
        .from("patient_portal_access")
        .select("id")
        .eq("patient_id", patientId)
        .single();

      if (existing) {
        // Update existing token
        const { error } = await supabase
          .from("patient_portal_access")
          .update({
            login_token: token,
            token_expires_at: expiresAt.toISOString(),
          })
          .eq("patient_id", patientId);

        if (error) throw error;
      } else {
        // Create new portal access
        const { error } = await supabase
          .from("patient_portal_access")
          .insert({
            patient_id: patientId,
            login_token: token,
            token_expires_at: expiresAt.toISOString(),
          });

        if (error) throw error;
      }

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/patient-portal?token=${token}`;
      setPortalLink(link);
      toast.success("Portal link generated successfully");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate portal link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!portalLink) return;
    try {
      await navigator.clipboard.writeText(portalLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const sendViaWhatsApp = () => {
    if (!portalLink) return;
    const message = `Hi ${patientName},\n\nYou can access your patient portal using this link:\n${portalLink}\n\nThis link is valid for 7 days.\n\nBest regards,\nDr. Prasanna's Clinic`;
    const whatsappUrl = `https://wa.me/${patientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setPortalLink(null);
        setCopied(false);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Patient Portal Access
          </DialogTitle>
          <DialogDescription>
            Generate a secure link for {patientName} to access their patient portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!portalLink ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a secure one-time link that allows the patient to view their appointments, 
                prescriptions, and medical history.
              </p>
              <Button onClick={generateLink} disabled={loading} className="w-full">
                {loading ? "Generating..." : "Generate Portal Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Portal Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={portalLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link expires in 7 days.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1 gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  onClick={sendViaWhatsApp}
                  disabled={!patientPhone}
                  className="flex-1 gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
