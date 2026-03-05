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
    const ghKey = Deno.env.get("GREENHOUSE_API_KEY");
    if (!ghKey) {
      return new Response(JSON.stringify({ error: "GREENHOUSE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Greenhouse Basic Auth: key as username, empty password, base64 encoded
    const credentials = `${ghKey}:`;
    const encoded = btoa(credentials);

    const url = "https://harvest.greenhouse.io/v1/jobs?status=open&per_page=500";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
    });

    const body = await res.text();

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: `Greenhouse ${res.status}`,
        detail: body,
        url_used: url,
        auth_prefix: encoded.substring(0, 8) + "...",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobs = JSON.parse(body);

    const simplified = jobs.map((j: any) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      departments: j.departments?.map((d: any) => d.name) || [],
      offices: j.offices?.map((o: any) => o.name) || [],
    }));

    return new Response(JSON.stringify({ jobs: simplified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
