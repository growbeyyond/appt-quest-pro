import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Stethoscope, Users, User } from "lucide-react";

interface RoleDescriptionProps {
  role: string;
}

export const RoleDescription = ({ role }: RoleDescriptionProps) => {
  const getRoleInfo = () => {
    switch (role) {
      case "admin":
        return {
          icon: Shield,
          title: "Admin",
          description: "Full system access including user management, branch settings, and all clinical functions",
          permissions: ["Manage users and roles", "Configure branches", "Access all records", "View audit logs"],
          color: "text-red-600 bg-red-50 border-red-200",
        };
      case "doctor":
        return {
          icon: Stethoscope,
          title: "Doctor",
          description: "Clinical access for consultations, prescriptions, and medical records",
          permissions: ["View appointments", "Create prescriptions", "Update medical records", "Request patient consent"],
          color: "text-blue-600 bg-blue-50 border-blue-200",
        };
      case "receptionist":
        return {
          icon: Users,
          title: "Receptionist",
          description: "Front desk operations including patient registration and appointment scheduling",
          permissions: ["Register patients", "Schedule appointments", "Check-in patients", "Manage follow-ups"],
          color: "text-green-600 bg-green-50 border-green-200",
        };
      default:
        return {
          icon: User,
          title: "User",
          description: "Basic access with limited permissions",
          permissions: ["View own profile", "Limited system access"],
          color: "text-gray-600 bg-gray-50 border-gray-200",
        };
    }
  };

  const roleInfo = getRoleInfo();
  const Icon = roleInfo.icon;

  return (
    <Alert className={roleInfo.color}>
      <Icon className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div>
            <p className="font-semibold">{roleInfo.title}</p>
            <p className="text-sm">{roleInfo.description}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Permissions:</p>
            <ul className="text-sm list-disc list-inside">
              {roleInfo.permissions.map((permission, index) => (
                <li key={index}>{permission}</li>
              ))}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
