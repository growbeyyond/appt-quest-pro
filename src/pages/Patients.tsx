import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

const Patients = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      setPatients(data || []);
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const search = searchTerm.toLowerCase();
    return (
      patient.first_name?.toLowerCase().includes(search) ||
      patient.last_name?.toLowerCase().includes(search) ||
      patient.phone?.includes(search) ||
      patient.email?.toLowerCase().includes(search) ||
      patient.patient_number?.toLowerCase().includes(search)
    );
  });

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = data.map((patient) => ({
        "Patient ID": patient.patient_number,
        "First Name": patient.first_name,
        "Last Name": patient.last_name,
        Phone: patient.phone,
        Email: patient.email || "",
        Gender: patient.gender || "",
        "Date of Birth": patient.date_of_birth || "",
        Address: patient.address || "",
        "Emergency Contact Name": patient.emergency_contact_name || "",
        "Emergency Contact Phone": patient.emergency_contact_phone || "",
        "Insurance Provider": patient.insurance_provider || "",
        "Insurance Number": patient.insurance_number || "",
        Notes: patient.notes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Patients");
      
      XLSX.writeFile(wb, `patients_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} patients to Excel file.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export patient data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const patientsToImport = jsonData.map((row: any) => ({
        first_name: row["First Name"] || row["first_name"],
        last_name: row["Last Name"] || row["last_name"],
        phone: row["Phone"] || row["phone"],
        email: row["Email"] || row["email"] || null,
        gender: row["Gender"] || row["gender"] || null,
        date_of_birth: row["Date of Birth"] || row["date_of_birth"] || null,
        address: row["Address"] || row["address"] || null,
        emergency_contact_name: row["Emergency Contact Name"] || row["emergency_contact_name"] || null,
        emergency_contact_phone: row["Emergency Contact Phone"] || row["emergency_contact_phone"] || null,
        insurance_provider: row["Insurance Provider"] || row["insurance_provider"] || null,
        insurance_number: row["Insurance Number"] || row["insurance_number"] || null,
        notes: row["Notes"] || row["notes"] || null,
      }));

      // Validate required fields
      const validPatients = patientsToImport.filter(
        (p) => p.first_name && p.last_name && p.phone
      );

      if (validPatients.length === 0) {
        toast({
          title: "Import Failed",
          description: "No valid patient records found. Please ensure First Name, Last Name, and Phone are provided.",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate phone numbers within the import file
      const phoneNumbers = validPatients.map(p => p.phone);
      const duplicatesInFile = phoneNumbers.filter((phone, index) => 
        phoneNumbers.indexOf(phone) !== index
      );

      if (duplicatesInFile.length > 0) {
        toast({
          title: "Duplicate Phone Numbers Found",
          description: `Found ${duplicatesInFile.length} duplicate phone number(s) in the file: ${[...new Set(duplicatesInFile)].join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Check for existing phone numbers in database
      const { data: existingPatients, error: checkError } = await supabase
        .from("patients")
        .select("phone")
        .in("phone", phoneNumbers);

      if (checkError) throw checkError;

      if (existingPatients && existingPatients.length > 0) {
        const existingPhones = existingPatients.map(p => p.phone);
        toast({
          title: "Duplicate Phone Numbers Detected",
          description: `${existingPatients.length} phone number(s) already exist in database: ${existingPhones.join(", ")}. Please remove duplicates and try again.`,
          variant: "destructive",
        });
        return;
      }

      // Proceed with import if no duplicates
      const { error } = await supabase.from("patients").insert(validPatients);

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Successfully imported ${validPatients.length} patients with no duplicates.`,
      });

      loadPatients();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: "Could not import patient data. Please check the file format.",
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground">
              Manage patient records and information
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </Button>
            <Button onClick={() => navigate("/patients/new")}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Patient
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Patients ({filteredPatients.length})
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, phone, or email..."
                aria-label="Search patients"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading patients...</p>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {searchTerm ? "No patients found" : "No patients yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Add your first patient to get started"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getPatientInitials(patient.first_name, patient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </p>
                        {patient.patient_number && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {patient.patient_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {patient.phone} {patient.email && `• ${patient.email}`}
                      </p>
                    </div>
                    {patient.consent_signed && (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Consent Signed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Patients;
