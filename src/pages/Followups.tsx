import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, AlertCircle, Phone, MessageCircle, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Followups = () => {
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowups();
  }, []);

  const loadFollowups = async () => {
    try {
      const { data } = await supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .order("followup_date", { ascending: true });

      setFollowups(data || []);
    } catch (error) {
      console.error("Error loading followups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (followupId: string) => {
    try {
      const { error } = await supabase
        .from("followups")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", followupId);

      if (error) throw error;
      toast.success("Follow-up marked as done");
      loadFollowups();
    } catch (error) {
      console.error("Error marking followup done:", error);
      toast.error("Failed to mark follow-up as done");
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string, patientName: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hello ${patientName}, this is a follow-up call from Dr. Prasanna's clinic.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      contacted: "bg-info/10 text-info",
      done: "bg-success/10 text-success",
      snoozed: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status}
      </Badge>
    );
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const pendingFollowups = followups.filter((f) => f.status === "pending");
  const completedFollowups = followups.filter((f) => f.status === "done");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground">
            Manage patient follow-up reminders and contacts
          </p>
        </div>

        {pendingFollowups.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                Pending Follow-ups ({pendingFollowups.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-warning text-warning-foreground">
                        {getPatientInitials(
                          followup.patients?.first_name,
                          followup.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {followup.patients?.first_name}{" "}
                        {followup.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {followup.reason}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(followup.followup_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(followup.status)}
                      {followup.urgency === "high" && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                      {followup.patients?.phone && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCall(followup.patients.phone)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleWhatsApp(
                                followup.patients.phone,
                                `${followup.patients.first_name} ${followup.patients.last_name}`
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkDone(followup.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              All Follow-ups ({followups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading follow-ups...
              </p>
            ) : followups.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No follow-ups scheduled
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Follow-ups will appear here when doctors flag patients for follow-up
                </p>
              </div>
            ) : completedFollowups.length > 0 ? (
              <div className="space-y-4">
                {completedFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border opacity-60"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-success text-success-foreground">
                        {getPatientInitials(
                          followup.patients?.first_name,
                          followup.patients?.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {followup.patients?.first_name}{" "}
                        {followup.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {followup.reason}
                      </p>
                    </div>
                    {getStatusBadge(followup.status)}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Followups;
