import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      console.log("Missing token in request");
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for secure access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify token and check expiration
    const tokenHash = await sha256(token);
    const { data: portalAccess, error: accessError } = await supabaseAdmin
      .from("patient_portal_access")
      .select("patient_id, token_expires_at, last_login_at")
      .eq("login_token", tokenHash)
      .single();

    if (accessError || !portalAccess) {
      console.log("Token not found:", accessError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token expiration
    if (new Date(portalAccess.token_expires_at) < new Date()) {
      console.log("Token expired for patient:", portalAccess.patient_id);
      return new Response(
        JSON.stringify({ error: "Token has expired" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const patientId = portalAccess.patient_id;
    console.log("Valid token for patient:", patientId, "Action:", action);

    // Update last login
    await supabaseAdmin
      .from("patient_portal_access")
      .update({ last_login_at: new Date().toISOString() })
      .eq("patient_id", patientId);

    // Handle different actions
    if (action === "verify") {
      // Just verify token and return patient basic info
      const { data: patient, error: patientError } = await supabaseAdmin
        .from("patients")
        .select("id, first_name, last_name, phone, email")
        .eq("id", patientId)
        .single();

      if (patientError) {
        console.error("Error fetching patient:", patientError);
        return new Response(
          JSON.stringify({ error: "Patient not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, patient }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "get_all_data") {
      // Get all patient data
      const { data: patient, error: patientError } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (patientError) {
        console.error("Error fetching patient:", patientError);
        return new Response(
          JSON.stringify({ error: "Patient not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get appointments
      const { data: appointments, error: appointmentsError } = await supabaseAdmin
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
      }

      // Get prescriptions with items
      const { data: prescriptions, error: prescriptionsError } = await supabaseAdmin
        .from("prescriptions")
        .select(`*, prescription_items (*)`)
        .eq("patient_id", patientId)
        .order("prescribed_date", { ascending: false });

      if (prescriptionsError) {
        console.error("Error fetching prescriptions:", prescriptionsError);
      }

      // Get reschedule requests
      const { data: rescheduleRequests, error: requestsError } = await supabaseAdmin
        .from("reschedule_requests")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching reschedule requests:", requestsError);
      }

      // Get medical history
      const { data: medicalHistory, error: historyError } = await supabaseAdmin
        .from("medical_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching medical history:", historyError);
      }

      return new Response(
        JSON.stringify({
          patient,
          appointments: appointments || [],
          prescriptions: prescriptions || [],
          rescheduleRequests: rescheduleRequests || [],
          medicalHistory: medicalHistory || []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "submit_reschedule") {
      const { appointmentId, requestedDate, requestedTime, reason } = body;
      
      if (!appointmentId || !requestedDate || !requestedTime || !reason) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify appointment belongs to patient
      const { data: appointment, error: aptError } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .eq("patient_id", patientId)
        .single();

      if (aptError || !appointment) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: insertError } = await supabaseAdmin
        .from("reschedule_requests")
        .insert({
          appointment_id: appointmentId,
          patient_id: patientId,
          requested_date: requestedDate,
          requested_time: requestedTime,
          reason: reason
        });

      if (insertError) {
        console.error("Error creating reschedule request:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to submit request" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "cancel_appointment") {
      const { appointmentId, cancelReason } = body;
      
      if (!appointmentId) {
        return new Response(
          JSON.stringify({ error: "Appointment ID is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify appointment belongs to patient
      const { data: appointment, error: aptError } = await supabaseAdmin
        .from("appointments")
        .select("id, status")
        .eq("id", appointmentId)
        .eq("patient_id", patientId)
        .single();

      if (aptError || !appointment) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointment.status !== "scheduled") {
        return new Response(
          JSON.stringify({ error: "Only scheduled appointments can be cancelled" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("appointments")
        .update({ 
          status: "cancelled",
          notes: cancelReason ? `Cancelled by patient: ${cancelReason}` : "Cancelled by patient"
        })
        .eq("id", appointmentId);

      if (updateError) {
        console.error("Error cancelling appointment:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to cancel appointment" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in verify-portal-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
