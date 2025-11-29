import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { DailyFollowupPopup } from "@/components/DailyFollowupPopup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";

const Calendar = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [followupPopupOpen, setFollowupPopupOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  const loadData = async () => {
    setLoading(true);
    try {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

      const { data: apptData } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .order("appointment_time", { ascending: true });

      const { data: followupData } = await supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .eq("status", "pending")
        .gte("followup_date", format(weekStart, "yyyy-MM-dd"))
        .lte("followup_date", format(weekEnd, "yyyy-MM-dd"));

      setAppointments(apptData || []);
      setFollowups(followupData || []);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const appointmentId = active.id as string;
    const [newDate, newTime] = (over.id as string).split("_");
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: newDate,
          appointment_time: `${newTime}:00`,
        })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment rescheduled successfully",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActiveId(null);
    }
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter((appt) => {
      const apptDate = parseISO(appt.appointment_date);
      const apptHour = parseInt(appt.appointment_time.split(":")[0]);
      return isSameDay(apptDate, date) && apptHour === hour;
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-info/10 text-info border-info/20",
      checked_in: "bg-warning/10 text-warning border-warning/20",
      in_consultation: "bg-secondary/10 text-secondary border-secondary/20",
      completed: "bg-success/10 text-success border-success/20",
      no_show: "bg-destructive/10 text-destructive border-destructive/20",
      cancelled: "bg-muted text-muted-foreground border-border",
    };
    return colors[status] || "";
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getFollowupsForDate = (date: Date) => {
    return followups.filter((f) => isSameDay(parseISO(f.followup_date), date));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFollowupPopupOpen(true);
  };

  const activeAppointment = appointments.find((a) => a.id === activeId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">
              View and manage appointments by week
            </p>
          </div>
          <Button onClick={() => navigate("/appointments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(weekStart, "MMM dd")} - {format(endOfWeek(currentWeek, { weekStartsOn: 0 }), "MMM dd, yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading calendar...</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      <div className="text-xs font-medium text-muted-foreground p-2">Time</div>
                      {weekDays.map((day) => {
                        const dayFollowups = getFollowupsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={day.toISOString()}
                            className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                              isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            }`}
                            onClick={() => handleDateClick(day)}
                          >
                            <div className="text-xs font-medium">
                              {format(day, "EEE")}
                            </div>
                            <div className={`text-lg font-bold ${isToday ? "" : "text-foreground"}`}>
                              {format(day, "d")}
                            </div>
                            {dayFollowups.length > 0 && (
                              <Badge variant="secondary" className="bg-warning/10 text-warning text-xs mt-1">
                                {dayFollowups.length} F/U
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Time Slots */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      {timeSlots.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 gap-1 border-b border-border last:border-b-0">
                          <div className="text-xs text-muted-foreground p-2 bg-muted/30 flex items-start justify-end">
                            {format(new Date().setHours(hour, 0), "ha")}
                          </div>
                          {weekDays.map((day) => {
                            const slotAppointments = getAppointmentsForSlot(day, hour);
                            const slotId = `${format(day, "yyyy-MM-dd")}_${hour.toString().padStart(2, "0")}`;
                            
                            return (
                              <div
                                key={slotId}
                                data-slot-id={slotId}
                                className="min-h-[60px] p-1 hover:bg-muted/50 transition-colors border-l border-border"
                              >
                                {slotAppointments.map((appt) => (
                                  <div
                                    key={appt.id}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = "move";
                                      handleDragStart({ active: { id: appt.id } } as any);
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      handleDragEnd({
                                        active: { id: appt.id },
                                        over: { id: slotId },
                                      } as any);
                                    }}
                                    onClick={() => navigate(`/appointments/${appt.id}`)}
                                    className={`p-2 rounded border mb-1 text-xs cursor-move hover:shadow-md transition-shadow ${getStatusColor(
                                      appt.status
                                    )}`}
                                  >
                                    <div className="flex items-center gap-1 mb-1">
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-[8px]">
                                          {getPatientInitials(
                                            appt.patients?.first_name,
                                            appt.patients?.last_name
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium truncate">
                                        {appt.patients?.first_name} {appt.patients?.last_name}
                                      </span>
                                    </div>
                                    <div className="text-[10px] opacity-80">
                                      {appt.appointment_time} • {appt.duration_minutes}m
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DragOverlay>
                  {activeId && activeAppointment && (
                    <div className={`p-2 rounded border shadow-lg ${getStatusColor(activeAppointment.status)}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">
                            {getPatientInitials(
                              activeAppointment.patients?.first_name,
                              activeAppointment.patients?.last_name
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs">
                          {activeAppointment.patients?.first_name} {activeAppointment.patients?.last_name}
                        </span>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="bg-info/10 text-info">Scheduled</Badge>
              <Badge variant="secondary" className="bg-warning/10 text-warning">Checked In</Badge>
              <Badge variant="secondary" className="bg-secondary/10 text-secondary">In Consultation</Badge>
              <Badge variant="secondary" className="bg-success/10 text-success">Completed</Badge>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">No Show</Badge>
              <Badge variant="secondary" className="bg-muted text-muted-foreground">Cancelled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <DailyFollowupPopup
        date={format(selectedDate, 'yyyy-MM-dd')}
        open={followupPopupOpen}
        onOpenChange={setFollowupPopupOpen}
      />
    </DashboardLayout>
  );
};

export default Calendar;
