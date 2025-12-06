import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Bell, Clock, Check } from "lucide-react";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
}

export const DashboardReminders = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUpcomingAppointments();
  }, []);

  const loadUpcomingAppointments = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

      // Get today's and tomorrow's scheduled appointments
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patients (id, first_name, last_name, phone)
        `)
        .in("appointment_date", [today, tomorrow])
        .eq("status", "scheduled")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setUpcomingAppointments(data || []);
    } catch (error) {
      console.error("Error loading upcoming appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppReminder = (appointment: Appointment) => {
    const patient = appointment.patients;
    if (!patient?.phone) {
      toast({
        title: "Error",
        description: "Patient phone number not available",
        variant: "destructive",
      });
      return;
    }

    const dateLabel = isToday(new Date(appointment.appointment_date))
      ? "today"
      : isTomorrow(new Date(appointment.appointment_date))
        ? "tomorrow"
        : format(new Date(appointment.appointment_date), "EEEE, MMMM d");

    const message = `Hello ${patient.first_name},\n\nThis is a reminder for your appointment at Dr. Prasanna Clinic ${dateLabel} at ${appointment.appointment_time}.\n\nPlease arrive 10 minutes early.\n\nThank you!`;

    const phone = patient.phone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    // Mark as sent locally
    setSentReminders((prev) => new Set([...prev, appointment.id]));

    toast({
      title: "WhatsApp opened",
      description: `Reminder prepared for ${patient.first_name}`,
    });
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getDateBadge = (date: string) => {
    if (isToday(new Date(date))) {
      return (
        <Badge variant="secondary" className="bg-warning/10 text-warning">
          Today
        </Badge>
      );
    }
    if (isTomorrow(new Date(date))) {
      return (
        <Badge variant="secondary" className="bg-info/10 text-info">
          Tomorrow
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        {format(new Date(date), "MMM d")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Appointment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (upcomingAppointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Appointment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Check className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-muted-foreground">No upcoming appointments to remind</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Appointment Reminders
          <Badge variant="secondary" className="ml-auto">
            {upcomingAppointments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => {
            const isSent = sentReminders.has(appointment.id);
            return (
              <div
                key={appointment.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getPatientInitials(
                      appointment.patients?.first_name,
                      appointment.patients?.last_name
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {appointment.patients?.first_name} {appointment.patients?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {appointment.appointment_time}
                  </p>
                </div>
                {getDateBadge(appointment.appointment_date)}
                <Button
                  size="sm"
                  variant={isSent ? "outline" : "default"}
                  className={isSent ? "text-success border-success" : "bg-green-600 hover:bg-green-700"}
                  onClick={() => handleWhatsAppReminder(appointment)}
                >
                  {isSent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
