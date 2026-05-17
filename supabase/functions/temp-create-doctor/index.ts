import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "doctor@pcosthyrocure.in";
  const password = "Doctor@2024!";

  // Check existing
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Dr. Prasanna" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    user = data.user!;
  }

  await admin.from("user_roles").delete().eq("user_id", user.id);
  await admin.from("user_roles").insert({ user_id: user.id, role: "doctor" });

  // Assign to PCOS branch
  const branchId = "1c266dd1-f6ae-42eb-b0fe-f091a73fd136";
  await admin.from("user_branch_assignments").delete().eq("user_id", user.id);
  await admin.from("user_branch_assignments").insert({ user_id: user.id, branch_id: branchId });

  return new Response(JSON.stringify({ ok: true, email, password, userId: user.id }));
});