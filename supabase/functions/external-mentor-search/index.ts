import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";

type Body = {
  role?: string;
  company?: string;
  industry?: string;
  skills?: string[];
  seniority?: string;
  limit?: number;
};

type Platform = "Topmate" | "ADPList" | "LinkedIn" | "Superpeer";

type DiscoveredMentor = {
  name: string;
  current_role: string;
  company: string;
  industry: string;
  skills: string[];
  seniority_level: string;
  platform: Platform;
  linkedin: string | null;
  booking_url: string | null;
  source_url: string;
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

function platformFromUrl(url: string): Platform | null {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com/in/")) return "LinkedIn";
  if (u.includes("topmate.io/")) return "Topmate";
  if (u.includes("adplist.org/")) return "ADPList";
  if (u.includes("superpeer.com/")) return "Superpeer";
  return null;
}

function cleanLinkedin(v: string | null | undefined): string | null {
  if (!v) return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[?#].*$/, "").replace(/\/+$/, "");
  // strip any/all linkedin.com/in/ prefixes + protocols
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^[a-z]{2,3}\.linkedin\.com\/in\//i, "")
      .replace(/^linkedin\.com\/in\//i, "");
    if (next === s) break;
    s = next;
  }
  if (!s) return null;
  return `https://www.linkedin.com/in/${s}`;
}

function normToken(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function tokensOf(s: string): string[] {
  return normToken(s).split(" ").filter((t) => t.length > 2);
}

function fuzzyContains(hay: string, needle: string): boolean {
  const h = normToken(hay);
  const n = normToken(needle);
  if (!h || !n) return false;
  if (h.includes(n)) return true;
  const ht = new Set(h.split(" "));
  return n.split(" ").every((w) => ht.has(w));
}

async function firecrawlSearch(query: string, apiKey: string, limit = 6): Promise<string[]> {
  try {
    const res = await fetch(`${FIRECRAWL}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, tbs: "qdr:y" }),
    });
    if (!res.ok) {
      console.warn(`firecrawl search ${res.status} for "${query}"`);
      return [];
    }
    const data = await res.json();
    const items: any[] = data?.data?.web ?? data?.data ?? data?.web ?? [];
    return items.map((x) => x?.url).filter((u): u is string => typeof u === "string");
  } catch (e) {
    console.warn(`firecrawl search err: ${(e as Error).message}`);
    return [];
  }
}

async function firecrawlScrape(url: string, apiKey: string): Promise<any | null> {
  try {
    const res = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        formats: [
          "markdown",
          {
            type: "json",
            prompt:
              "Extract the profile owner's professional info. If the page is not a single professional profile, return all fields null.",
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                current_role: { type: "string" },
                company: { type: "string" },
                industry: { type: "string" },
                skills: { type: "array", items: { type: "string" } },
                seniority_level: { type: "string" },
                linkedin: { type: "string" },
                booking_url: { type: "string" },
              },
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`firecrawl scrape ${res.status} for ${url}`);
      return null;
    }
    const data = await res.json();
    return data?.data ?? data;
  } catch (e) {
    console.warn(`firecrawl scrape err: ${(e as Error).message}`);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAuth(req, corsHeaders);
  if ("error" in auth) return auth.error;

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    return new Response(
      JSON.stringify({ mentors: [], error: "Firecrawl is not connected. Link the Firecrawl connector in Connectors." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: Body = {};
  try { body = await req.json(); } catch { body = {}; }
  const role = (body.role || "").trim();
  const company = (body.company || "").trim();
  const industry = (body.industry || "").trim();
  const limit = Math.min(Math.max(body.limit || 12, 3), 20);

  if (!role) {
    return new Response(JSON.stringify({ mentors: [], error: "role required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build targeted queries — same role + same company / same industry first.
  const queries: string[] = [];
  if (company) queries.push(`site:linkedin.com/in "${role}" "${company}"`);
  if (industry) queries.push(`site:linkedin.com/in "${role}" "${industry}"`);
  if (company) queries.push(`"ex-${company}" "${role}" site:linkedin.com/in`);
  queries.push(`site:topmate.io "${role}"${industry ? ` "${industry}"` : ""}`);
  queries.push(`site:adplist.org mentor "${role}"`);
  if (industry) queries.push(`site:superpeer.com "${role}" "${industry}"`);

  // 1. Search
  const urlSet = new Set<string>();
  const searchResults = await Promise.all(queries.slice(0, 6).map((q) => firecrawlSearch(q, FIRECRAWL_API_KEY, 5)));
  for (const urls of searchResults) {
    for (const u of urls) {
      if (platformFromUrl(u)) urlSet.add(u);
      if (urlSet.size >= 15) break;
    }
  }

  if (urlSet.size === 0) {
    return new Response(JSON.stringify({ mentors: [], error: "No web results matched the role/company/industry." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Scrape in parallel (capped)
  const targets = Array.from(urlSet).slice(0, 12);
  const scraped = await Promise.all(targets.map((u) => firecrawlScrape(u, FIRECRAWL_API_KEY).then((r) => ({ url: u, r }))));

  // 3. Normalize + filter
  const mentors: DiscoveredMentor[] = [];
  for (const { url, r } of scraped) {
    if (!r) continue;
    const platform = platformFromUrl(url);
    if (!platform) continue;

    const j = r.json ?? r.extract ?? {};
    const md: string = typeof r.markdown === "string" ? r.markdown : "";
    const meta = r.metadata ?? {};

    const name = String(j.name || meta.title || "").split(/[|\-—•·]/)[0].trim();
    if (!name || name.length < 2) continue;

    const currentRole = String(j.current_role || "").trim();
    const comp = String(j.company || "").trim();
    const ind = String(j.industry || "").trim();
    const skills = Array.isArray(j.skills) ? j.skills.map(String).slice(0, 12) : [];
    const seniority = String(j.seniority_level || "").trim() || "Mid";

    // Strict relevance: must share role OR company OR industry token with request.
    const hay = `${currentRole} ${comp} ${ind} ${md.slice(0, 2000)}`;
    const roleHit = fuzzyContains(hay, role) || tokensOf(role).some((t) => hay.toLowerCase().includes(t));
    const companyHit = company ? fuzzyContains(hay, company) : false;
    const industryHit = industry ? fuzzyContains(hay, industry) : false;
    if (!roleHit && !companyHit && !industryHit) continue;

    const linkedin =
      platform === "LinkedIn" ? cleanLinkedin(url) : cleanLinkedin(j.linkedin);
    const booking =
      platform !== "LinkedIn" ? url : (typeof j.booking_url === "string" ? j.booking_url : null);

    mentors.push({
      name,
      current_role: currentRole || (meta.title ? String(meta.title) : ""),
      company: comp,
      industry: ind,
      skills,
      seniority_level: seniority,
      platform,
      linkedin,
      booking_url: booking,
      source_url: url,
    });
  }

  // 4. Score: company match > role match > industry match > platform priority
  const platformRank: Record<Platform, number> = { LinkedIn: 4, Topmate: 3, ADPList: 2, Superpeer: 1 };
  mentors.sort((a, b) => {
    const score = (m: DiscoveredMentor) =>
      (company && fuzzyContains(`${m.company} ${m.current_role}`, company) ? 100 : 0) +
      (fuzzyContains(`${m.current_role}`, role) ? 50 : 0) +
      (industry && fuzzyContains(`${m.industry} ${m.current_role}`, industry) ? 20 : 0) +
      platformRank[m.platform];
    return score(b) - score(a);
  });

  // dedupe by linkedin or name+company
  const seen = new Set<string>();
  const deduped: DiscoveredMentor[] = [];
  for (const m of mentors) {
    const k = (m.linkedin || `${m.name}|${m.company}`).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(m);
    if (deduped.length >= limit) break;
  }

  return new Response(JSON.stringify({ mentors: deduped }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
