import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MedicalHistory {
  id: string;
  history_type: string;
  title: string;
  description: string | null;
  severity: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface MedicalHistoryManagerProps {
  patientId: string;
  appointmentId?: string;
}

export const MedicalHistoryManager = ({
  patientId,
  appointmentId,
}: MedicalHistoryManagerProps) => {
  const [history, setHistory] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    history_type: "diagnosis",
    title: "",
    description: "",
    severity: "moderate",
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, [patientId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("medical_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("medical_history").insert([
        {
          patient_id: patientId,
          doctor_id: user.id,
          appointment_id: appointmentId,
          ...formData,
          end_date: formData.end_date || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medical history entry added",
      });

      setDialogOpen(false);
      setFormData({
        history_type: "diagnosis",
        title: "",
        description: "",
        severity: "moderate",
        status: "active",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
      });
      loadHistory();
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical History
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Medical History Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="history_type">Type</Label>
                    <Select
                      value={formData.history_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, history_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="allergy">Allergy</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) =>
                        setFormData({ ...formData, severity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (Optional)</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Add Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No medical history entries yet
            </p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{entry.title}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="capitalize">
                        {entry.history_type}
                      </Badge>
                      {entry.severity && (
                        <Badge
                          variant={
                            entry.severity === "severe"
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {entry.severity}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          entry.status === "active" ? "default" : "outline"
                        }
                        className="capitalize"
                      >
                        {entry.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground">
                    {entry.description}
                  </p>
                )}
                {entry.start_date && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {new Date(entry.start_date).toLocaleDateString()}
                    {entry.end_date &&
                      ` - ${new Date(entry.end_date).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
