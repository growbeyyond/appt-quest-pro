import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, Download, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: any;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  user_name?: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAuditLogs();
    loadUserProfiles();
  }, []);

  const loadUserProfiles = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      if (data) {
        const profiles: Record<string, string> = {};
        data.forEach(p => {
          profiles[p.id] = p.full_name || p.email || "Unknown";
        });
        setUserProfiles(profiles);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    let variant = "";
    
    if (actionLower.includes("create") || actionLower.includes("insert")) {
      variant = "bg-success/10 text-success";
    } else if (actionLower.includes("update") || actionLower.includes("change")) {
      variant = "bg-info/10 text-info";
    } else if (actionLower.includes("delete") || actionLower.includes("remove")) {
      variant = "bg-destructive/10 text-destructive";
    } else if (actionLower.includes("login") || actionLower.includes("auth")) {
      variant = "bg-secondary/10 text-secondary";
    } else {
      variant = "bg-muted text-muted-foreground";
    }

    return (
      <Badge variant="secondary" className={variant}>
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_id.toLowerCase().includes(searchLower) ||
      (userProfiles[log.user_id] || "").toLowerCase().includes(searchLower);
    
    const logDate = new Date(log.created_at);
    const matchesStartDate = !startDate || logDate >= new Date(startDate);
    const matchesEndDate = !endDate || logDate <= new Date(endDate + "T23:59:59");
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "User", "Entity Type", "Action", "Entity ID", "IP Address", "Changes"].join(","),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        userProfiles[log.user_id] || log.user_id,
        log.entity_type,
        log.action,
        log.entity_id,
        log.ip_address || "",
        JSON.stringify(log.changes || {}).replace(/,/g, ";")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit logs exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">
              View system activity and changes
            </p>
          </div>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs by user, action, entity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[140px]"
                    placeholder="Start date"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[140px]"
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">
                Loading audit logs...
              </p>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {userProfiles[log.user_id] || "System"}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {log.entity_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.entity_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entity Type</p>
                  <p className="font-medium capitalize">{selectedLog.entity_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{userProfiles[selectedLog.user_id] || "System"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), "MMM dd, yyyy HH:mm:ss")}</p>
                </div>
                {selectedLog.ip_address && (
                  <div>
                    <p className="text-muted-foreground">IP Address</p>
                    <p className="font-medium">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Changes</p>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-[300px]">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AuditLogs;