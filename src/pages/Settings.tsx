import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Clock, Shield, MessageSquare, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  // Clinic settings (stored in localStorage for now - can be moved to DB later)
  const [clinicSettings, setClinicSettings] = useState({
    defaultAppointmentDuration: "30",
    bufferMinutes: "10",
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    requireConsentBeforePhoto: true,
    photoRetentionDays: "365",
    enableSmsReminders: false,
    reminderTemplate24h: "Hello {patient_name}, this is a reminder for your appointment tomorrow at {time}. Please reply to confirm.",
    reminderTemplate1h: "Hello {patient_name}, your appointment is in 1 hour at {time}. See you soon!",
  });

  useEffect(() => {
    loadProfile();
    loadClinicSettings();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
    }
    setUserRole(roleData?.role || null);
  };

  const loadClinicSettings = () => {
    const saved = localStorage.getItem("clinicSettings");
    if (saved) {
      setClinicSettings({ ...clinicSettings, ...JSON.parse(saved) });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      loadProfile();
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

  const handleSaveClinicSettings = () => {
    localStorage.setItem("clinicSettings", JSON.stringify(clinicSettings));
    toast({
      title: "Success",
      description: "Clinic settings saved successfully",
    });
  };

  const toggleWorkingDay = (day: string) => {
    setClinicSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and clinic preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {userRole === "admin" && (
              <>
                <TabsTrigger value="appointments">
                  <Clock className="h-4 w-4 mr-2" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="privacy">
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger value="reminders">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reminders
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Clinic Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Branch Management</p>
                    <p className="text-sm text-muted-foreground">
                      Manage clinic branches and locations
                    </p>
                  </div>
                  <Button onClick={() => navigate('/branches')}>
                    Manage Branches
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">User Management</p>
                    <p className="text-sm text-muted-foreground">
                      Manage staff members and their roles
                    </p>
                  </div>
                  <Button onClick={() => navigate('/users')}>
                    Manage Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {userRole === "admin" && (
            <>
              <TabsContent value="appointments">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Appointment Settings
                    </CardTitle>
                    <CardDescription>Configure default appointment durations and working hours</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Appointment Duration (minutes)</Label>
                        <Select 
                          value={clinicSettings.defaultAppointmentDuration} 
                          onValueChange={(v) => setClinicSettings({...clinicSettings, defaultAppointmentDuration: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Buffer Between Appointments (minutes)</Label>
                        <Select 
                          value={clinicSettings.bufferMinutes} 
                          onValueChange={(v) => setClinicSettings({...clinicSettings, bufferMinutes: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Working Hours</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Start Time</Label>
                          <Input 
                            type="time" 
                            value={clinicSettings.workingHoursStart}
                            onChange={(e) => setClinicSettings({...clinicSettings, workingHoursStart: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">End Time</Label>
                          <Input 
                            type="time" 
                            value={clinicSettings.workingHoursEnd}
                            onChange={(e) => setClinicSettings({...clinicSettings, workingHoursEnd: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Working Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={clinicSettings.workingDays.includes(day) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleWorkingDay(day)}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleSaveClinicSettings}>Save Appointment Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Privacy Settings
                    </CardTitle>
                    <CardDescription>Configure patient data privacy and consent settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Consent Before Photo Upload</Label>
                        <p className="text-sm text-muted-foreground">
                          Patients must sign consent before their photo can be captured
                        </p>
                      </div>
                      <Switch
                        checked={clinicSettings.requireConsentBeforePhoto}
                        onCheckedChange={(checked) => setClinicSettings({...clinicSettings, requireConsentBeforePhoto: checked})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Photo Retention Period (days)</Label>
                      <Select 
                        value={clinicSettings.photoRetentionDays} 
                        onValueChange={(v) => setClinicSettings({...clinicSettings, photoRetentionDays: v})}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                          <SelectItem value="730">2 years</SelectItem>
                          <SelectItem value="forever">Forever</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Patient photos will be automatically deleted after this period
                      </p>
                    </div>

                    <Button onClick={handleSaveClinicSettings}>Save Privacy Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reminders">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Reminder Templates
                    </CardTitle>
                    <CardDescription>Configure WhatsApp reminder message templates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable SMS/WhatsApp Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Show reminder buttons on dashboard
                        </p>
                      </div>
                      <Switch
                        checked={clinicSettings.enableSmsReminders}
                        onCheckedChange={(checked) => setClinicSettings({...clinicSettings, enableSmsReminders: checked})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>24-Hour Reminder Template</Label>
                      <Input 
                        value={clinicSettings.reminderTemplate24h}
                        onChange={(e) => setClinicSettings({...clinicSettings, reminderTemplate24h: e.target.value})}
                        placeholder="Hello {patient_name}, reminder for tomorrow..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {"{patient_name}"}, {"{date}"}, {"{time}"}, {"{doctor}"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>1-Hour Reminder Template</Label>
                      <Input 
                        value={clinicSettings.reminderTemplate1h}
                        onChange={(e) => setClinicSettings({...clinicSettings, reminderTemplate1h: e.target.value})}
                        placeholder="Hello {patient_name}, your appointment is in 1 hour..."
                      />
                    </div>

                    <Button onClick={handleSaveClinicSettings}>Save Reminder Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
