import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionEmailRequest {
  prescriptionId: string;
  patientEmail: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prescriptionId, patientEmail }: PrescriptionEmailRequest = await req.json();

    console.log('Sending prescription email to:', patientEmail);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch prescription details
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('*, patients(*), prescription_items(*)')
      .eq('id', prescriptionId)
      .single();

    if (prescriptionError || !prescription) {
      throw new Error('Prescription not found');
    }

    const patient = prescription.patients;
    const items = prescription.prescription_items || [];

    // Build prescription HTML
    let itemsHtml = '';
    items.forEach((item: any, index: number) => {
      itemsHtml += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${item.drug_name}</strong></td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.dosage}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.frequency}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.duration}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.instructions || '-'}</td>
        </tr>
      `;
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; background: white; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Medical Prescription</h1>
              <p>Dr. Prasanna's Clinic</p>
            </div>
            <div class="content">
              <h2>Patient Information</h2>
              <p><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
              <p><strong>Date:</strong> ${new Date(prescription.prescribed_date).toLocaleDateString()}</p>
              ${prescription.diagnosis ? `<p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>` : ''}
              
              <h2 style="margin-top: 30px;">Prescription</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Drug Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              ${prescription.notes ? `
                <h3 style="margin-top: 20px;">Additional Notes</h3>
                <p>${prescription.notes}</p>
              ` : ''}
            </div>
            <div class="footer">
              <p>This is an official prescription from Dr. Prasanna's Clinic</p>
              <p>Please keep this prescription for your records</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Dr. Prasanna's Clinic <onboarding@resend.dev>",
      to: [patientEmail],
      subject: `Prescription - ${patient.first_name} ${patient.last_name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-prescription-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});