import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { SignaturePad } from './SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from './ui/checkbox';

interface ConsentCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onConsentComplete: (consentUrl: string) => void;
}

export const ConsentCapture: React.FC<ConsentCaptureProps> = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  onConsentComplete,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (signatureBlob: Blob) => {
    if (!agreed) {
      toast.error('Please agree to the terms before signing');
      return;
    }

    setIsSaving(true);

    try {
      const timestamp = Date.now();
      const consentPath = `${patientId}/consent/signature_${timestamp}.png`;

      // Upload signature
      const { error: uploadError } = await supabase.storage
        .from('patient-files')
        .upload(consentPath, signatureBlob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('patient-files')
        .getPublicUrl(consentPath);

      // Update patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          consent_signed: true,
          consent_signed_at: new Date().toISOString(),
          consent_document_url: urlData.publicUrl,
        })
        .eq('id', patientId);

      if (updateError) throw updateError;

      toast.success('Consent captured successfully');
      onConsentComplete(urlData.publicUrl);
      onOpenChange(false);
      setAgreed(false);
    } catch (error) {
      console.error('Consent capture error:', error);
      toast.error('Failed to save consent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setAgreed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Patient Consent Form</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Medical Records Consent Agreement</h3>
            <p className="text-sm text-muted-foreground mb-2">
              I, {patientName}, hereby consent to the following:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Collection and storage of my medical photographs and records</li>
              <li>Use of my medical information for treatment purposes</li>
              <li>Storage of my personal health information in secure digital systems</li>
              <li>Sharing of my medical records with authorized healthcare providers</li>
              <li>Communication regarding appointments and follow-up care</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              I understand that my information will be kept confidential and used only for
              medical purposes in accordance with applicable privacy laws.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label
              htmlFor="consent-agree"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the terms above
            </label>
          </div>

          {agreed && (
            <SignaturePad onSave={handleSave} onCancel={handleCancel} />
          )}

          {isSaving && (
            <div className="text-center text-sm text-muted-foreground">
              Saving consent...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
