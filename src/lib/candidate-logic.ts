import type { CandidateData, FlagType } from "./types";

// ── GEO EXCLUSION DATA ──────────────────────────────────────────────────────
const GEO_TERMS = [
  "nigeria","ghana","kenya","ethiopia","egypt","south africa","tanzania","uganda","algeria","sudan","morocco","angola","mozambique","madagascar","cameroon","côte d'ivoire","ivory coast","niger","mali","burkina faso","malawi","zambia","senegal","somalia","zimbabwe","guinea","rwanda","benin","burundi","tunisia","south sudan","togo","sierra leone","libya","congo","liberia","central african republic","mauritania","eritrea","namibia","gambia","botswana","gabon","lesotho","guinea-bissau","equatorial guinea","mauritius","eswatini","djibouti","comoros","cape verde","sao tome","seychelles",
  "lagos","nairobi","addis ababa","cairo","johannesburg","dar es salaam","khartoum","casablanca","accra","abidjan","kampala","dakar","tunis","abuja","harare","luanda","lusaka","kigali","maputo",
  "india","mumbai","delhi","bangalore","bengaluru","hyderabad","chennai","kolkata","pune","ahmedabad","jaipur","surat","lucknow","kanpur",
  "pakistan","karachi","lahore","islamabad","rawalpindi","faisalabad",
  "uae","united arab emirates","dubai","abu dhabi","saudi arabia","riyadh","jeddah","qatar","doha","bahrain","manama","kuwait","kuwait city","oman","muscat","jordan","amman","iraq","baghdad","iran","tehran","lebanon","beirut","syria","damascus","yemen","sanaa","turkey","ankara","istanbul",
  "cyprus","nicosia","hungary","budapest","serbia","belgrade","russia","moscow","saint petersburg","st. petersburg",
];

const DIAL_CODES: Array<[string, string]> = ([
  ["971","UAE"],["966","Saudi Arabia"],["974","Qatar"],["973","Bahrain"],["965","Kuwait"],["968","Oman"],["962","Jordan"],["964","Iraq"],["963","Syria"],["961","Lebanon"],["967","Yemen"],["357","Cyprus"],["381","Serbia"],
  ["234","Nigeria"],["233","Ghana"],["254","Kenya"],["251","Ethiopia"],["255","Tanzania"],["256","Uganda"],["213","Algeria"],["212","Morocco"],["244","Angola"],["258","Mozambique"],["261","Madagascar"],["237","Cameroon"],["225","Côte d'Ivoire"],["227","Niger"],["223","Mali"],["226","Burkina Faso"],["265","Malawi"],["260","Zambia"],["221","Senegal"],["252","Somalia"],["263","Zimbabwe"],["224","Guinea"],["250","Rwanda"],["229","Benin"],["257","Burundi"],["216","Tunisia"],["211","South Sudan"],["228","Togo"],["232","Sierra Leone"],["218","Libya"],["242","Congo"],["243","Congo DR"],["231","Liberia"],["236","CAR"],["222","Mauritania"],["291","Eritrea"],["264","Namibia"],["220","Gambia"],["267","Botswana"],["241","Gabon"],["266","Lesotho"],["245","Guinea-Bissau"],["240","Equatorial Guinea"],["230","Mauritius"],["268","Eswatini"],["253","Djibouti"],["269","Comoros"],["238","Cape Verde"],["248","Seychelles"],
  ["20","Egypt"],["27","South Africa"],["91","India"],["92","Pakistan"],["98","Iran"],["90","Turkey"],["36","Hungary"],["7","Russia"],
] as Array<[string, string]>).sort((a, b) => b[0].length - a[0].length);

const LOC_KW = ["location", "country", "where", "city", "based", "reside", "region"];

function checkGeo(text: string): string | null {
  const t = text.toLowerCase();
  for (const term of GEO_TERMS) {
    if (t.includes(term)) return term.charAt(0).toUpperCase() + term.slice(1);
  }
  return null;
}

function checkPhone(phones: string[]): [string | null, string | null] {
  for (const raw of phones) {
    const digits = raw.replace(/\D/g, "");
    if (!raw.trim().startsWith("+") && digits.length <= 10) continue;
    for (const [code, country] of DIAL_CODES) {
      if (digits.startsWith(code)) return [country, `+${code}`];
    }
  }
  return [null, null];
}

interface AppData {
  answers?: { question: string; answer: string }[];
  location?: { address?: string } | null;
  resume_text?: string;
}

interface CandData {
  addresses?: { value: string }[];
  phone_numbers?: { value: string }[];
  applications?: { status: string }[];
}

export function locateCandidate(
  app: AppData,
  candidate: CandData,
  resumeText: string
): [boolean | "undetermined", string | null, string] {
  const answers = app.answers || [];
  for (const ans of answers) {
    const q = (ans.question || "").toLowerCase();
    const a = (ans.answer || "").trim();
    if (!a || ["none", "n/a"].includes(a.toLowerCase())) continue;
    if (LOC_KW.some((kw) => q.includes(kw))) {
      const m = checkGeo(a);
      return m ? [true, `${m} (screening)`, "screening"] : [false, a, "screening"];
    }
  }
  const loc = app.location?.address || "";
  if (loc) {
    const m = checkGeo(loc);
    return m ? [true, `${m} (address)`, "address"] : [false, loc, "address"];
  }
  for (const addr of candidate.addresses || []) {
    const v = (addr.value || "").trim();
    if (v) {
      const m = checkGeo(v);
      return m ? [true, `${m} (address)`, "address"] : [false, v, "address"];
    }
  }
  if (resumeText && !resumeText.startsWith("[")) {
    const header = resumeText.slice(0, 2000);
    const locMatch = header.match(
      /(?:based in|location[:\s]+|address[:\s]+|residing in|living in|currently in)\s*([^\n,;|]{3,60})/i
    );
    if (locMatch) {
      const m = checkGeo(locMatch[1]);
      return m ? [true, `${m} (cv)`, "cv"] : [false, locMatch[1].trim(), "cv"];
    }
    const m = checkGeo(resumeText.slice(0, 1500));
    if (m) return [true, `${m} (cv)`, "cv"];
  }
  const phones = (candidate.phone_numbers || []).map((p) => p.value || "");
  const [country, dial] = checkPhone(phones);
  if (country) return [true, `${country} (${dial})`, "phone"];
  return ["undetermined", null, "undetermined"];
}

export function checkRepeat(candidate: CandData): [boolean, number] {
  const apps = candidate.applications || [];
  const rej = apps.filter((a) => a.status === "rejected").length;
  const hired = apps.some((a) => a.status === "hired");
  return rej >= 3 && !hired ? [true, rej] : [false, rej];
}

export function assignFlag(c: Partial<CandidateData>): FlagType | null {
  if (c.geo_excluded === true) return "geo";
  if (c.repeat_rejected) return "repeat";
  if (c.analysis?.fake_likelihood === "high") return "fake";
  if (c.analysis?.recommendation === "Reject") return "ai_reject";
  if (c.geo_excluded === "undetermined") return "location_unknown";
  return null;
}

export const ANALYSIS_PROMPT = `You are a senior recruiter analyzing a job application.

ROLE: {job_name}

CANDIDATE:
Name: {name}
Source: {source}

SCREENING ANSWERS:
{answers}

RESUME:
{resume}

Analyze this candidate against the role. Be specific and direct.
Rate fake_likelihood based on: implausible metrics, timeline impossibilities, CV mirroring JD verbatim, senior role with no verifiable presence, AI boilerplate.

Respond ONLY in this exact JSON (no other text):
{{"summary":"One sentence background","strengths":["s1","s2","s3"],"concerns":["c1","c2"],"recommendation":"Strong Progress|Progress|Maybe|Reject","reasoning":"One sentence explaining","fake_likelihood":"low|medium|high"}}`;
