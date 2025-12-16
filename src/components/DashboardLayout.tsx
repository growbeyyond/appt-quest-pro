import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  Calendar,
  Users,
  ClipboardList,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  ScrollText,
  Clock,
  Pill,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      setUserRole(roleData?.role || null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  // Role-specific navigation items
  const getNavItems = () => {
    const commonItems = [
      { icon: Activity, label: "Dashboard", path: "/dashboard" },
    ];

    const receptionistItems = [
      { icon: Calendar, label: "Calendar", path: "/calendar" },
      { icon: Users, label: "Patients", path: "/patients" },
      { icon: ClipboardList, label: "Appointments", path: "/appointments" },
      { icon: Clock, label: "Queue", path: "/queue" },
      { icon: Bell, label: "Follow-ups", path: "/followups" },
      { icon: Users, label: "Waitlist", path: "/waitlist" },
      { icon: Calendar, label: "Reschedule", path: "/reschedule-requests" },
    ];

    const doctorItems = [
      { icon: Calendar, label: "Calendar", path: "/calendar" },
      { icon: Users, label: "Patients", path: "/patients" },
      { icon: ClipboardList, label: "Appointments", path: "/appointments" },
      { icon: Clock, label: "Queue", path: "/queue" },
      { icon: Bell, label: "Follow-ups", path: "/followups" },
      { icon: Pill, label: "Rx Templates", path: "/prescription-templates" },
    ];

    const adminItems = [
      { icon: Calendar, label: "Calendar", path: "/calendar" },
      { icon: Users, label: "Patients", path: "/patients" },
      { icon: ClipboardList, label: "Appointments", path: "/appointments" },
      { icon: Clock, label: "Queue", path: "/queue" },
      { icon: Bell, label: "Follow-ups", path: "/followups" },
      { icon: Users, label: "Waitlist", path: "/waitlist" },
      { icon: Calendar, label: "Reschedule", path: "/reschedule-requests" },
      { icon: Pill, label: "Rx Templates", path: "/prescription-templates" },
      { icon: BarChart3, label: "Reports", path: "/reports" },
      { icon: Building2, label: "Branches", path: "/branches" },
      { icon: UserCog, label: "Users", path: "/users" },
      { icon: ScrollText, label: "Audit Logs", path: "/audit-logs" },
    ];

    const settingsItem = { icon: Settings, label: "Settings", path: "/settings" };

    switch (userRole) {
      case "receptionist":
        return [...commonItems, ...receptionistItems, settingsItem];
      case "doctor":
        return [...commonItems, ...doctorItems, settingsItem];
      case "admin":
        return [...commonItems, ...adminItems, settingsItem];
      default:
        return [...commonItems, settingsItem];
    }
  };

  const navItems = getNavItems();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="Dr. Prasanna's Clinic" 
                className="h-12 w-12 rounded-lg object-cover shadow-md"
              />
              <div className="hidden md:block">
                <span className="font-bold text-lg text-primary">
                  Dr. Prasanna's
                </span>
                <p className="text-xs text-secondary font-medium -mt-0.5">
                  PCOS & Thyrocure Homeopathy
                </p>
              </div>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background md:hidden">
          <nav className="flex flex-col p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop Navigation + Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;