import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking for appointment reminders...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // Get appointments scheduled for 24 hours from now
    const { data: appointments24h, error: error24h } = await supabase
      .from('appointments')
      .select('*, patients(*)')
      .eq('status', 'scheduled')
      .gte('appointment_date', twentyFourHoursFromNow.toISOString().split('T')[0])
      .lte('appointment_date', twentyFourHoursFromNow.toISOString().split('T')[0]);

    if (error24h) throw error24h;

    // Get appointments scheduled for 1 hour from now
    const { data: appointments1h, error: error1h } = await supabase
      .from('appointments')
      .select('*, patients(*)')
      .eq('status', 'scheduled')
      .gte('appointment_date', now.toISOString().split('T')[0])
      .lte('appointment_date', now.toISOString().split('T')[0]);

    if (error1h) throw error1h;

    let remindersSent = 0;

    // Process 24-hour reminders
    if (appointments24h) {
      for (const appointment of appointments24h) {
        const patient = appointment.patients;
        
        if (!patient || !patient.phone || patient.communication_optout) {
          continue;
        }

        // Check if reminder already exists
        const { data: existingReminder } = await supabase
          .from('sms_reminders')
          .select('id')
          .eq('appointment_id', appointment.id)
          .eq('reminder_type', '24h')
          .single();

        if (existingReminder) {
          continue;
        }

        // Create reminder record
        const message = `Reminder: You have an appointment tomorrow at ${appointment.appointment_time} with Dr. Prasanna. Please arrive 10 minutes early. Reply STOP to opt out.`;
        
        const { error: insertError } = await supabase
          .from('sms_reminders')
          .insert({
            appointment_id: appointment.id,
            patient_id: patient.id,
            reminder_type: '24h',
            phone_number: patient.phone,
            message: message,
            status: 'pending',
          });

        if (insertError) {
          console.error('Error creating reminder:', insertError);
          continue;
        }

        // Send SMS
        try {
          await supabase.functions.invoke('send-sms-reminder', {
            body: {
              to: patient.phone,
              message: message,
              appointmentId: appointment.id,
            },
          });
          remindersSent++;
        } catch (error) {
          console.error('Error sending SMS:', error);
        }
      }
    }

    // Process 1-hour reminders
    if (appointments1h) {
      for (const appointment of appointments1h) {
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
        
        // Check if appointment is within 1 hour from now
        const timeDiff = appointmentDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff > 0.9 && hoursDiff <= 1.1) {
          const patient = appointment.patients;
          
          if (!patient || !patient.phone || patient.communication_optout) {
            continue;
          }

          // Check if reminder already exists
          const { data: existingReminder } = await supabase
            .from('sms_reminders')
            .select('id')
            .eq('appointment_id', appointment.id)
            .eq('reminder_type', '1h')
            .single();

          if (existingReminder) {
            continue;
          }

          // Create reminder record
          const message = `Reminder: Your appointment with Dr. Prasanna is in 1 hour at ${appointment.appointment_time}. See you soon!`;
          
          const { error: insertError } = await supabase
            .from('sms_reminders')
            .insert({
              appointment_id: appointment.id,
              patient_id: patient.id,
              reminder_type: '1h',
              phone_number: patient.phone,
              message: message,
              status: 'pending',
            });

          if (insertError) {
            console.error('Error creating reminder:', insertError);
            continue;
          }

          // Send SMS
          try {
            await supabase.functions.invoke('send-sms-reminder', {
              body: {
                to: patient.phone,
                message: message,
                appointmentId: appointment.id,
              },
            });
            remindersSent++;
          } catch (error) {
            console.error('Error sending SMS:', error);
          }
        }
      }
    }

    console.log(`Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-appointment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});