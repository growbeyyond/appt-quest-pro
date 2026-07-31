import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ManageRoleRequest {
  action: "create_user" | "assign_role" | "remove_role" | "change_role" | "delete_user" | "delete_all_users" | "reset_password";
  userId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
}

const validRoles = ["admin", "doctor", "receptionist"] as const;
const passwordIsStrong = (password: string) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Forbidden: Admin role required");
    }

    const {
      action,
      userId,
      email,
      password,
      fullName,
      role,
    }: ManageRoleRequest = await req.json();

    console.log("Action:", action, "for user:", email || userId);

    let result;

    switch (action) {
      case "create_user": {
        if (!email || !password || !fullName || !role) {
          throw new Error("Missing required fields for user creation");
        }

        // Validate role before creating user
        if (!validRoles.includes(role as typeof validRoles[number])) {
          throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
        }
        if (!passwordIsStrong(password)) {
          throw new Error("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character");
        }

        // Create user in auth - the handle_new_user trigger will automatically create the profile
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        });

        if (createError) {
          console.error("Error creating user in auth:", createError);
          throw createError;
        }

        console.log("User created in auth:", newUser.user.id);
        // Note: Profile is automatically created by the handle_new_user database trigger
        // Note: handle_new_user_role trigger auto-assigns 'receptionist' role

        // Update role if different from auto-assigned 'receptionist'
        // First delete existing role, then insert new one
        const { error: deleteRoleError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", newUser.user.id);

        if (deleteRoleError) {
          console.error("Error clearing existing role:", deleteRoleError);
        }

        // Assign the requested role
        const { error: roleAssignError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: newUser.user.id,
            role: role,
          });

        if (roleAssignError) {
          console.error("Error assigning role:", roleAssignError);
          // Clean up on failure
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw new Error(`Failed to assign role: ${roleAssignError.message}`);
        }

        console.log("Role assigned to user:", newUser.user.id);
        result = { userId: newUser.user.id, email: newUser.user.email };
        break;
      }

      case "assign_role": {
        if (!userId || !role) {
          throw new Error("Missing userId or role");
        }
        if (!validRoles.includes(role as typeof validRoles[number])) {
          throw new Error("Invalid role");
        }

        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
          });

        if (insertError) throw insertError;

        result = { success: true };
        console.log("Role assigned to user:", userId);
        break;
      }

      case "change_role": {
        if (!userId || !role) {
          throw new Error("Missing userId or role");
        }
        if (!validRoles.includes(role as typeof validRoles[number])) {
          throw new Error("Invalid role");
        }

        // Delete existing role
        const { error: deleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (deleteError) throw deleteError;

        // Insert new role
        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
          });

        if (insertError) throw insertError;

        result = { success: true };
        console.log("Role changed for user:", userId);
        break;
      }

      case "remove_role": {
        if (!userId) {
          throw new Error("Missing userId");
        }

        const { error: deleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (deleteError) throw deleteError;

        result = { success: true };
        console.log("Role removed from user:", userId);
        break;
      }

      case "reset_password": {
        if (!userId || !password) {
          throw new Error("Missing userId or password");
        }

        if (!passwordIsStrong(password)) {
          throw new Error("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character");
        }

        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
        });

        if (resetError) {
          console.error("Error resetting password:", resetError);
          throw resetError;
        }

        result = { success: true };
        console.log("Password reset for user:", userId);
        break;
      }

      case "delete_user": {
        if (!userId) {
          throw new Error("Missing userId");
        }
        if (userId === user.id) {
          throw new Error("You cannot delete your own account");
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        result = { success: true };
        console.log("User deleted:", userId);
        break;
      }

      case "delete_all_users": {
        throw new Error("Bulk deletion of all users is disabled");
      }

      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in manage-user-roles:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: message === "Unauthorized" || message === "Missing authorization header" ? 401 : message === "Forbidden: Admin role required" ? 403 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
