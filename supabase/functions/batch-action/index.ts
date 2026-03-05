import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, application_ids, flag_map } = await req.json();
    if (!action || !application_ids?.length) {
      throw new Error("action ('progress' | 'reject') and application_ids[] required");
    }

    const ghKey = Deno.env.get("GREENHOUSE_API_KEY");
    const ghUser = Deno.env.get("GREENHOUSE_USER_ID");
    if (!ghKey) throw new Error("GREENHOUSE_API_KEY not configured");
    if (!ghUser) throw new Error("GREENHOUSE_USER_ID not configured");

    const auth = btoa(`${ghKey}:`);
    const results: any[] = [];

    // Rejection reason IDs are unique to your Greenhouse instance.
    // Find yours at: Greenhouse → Configure → Custom Options → Rejection Reasons
    // Each reason has a numeric ID in the URL when you click to edit it.
    //
    // We use two reasons:
    //   GH_REJECTION_REASON_ID_STANDARD — catch-all for location, skills, repeat applicants
    //   GH_REJECTION_REASON_ID_SPAM     — fake/spam applications
    //
    // REJECTION_TEMPLATE_ID is the email template sent to rejected candidates.
    // Find it at: Greenhouse → Configure → Email Templates → click your template → ID is in the URL.
    // We use an "Initial CV Review" template that schedules 2 days out to avoid immediacy.
    const standardReasonId = parseInt(Deno.env.get("GH_REJECTION_REASON_ID_STANDARD") || "0", 10);
    const spamReasonId = parseInt(Deno.env.get("GH_REJECTION_REASON_ID_SPAM") || "0", 10);
    const rejectionTemplateId = parseInt(Deno.env.get("GH_REJECTION_EMAIL_TEMPLATE_ID") || "0", 10);

    const REASON_MAP: Record<string, { id: number; notes: string }> = {
      geo:              { id: standardReasonId, notes: "Not allowed to hire in candidate's location" },
      repeat:           { id: standardReasonId, notes: "Candidate already rejected multiple times" },
      fake:             { id: spamReasonId,     notes: "Flagged as spam/fake application" },
      ai_reject:        { id: standardReasonId, notes: "Lacking required skills/qualifications for this role" },
      location_unknown: { id: standardReasonId, notes: "Candidate location could not be determined" },
    };
    const DEFAULT_REASON = { id: standardReasonId, notes: "Rejected via Morning Coffee screening tool" };
    const REJECTION_TEMPLATE_ID = rejectionTemplateId;

    // Schedule rejection email 2 days from now
    const sendEmailAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    for (const appId of application_ids) {
      try {
        if (action === "reject") {
          const flag = flag_map?.[String(appId)] || null;
          const reason = flag && REASON_MAP[flag] ? REASON_MAP[flag] : DEFAULT_REASON;

          const res = await fetch(
            `https://harvest.greenhouse.io/v1/applications/${appId}/reject`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "On-Behalf-Of": ghUser,
              },
              body: JSON.stringify({
                rejection_reason_id: reason.id,
                notes: reason.notes,
                rejection_email: {
                  send_email_at: sendEmailAt,
                  email_template_id: REJECTION_TEMPLATE_ID,
                  send_from_user_id: null,
                },
              }),
            }
          );

          const text = await res.text();
          results.push({
            application_id: appId,
            success: res.ok,
            status: res.status,
            flag: flag || "none",
            detail: res.ok ? `rejected [${flag || "default"}] (email scheduled for ${sendEmailAt})` : text,
          });
        } else if (action === "progress") {
          // Move to next stage — first get the application to find current stage
          const appRes = await fetch(
            `https://harvest.greenhouse.io/v1/applications/${appId}`,
            { headers: { Authorization: `Basic ${auth}` } }
          );

          if (!appRes.ok) {
            const text = await appRes.text();
            results.push({
              application_id: appId,
              success: false,
              detail: `Could not fetch app: ${text}`,
            });
            continue;
          }

          const appData = await appRes.json();
          const currentStageId = appData.current_stage?.id;
          const jobId = appData.jobs?.[0]?.id;

          if (!currentStageId || !jobId) {
            results.push({
              application_id: appId,
              success: false,
              detail: "Missing stage or job ID",
            });
            continue;
          }

          // Get job stages to find the next one
          const stagesRes = await fetch(
            `https://harvest.greenhouse.io/v1/jobs/${jobId}/stages`,
            { headers: { Authorization: `Basic ${auth}` } }
          );

          if (!stagesRes.ok) {
            const text = await stagesRes.text();
            results.push({
              application_id: appId,
              success: false,
              detail: `Could not fetch stages: ${text}`,
            });
            continue;
          }

          const stages = await stagesRes.json();
          const currentIdx = stages.findIndex(
            (s: any) => s.id === currentStageId
          );
          const nextStage = stages[currentIdx + 1];

          if (!nextStage) {
            results.push({
              application_id: appId,
              success: false,
              detail: "Already at final stage",
            });
            continue;
          }

          // Move to next stage
          const moveRes = await fetch(
            `https://harvest.greenhouse.io/v1/applications/${appId}/move`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "On-Behalf-Of": ghUser,
              },
              body: JSON.stringify({ from_stage_id: currentStageId, to_stage_id: nextStage.id }),
            }
          );

          const moveText = await moveRes.text();
          results.push({
            application_id: appId,
            success: moveRes.ok,
            status: moveRes.status,
            detail: moveRes.ok ? `Moved to ${nextStage.name}` : moveText,
          });
        }
      } catch (e) {
        results.push({
          application_id: appId,
          success: false,
          detail: e.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        total: application_ids.length,
        succeeded: successCount,
        failed: application_ids.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
