import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, FileText, Save, ArrowLeft, Camera, FileSignature, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { PatientPhotoUpload } from "@/components/PatientPhotoUpload";
import { ConsentCapture } from "@/components/ConsentCapture";
import { MedicalHistoryManager } from "@/components/MedicalHistoryManager";
import { PrescriptionManager } from "@/components/PrescriptionManager";

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [loading, setLoading] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [consentCaptureOpen, setConsentCaptureOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    insurance_provider: "",
    insurance_number: "",
    preferred_communication: "sms",
    notes: "",
    consent_signed: false,
    photo_url: null as string | null,
    photo_thumbnail_url: null as string | null,
    consent_document_url: null as string | null,
    consent_signed_at: null as string | null,
  });

  // Get signed URLs for private storage files
  const { signedUrl: photoSignedUrl } = useSignedUrl('patient-files', formData.photo_url);
  const { signedUrl: thumbnailSignedUrl } = useSignedUrl('patient-files', formData.photo_thumbnail_url);
  const { signedUrl: consentSignedUrl } = useSignedUrl('patient-files', formData.consent_document_url);

  useEffect(() => {
    if (!isNew && id) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) setFormData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("patients").insert({
          ...formData,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: "Patient created successfully",
        });
      } else {
        const { error } = await supabase
          .from("patients")
          .update(formData)
          .eq("id", id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Patient updated successfully",
        });
      }
      navigate("/patients");
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

  const getInitials = () => {
    return `${formData.first_name?.[0] || ""}${formData.last_name?.[0] || ""}`.toUpperCase();
  };

  const sendWhatsAppMessage = (message: string) => {
    const phoneNumber = formData.phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
  };

  const handleWhatsAppShare = (type: string) => {
    const patientName = `${formData.first_name} ${formData.last_name}`;
    let message = "";

    switch (type) {
      case "details":
        message = `Hello ${patientName},\n\nYour patient details have been updated in our system.\n\nIf you have any questions, please contact us.\n\nBest regards,\nDr. Prasanna's Clinic`;
        break;
      case "appointment":
        message = `Hello ${patientName},\n\nThis is a reminder about your upcoming appointment.\n\nPlease arrive 10 minutes early.\n\nBest regards,\nDr. Prasanna's Clinic`;
        break;
      case "prescription":
        message = `Hello ${patientName},\n\nYour prescription is ready. Please contact us for details.\n\nBest regards,\nDr. Prasanna's Clinic`;
        break;
      case "report":
        message = `Hello ${patientName},\n\nYour medical report is ready for collection.\n\nBest regards,\nDr. Prasanna's Clinic`;
        break;
      default:
        message = `Hello ${patientName},\n\nWe wanted to reach out to you.\n\nBest regards,\nDr. Prasanna's Clinic`;
    }

    sendWhatsAppMessage(message);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "New Patient" : "Patient Details"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Add a new patient to the system" : "View and edit patient information"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
              {!isNew && <TabsTrigger value="photo">Photo & Consent</TabsTrigger>}
              {!isNew && <TabsTrigger value="medical">Medical Records</TabsTrigger>}
              {!isNew && <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      {thumbnailSignedUrl && (
                        <AvatarImage src={thumbnailSignedUrl} alt={`${formData.first_name} ${formData.last_name}`} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getInitials() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {!isNew && formData.consent_signed && (
                      <Badge className="bg-success/10 text-success">Consent Signed</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth || ""}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact & Communication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name || ""}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        type="tel"
                        value={formData.emergency_contact_phone || ""}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_communication">Preferred Communication</Label>
                    <Select 
                      value={formData.preferred_communication} 
                      onValueChange={(value) => setFormData({ ...formData, preferred_communication: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insurance">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_provider">Insurance Provider</Label>
                      <Input
                        id="insurance_provider"
                        value={formData.insurance_provider || ""}
                        onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_number">Insurance Number</Label>
                      <Input
                        id="insurance_number"
                        value={formData.insurance_number || ""}
                        onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      placeholder="Add any additional notes about the patient..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {!isNew && (
              <TabsContent value="photo">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Patient Photo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-40 w-40">
                          {photoSignedUrl && (
                            <AvatarImage src={photoSignedUrl} alt={`${formData.first_name} ${formData.last_name}`} />
                          )}
                          <AvatarFallback className="bg-primary text-primary-foreground text-5xl">
                            {getInitials() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <Button onClick={() => setPhotoUploadOpen(true)} className="w-full">
                          <Camera className="mr-2 h-4 w-4" />
                          {formData.photo_url ? "Change Photo" : "Upload Photo"}
                        </Button>
                        {formData.photo_url && (
                          <p className="text-xs text-muted-foreground text-center">
                            Photo uploaded on {formData.photo_url ? new Date().toLocaleDateString() : ""}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileSignature className="h-5 w-5" />
                        Consent Form
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.consent_signed ? (
                        <div className="space-y-4">
                          <Badge className="bg-success/10 text-success">Consent Signed</Badge>
                          <p className="text-sm text-muted-foreground">
                            Signed on: {formData.consent_signed_at ? new Date(formData.consent_signed_at).toLocaleDateString() : "N/A"}
                          </p>
                          {consentSignedUrl && (
                            <Button variant="outline" className="w-full" asChild>
                              <a href={consentSignedUrl} target="_blank" rel="noopener noreferrer">
                                View Signature
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Badge variant="secondary">Consent Not Signed</Badge>
                          <p className="text-sm text-muted-foreground">
                            Patient has not signed the consent form yet.
                          </p>
                          <Button onClick={() => setConsentCaptureOpen(true)} className="w-full">
                            <FileSignature className="mr-2 h-4 w-4" />
                            Sign Consent
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {!isNew && (
              <TabsContent value="medical">
                <div className="space-y-6">
                  <MedicalHistoryManager patientId={id!} />
                  <PrescriptionManager 
                    patientId={id!} 
                    patientEmail={formData.email || undefined}
                  />
                </div>
              </TabsContent>
            )}

            {!isNew && (
              <TabsContent value="whatsapp">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Send quick messages to {formData.first_name} via WhatsApp
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleWhatsAppShare("details")}
                        className="w-full justify-start"
                        disabled={!formData.phone}
                      >
                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                        Share Patient Details
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleWhatsAppShare("appointment")}
                        className="w-full justify-start"
                        disabled={!formData.phone}
                      >
                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                        Send Appointment Reminder
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleWhatsAppShare("prescription")}
                        className="w-full justify-start"
                        disabled={!formData.phone}
                      >
                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                        Share Prescription Info
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleWhatsAppShare("report")}
                        className="w-full justify-start"
                        disabled={!formData.phone}
                      >
                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                        Share Medical Report
                      </Button>
                    </div>
                    {!formData.phone && (
                      <p className="text-xs text-destructive mt-4">
                        Please add a phone number to enable WhatsApp sharing
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/patients")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : isNew ? "Create Patient" : "Save Changes"}
            </Button>
          </div>
        </form>

        {!isNew && (
          <>
            <PatientPhotoUpload
              open={photoUploadOpen}
              onOpenChange={setPhotoUploadOpen}
              patientId={id!}
              onUploadComplete={(photoUrl, thumbnailUrl) => {
                setFormData({ ...formData, photo_url: photoUrl, photo_thumbnail_url: thumbnailUrl });
              }}
            />
            <ConsentCapture
              open={consentCaptureOpen}
              onOpenChange={setConsentCaptureOpen}
              patientId={id!}
              patientName={`${formData.first_name} ${formData.last_name}`}
              onConsentComplete={(consentUrl) => {
                setFormData({
                  ...formData,
                  consent_signed: true,
                  consent_signed_at: new Date().toISOString(),
                  consent_document_url: consentUrl,
                });
              }}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientDetail;
