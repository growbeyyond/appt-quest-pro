import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { DailyFollowupPopup } from "@/components/DailyFollowupPopup";
import { BranchSelector } from "@/components/BranchSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from "date-fns";
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

type ViewMode = "day" | "week" | "month";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Month view days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode, selectedBranch]);

  const loadData = async () => {
    setLoading(true);
    try {
      let startDate: string, endDate: string;
      
      if (viewMode === "day") {
        startDate = format(currentDate, "yyyy-MM-dd");
        endDate = startDate;
      } else if (viewMode === "week") {
        startDate = format(weekStart, "yyyy-MM-dd");
        endDate = format(endOfWeek(currentDate, { weekStartsOn: 0 }), "yyyy-MM-dd");
      } else {
        startDate = format(monthStart, "yyyy-MM-dd");
        endDate = format(monthEnd, "yyyy-MM-dd");
      }

      let apptQuery = supabase
        .from("appointments")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_time", { ascending: true });

      if (selectedBranch !== "all") {
        apptQuery = apptQuery.eq("branch_id", selectedBranch);
      }

      let followupQuery = supabase
        .from("followups")
        .select(`
          *,
          patients (first_name, last_name, phone)
        `)
        .eq("status", "pending")
        .gte("followup_date", startDate)
        .lte("followup_date", endDate);

      if (selectedBranch !== "all") {
        followupQuery = followupQuery.eq("branch_id", selectedBranch);
      }

      const { data: apptData } = await apptQuery;
      const { data: followupData } = await followupQuery;

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

  const navigatePrev = () => {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, -1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const getDateRangeLabel = () => {
    if (viewMode === "day") return format(currentDate, "MMMM d, yyyy");
    if (viewMode === "week") return `${format(weekStart, "MMM dd")} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMM dd, yyyy")}`;
    return format(currentDate, "MMMM yyyy");
  };

  const handleSlotClick = (date: Date, hour?: number) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "09:00";
    navigate(`/appointments/new?date=${dateStr}&time=${timeStr}${selectedBranch !== "all" ? `&branch=${selectedBranch}` : ""}`);
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
              View and manage appointments
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BranchSelector 
              value={selectedBranch} 
              onChange={setSelectedBranch} 
              showAll={true}
            />
            <Button onClick={() => navigate("/appointments/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* View Mode Toggle & Navigation */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <TabsList>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {getDateRangeLabel()}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading calendar...</p>
            ) : viewMode === "month" ? (
              /* Month View */
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {/* Padding for start of month */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="p-2" />
                ))}
                {monthDays.map((day) => {
                  const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.appointment_date), day));
                  const dayFollowups = getFollowupsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[80px] p-2 border border-border rounded cursor-pointer hover:bg-muted/50 ${isToday ? "bg-primary/10" : ""}`}
                      onClick={() => handleDateClick(day)}
                    >
                      <div className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                      {dayAppts.length > 0 && (
                        <Badge variant="secondary" className="bg-info/10 text-info text-[10px] mt-1">{dayAppts.length} appt</Badge>
                      )}
                      {dayFollowups.length > 0 && (
                        <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px] mt-1">{dayFollowups.length} F/U</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "day" ? (
              /* Day View */
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="border border-border rounded-lg overflow-hidden">
                  {timeSlots.map((hour) => {
                    const slotAppointments = getAppointmentsForSlot(currentDate, hour);
                    const slotId = `${format(currentDate, "yyyy-MM-dd")}_${hour.toString().padStart(2, "0")}`;
                    return (
                      <div key={hour} className="flex border-b border-border last:border-b-0">
                        <div className="w-16 text-xs text-muted-foreground p-2 bg-muted/30 flex items-start justify-end">
                          {format(new Date().setHours(hour, 0), "ha")}
                        </div>
                        <div
                          className="flex-1 min-h-[60px] p-1 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleSlotClick(currentDate, hour)}
                        >
                          {slotAppointments.map((appt) => (
                            <div
                              key={appt.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/appointments/${appt.id}`); }}
                              className={`p-2 rounded border mb-1 text-xs cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appt.status)}`}
                            >
                              <div className="font-medium">{appt.patients?.first_name} {appt.patients?.last_name}</div>
                              <div className="text-[10px] opacity-80">{appt.appointment_time} • {appt.duration_minutes}m</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DndContext>
            ) : (
              /* Week View */
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
                                className="min-h-[60px] p-1 hover:bg-muted/50 transition-colors border-l border-border cursor-pointer"
                                onClick={() => handleSlotClick(day, hour)}
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
                                    onClick={(e) => { e.stopPropagation(); navigate(`/appointments/${appt.id}`); }}
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
