// analyze-candidate edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_ANALYSIS = {
  summary: "AI analysis could not be completed — flagged for manual review",
  strengths: [],
  concerns: ["ai_error: automated analysis failed"],
  recommendation: "Maybe",
  reasoning: "AI parsing error — please review this candidate manually",
  fake_likelihood: "low",
  ai_error: true,
};

function extractJson(raw: string): Record<string, unknown> {
  // 1) Strip markdown code fences and trim
  let cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // 2) Find first '{' and last '}' — only parse that substring
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }

  const jsonStr = cleaned.substring(start, end + 1);
  return JSON.parse(jsonStr);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const candidate = body?.candidate;
    if (!candidate) throw new Error("candidate object required");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const answersText = (candidate.answers || [])
      .map((a: any) => `Q: ${a.question}\nA: ${a.answer ?? "N/A"}`)
      .join("\n\n");

    // Try to fetch resume PDF from signed URL (only PDFs are supported by Anthropic document blocks)
    let resumePdfBase64 = "";
    const resumeUrl = candidate.resume_url || "";
    const isPdf = /\.pdf(\?|$)/i.test(resumeUrl);
    if (resumeUrl && isPdf) {
      try {
        console.log(`Resume fetch START for ${candidate.name || "Unknown"} (url present: ${Boolean(resumeUrl)})`);
        const pdfRes = await fetch(resumeUrl);
        console.log(`Resume fetch END for ${candidate.name || "Unknown"} -> status ${pdfRes.status} ${pdfRes.statusText}`);

        if (pdfRes.ok) {
          const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
          // Base64 encode
          let binary = "";
          for (let i = 0; i < pdfBytes.length; i++) {
            binary += String.fromCharCode(pdfBytes[i]);
          }
          resumePdfBase64 = btoa(binary);
          console.log(`Resume fetched and encoded: ${pdfBytes.length} bytes, base64 length ${resumePdfBase64.length}`);
        } else {
          const errorBody = await pdfRes.text();
          console.warn(`Resume fetch failed: status=${pdfRes.status} body=${errorBody.slice(0, 1000)}`);
        }
      } catch (e: any) {
        console.warn(`Resume fetch error: ${e?.message || String(e)}`);
      }
    }

    const buildPrompt = (resumeLine: string) =>
      [
        `You are a senior recruiter analyzing a job application.`,
        ``,
        `ROLE: ${candidate.job_name || "Unknown"}`,
        ``,
        `CANDIDATE:`,
        `Name: ${candidate.name || "Unknown"}`,
        `Source: ${candidate.source || "Unknown"}`,
        ``,
        `SCREENING ANSWERS:`,
        answersText || "[No screening answers]",
        ``,
        resumeLine,
        ``,
        `Analyze this candidate against the role. Be specific and direct.`,
        `Rate fake_likelihood based on: implausible metrics, timeline impossibilities, CV mirroring JD verbatim, senior role with no verifiable presence, AI boilerplate.`,
        `IMPORTANT: Do NOT list "no resume" as a concern or factor it into your recommendation. Only evaluate information that IS available.`,
        ``,
        `Return a JSON object with these exact keys: summary (string), strengths (array of strings), concerns (array of strings), recommendation (one of: "Strong Progress", "Progress", "Maybe", "Reject"), reasoning (string), fake_likelihood (one of: "low", "medium", "high").`,
        `Return ONLY the raw JSON object. Do not wrap it in markdown code fences. Do not add any text before or after.`,
      ].join("\n");

    const primaryResumeLine = resumePdfBase64
      ? `The candidate's resume/CV PDF is attached as a document. Review it carefully.`
      : resumeUrl && !isPdf
        ? `RESUME: The candidate uploaded a non-PDF file (likely .docx) which could not be parsed. Do NOT penalize the candidate for this — it is a system limitation. Evaluate based on available information only.`
        : `RESUME: Not available in this data extract. Do NOT penalize the candidate for a missing resume — this is a system limitation, not a candidate flaw. Evaluate based on available information only.`;

    const retryResumeLine = `RESUME: The resume attachment could not be parsed due to a system/API limitation. Do NOT penalize the candidate for this. Evaluate based on available information only.`;

    const textPrompt = buildPrompt(primaryResumeLine);
    const retryTextPrompt = buildPrompt(retryResumeLine);

    console.log(`Analyzing candidate: ${candidate.name} for ${candidate.job_name} (resume: ${resumePdfBase64 ? "yes" : "no"})`);

    const callAnthropic = async (content: any[]) => {
      return await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "pdfs-2024-09-25",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content }],
        }),
      });
    };

    // Build message content blocks
    const contentBlocks: any[] = [];
    if (resumePdfBase64) {
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: resumePdfBase64 },
      });
    }
    contentBlocks.push({ type: "text", text: textPrompt });

    let res = await callAnthropic(contentBlocks);
    let responseText = await res.text();

    // If attached document fails validation at Anthropic, retry once with text-only prompt.
    if (!res.ok && resumePdfBase64 && res.status === 400) {
      console.warn(`Anthropic rejected document for ${candidate.name}; retrying without attachment`);
      res = await callAnthropic([{ type: "text", text: retryTextPrompt }]);
      responseText = await res.text();
    }

    if (!res.ok) {
      console.error(`Anthropic API error status=${res.status} statusText=${res.statusText}`);
      console.error(`Anthropic API error body: ${responseText.slice(0, 4000)}`);
      // Return fallback instead of throwing — don't crash the batch
      return new Response(JSON.stringify({ analysis: { ...FALLBACK_ANALYSIS, reasoning: `API error ${res.status}` } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the Anthropic envelope
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`Non-JSON from Anthropic: ${responseText.slice(0, 300)}`);
      return new Response(JSON.stringify({ analysis: { ...FALLBACK_ANALYSIS, reasoning: "Anthropic returned non-JSON" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = Array.isArray(data.content)
      ? data.content
          .filter((block: any) => block?.type === "text")
          .map((block: any) => block?.text || "")
          .join("\n")
      : "";

    // Extract and parse the JSON from Claude's response
    let analysis;
    try {
      analysis = extractJson(content);
    } catch (e) {
      console.error(`JSON extraction failed: ${e.message} — raw: ${content.slice(0, 400)}`);
      // Return fallback with ai_error flag — candidate still appears in report
      return new Response(JSON.stringify({ analysis: { ...FALLBACK_ANALYSIS, reasoning: `Parse error: ${e.message}` } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`analyze-candidate error: ${err.message}`);
    // Even top-level errors return 200 with fallback so the batch continues
    return new Response(JSON.stringify({ analysis: { ...FALLBACK_ANALYSIS, reasoning: err.message } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
