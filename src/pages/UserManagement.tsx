import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, KeyRound, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleDescription } from "@/components/RoleDescription";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branches: string[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("receptionist");
  const [newUserBranches, setNewUserBranches] = useState<string[]>([]);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{open: boolean; user: UserWithRole | null}>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error("Error loading branches:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const { data: branchAssignments, error: branchError } = await supabase
        .from("user_branch_assignments")
        .select("user_id, branch_id");

      if (branchError) throw branchError;

      const usersWithRoles = profiles?.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const userBranches = branchAssignments
          ?.filter((ba) => ba.user_id === profile.id)
          .map((ba) => ba.branch_id) || [];
        return {
          ...profile,
          role: userRole?.role || "user",
          branches: userBranches,
        };
      }) || [];

      setUsers(usersWithRoles);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-user-roles",
        {
          body: {
            action: "create_user",
            email: newUserEmail,
            password: newUserPassword,
            fullName: newUserFullName || newUserEmail.split("@")[0],
            role: newUserRole,
          },
        }
      );

      if (error) throw error;

      // Assign branches if selected
      if (newUserBranches.length > 0 && data?.userId) {
        for (const branchId of newUserBranches) {
          await supabase.from("user_branch_assignments").insert({
            user_id: data.userId,
            branch_id: branchId,
          });
        }
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      setNewUserRole("receptionist");
      setNewUserBranches([]);
      loadUsers();
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

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.functions.invoke("manage-user-roles", {
        body: { action: "change_role", userId, role: newRole },
      });
      if (error) throw error;
      toast({ title: "Success", description: "User role updated" });
      loadUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.user || !newPassword) return;
    
    try {
      const { error } = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "reset_password",
          userId: resetPasswordDialog.user.id,
          password: newPassword,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setResetPasswordDialog({ open: false, user: null });
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const openBranchDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedBranches(user.branches);
    setBranchDialogOpen(true);
  };

  const handleSaveBranches = async () => {
    if (!selectedUser) return;

    try {
      // Delete existing assignments
      await supabase
        .from("user_branch_assignments")
        .delete()
        .eq("user_id", selectedUser.id);

      // Insert new assignments
      if (selectedBranches.length > 0) {
        const assignments = selectedBranches.map((branchId) => ({
          user_id: selectedUser.id,
          branch_id: branchId,
        }));
        const { error } = await supabase
          .from("user_branch_assignments")
          .insert(assignments);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Branch assignments updated" });
      setBranchDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getBranchNames = (branchIds: string[]) => {
    return branchIds
      .map((id) => branches.find((b) => b.id === id)?.name)
      .filter(Boolean);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage clinic staff and their roles
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="Leave empty to use email prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <RoleDescription role={newUserRole} />
                <div className="space-y-2">
                  <Label>Branch Access</Label>
                  <div className="border rounded-md p-3 space-y-2">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-branch-${branch.id}`}
                          checked={newUserBranches.includes(branch.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUserBranches([...newUserBranches, branch.id]);
                            } else {
                              setNewUserBranches(newUserBranches.filter((id) => id !== branch.id));
                            }
                          }}
                        />
                        <label htmlFor={`new-branch-${branch.id}`} className="text-sm">
                          {branch.name}
                        </label>
                      </div>
                    ))}
                    {branches.length === 0 && (
                      <p className="text-sm text-muted-foreground">No branches available</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admins have access to all branches. Non-admin users need branch assignments.
                  </p>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Create your first user above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || "—"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleChangeRole(user.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="secondary">All Branches</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {getBranchNames(user.branches).map((name) => (
                              <Badge key={name} variant="outline" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                            {user.branches.length === 0 && (
                              <span className="text-xs text-destructive">No branches assigned</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.role !== "admin" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openBranchDialog(user)}
                              title="Manage branches"
                            >
                              <Building2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setResetPasswordDialog({ open: true, user })}
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${user.full_name || user.email}?`)) {
                                try {
                                  const { error } = await supabase.functions.invoke("manage-user-roles", {
                                    body: { action: "delete_user", userId: user.id },
                                  });
                                  if (error) throw error;
                                  toast({ title: "Success", description: "User deleted" });
                                  loadUsers();
                                } catch (error: any) {
                                  toast({ title: "Error", description: error.message, variant: "destructive" });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => setResetPasswordDialog({ open, user: resetPasswordDialog.user })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetPasswordDialog.user?.full_name || resetPasswordDialog.user?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <Button onClick={handleResetPassword} className="w-full" disabled={newPassword.length < 8}>
                Reset Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Branch Assignment Dialog */}
        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Branch Access</DialogTitle>
              <DialogDescription>
                Select which branches {selectedUser?.full_name || selectedUser?.email} can access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded-md p-3 space-y-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBranches([...selectedBranches, branch.id]);
                        } else {
                          setSelectedBranches(selectedBranches.filter((id) => id !== branch.id));
                        }
                      }}
                    />
                    <label htmlFor={`branch-${branch.id}`} className="text-sm font-medium">
                      {branch.name}
                    </label>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveBranches} className="w-full">
                Save Branch Assignments
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
