import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ghFetch(path: string, auth: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://harvest.greenhouse.io/v1/${path}`, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`Rate limited on ${path}, retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const body = await res.text();
    if (!res.ok) {
      console.warn(`ghFetch ${path} failed: ${res.status} ${body.slice(0, 200)}`);
      return null;
    }
    return JSON.parse(body);
  }
  console.error(`ghFetch ${path} exhausted retries`);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_ids, last_run_at } = await req.json();
    if (!job_ids || !Array.isArray(job_ids)) {
      throw new Error("job_ids array required");
    }

    const ghKey = Deno.env.get("GREENHOUSE_API_KEY");
    if (!ghKey) throw new Error("GREENHOUSE_API_KEY not configured");
    const auth = btoa(`${ghKey}:`);

    // Build query params — use created_after for delta runs
    const createdAfter = last_run_at ? `&created_after=${last_run_at}` : "";

    // Step 1: Fetch applications for all jobs in parallel (batches of 4)
    const allApps: any[] = [];
    const batchSize = 4;
    for (let i = 0; i < job_ids.length; i += batchSize) {
      const batch = job_ids.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (jobId: number) => {
          try {
            const apps = await ghFetch(
              `applications?job_id=${jobId}&status=active&per_page=100${createdAfter}`,
              auth
            );
            if (!apps) return [];
            return apps
              .filter((a: any) => a.current_stage?.name?.toLowerCase().includes("application review"))
              .map((app: any) => ({ ...app, _jobId: jobId }));
          } catch {
            return [];
          }
        })
      );
      for (const apps of results) allApps.push(...apps);
    }

    // Step 2: Fetch candidate details in parallel (batches of 5)
    const candidateIds = [...new Set(allApps.map((a) => a.candidate_id))];
    const candidateMap: Record<number, any> = {};

    console.log(`Fetching details for ${candidateIds.length} unique candidates...`);
    const candBatchSize = 3;
    for (let i = 0; i < candidateIds.length; i += candBatchSize) {
      const batch = candidateIds.slice(i, i + candBatchSize);
      const results = await Promise.all(
        batch.map(async (cid: number) => {
          const data = await ghFetch(`candidates/${cid}`, auth);
          return data ? { id: cid, data } : null;
        })
      );
      for (const r of results) {
        if (r) candidateMap[r.id] = r.data;
      }
      // Small delay between batches to avoid rate limiting
      if (i + candBatchSize < candidateIds.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    const resolved = Object.keys(candidateMap).length;
    console.log(`Candidate details resolved: ${resolved}/${candidateIds.length}`);

    // Step 3: Merge
    const allCandidates = allApps.map((app) => {
      const cand = candidateMap[app.candidate_id] || {};
      const name = [cand.first_name, cand.last_name].filter(Boolean).join(" ") || "Unknown";
      const attachments = cand.attachments || [];
      if (attachments.length > 0) {
        console.log(`${name} (${app.candidate_id}) attachments: ${attachments.map((a: any) => `${a.type}:${a.filename}`).join(", ")}`);
      }

      return {
        candidate_id: app.candidate_id,
        application_id: app.id,
        job_id: app._jobId,
        job_name: app.jobs?.[0]?.name || "Unknown",
        name,
        source: app.source?.public_name || "Unknown",
        current_stage_id: app.current_stage?.id,
        current_stage_name: app.current_stage?.name,
        answers: (app.answers || []).map((a: any) => ({
          question: a.question,
          answer: a.answer,
        })),
        location: app.location,
        addresses: cand.addresses || [],
        phone_numbers: cand.phone_numbers || [],
        applications: (cand.applications || []).map((a: any) => ({ status: a.status })),
        resume_url: ((cand.attachments || []).find((a: any) => a.type === "resume") || (cand.attachments || []).find((a: any) => a.filename?.match(/\.(pdf|docx?)$/i)))?.url || "",
      };
    });

    return new Response(JSON.stringify({ candidates: allCandidates, is_delta: !!last_run_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
