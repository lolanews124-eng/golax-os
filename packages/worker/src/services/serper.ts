import { env, hasSerper } from "../config/env.js";

export interface DiscoveredPlace {
  name: string;
  website?: string;
  phone?: string;
  address?: string;
}

interface SerperPlace {
  title?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
}

interface SerperPlacesResponse {
  places?: SerperPlace[];
}

// Discover local businesses via Serper's Google Places endpoint.
// Falls back to deterministic mock data when no API key is configured so the
// pipeline can be developed/tested end-to-end without a key.
export async function discoverPlaces(params: {
  category: string;
  city: string;
  country: string;
  limit: number;
}): Promise<DiscoveredPlace[]> {
  const { category, city, country, limit } = params;

  if (!hasSerper) {
    return mockPlaces(params);
  }

  const results: DiscoveredPlace[] = [];
  const query = `${category} in ${city}`;
  let page = 1;

  // Serper returns ~20 places per page; paginate until we hit the limit.
  while (results.length < limit && page <= 10) {
    const res = await fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: {
        "X-API-KEY": env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        location: `${city}, ${country}`,
        gl: countryToGl(country),
        page,
      }),
    });

    if (!res.ok) {
      throw new Error(`Serper API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as SerperPlacesResponse;
    const places = data.places ?? [];
    if (places.length === 0) break;

    for (const p of places) {
      if (!p.title) continue;
      results.push({
        name: p.title,
        website: p.website,
        phone: p.phoneNumber,
        address: p.address,
      });
    }
    page += 1;
  }

  // De-duplicate by name + website.
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = `${r.name}|${r.website ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, limit);
}

function countryToGl(country: string): string {
  const map: Record<string, string> = {
    australia: "au",
    "united states": "us",
    usa: "us",
    "united kingdom": "gb",
    uk: "gb",
    canada: "ca",
    india: "in",
    pakistan: "pk",
    germany: "de",
    france: "fr",
  };
  return map[country.trim().toLowerCase()] ?? "us";
}

function mockPlaces(params: {
  category: string;
  city: string;
  country: string;
  limit: number;
}): DiscoveredPlace[] {
  const { category, city, limit } = params;
  const out: DiscoveredPlace[] = [];
  for (let i = 1; i <= Math.min(limit, 25); i++) {
    const hasSite = i % 5 !== 0; // ~80% have websites
    const slug = `${category}${i}`.toLowerCase().replace(/\s+/g, "");
    out.push({
      name: `${city} ${category} Co ${i}`,
      website: hasSite ? `https://www.${slug}.example.com` : undefined,
      phone: `+1-555-01${String(i).padStart(2, "0")}`,
      address: `${i} Main St, ${city}`,
    });
  }
  return out;
}
