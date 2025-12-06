import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Parse body once
    const body = await req.json().catch(() => ({}));
    const { email, password, fullName, forceReset } = body;

    // Check if any users exist
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    console.log("Existing users count:", existingUsers.users.length);

    // If users exist and not forcing reset, return error
    if (existingUsers.users.length > 0 && !forceReset) {
      return new Response(
        JSON.stringify({ 
          error: "Setup already complete. Users already exist in the system.", 
          existingCount: existingUsers.users.length,
          hint: "Add forceReset: true to delete existing users and create new admin"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Force delete existing users if forceReset is true
    if (forceReset && existingUsers.users.length > 0) {
      console.log("Force resetting - deleting existing users...");
      for (const user of existingUsers.users) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (error) console.error("Error deleting user:", user.id, error);
        else console.log("Deleted user:", user.id);
      }
    }

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating first admin user:", email);

    // Create user in auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("User created:", newUser.user.id);

    // Delete the auto-assigned receptionist role (from trigger)
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUser.user.id);

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      throw roleError;
    }

    console.log("Admin role assigned to:", newUser.user.id);

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Setup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
