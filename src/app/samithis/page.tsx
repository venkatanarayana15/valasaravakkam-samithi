import type { Metadata } from "next";
import Link from "next/link";
import SectionTitle from "@/components/SectionTitle";
import { tenantApiBase } from "@/lib/tenants";

export const metadata: Metadata = {
  title: "Find Your Samithi",
  description:
    "Browse every Sri Sathya Sai Seva Organisation samithi on this network — Love All, Serve All.",
  alternates: { canonical: "/samithis" },
};

type DirectoryEntry = { slug: string; name: string; district: string };

async function getDirectory(): Promise<DirectoryEntry[]> {
  // Build/dev without a function backend: no server to call (relative
  // /api/* would hang the prerender) — serve the built-in entry.
  const base = tenantApiBase();
  if (!base) {
    return [{ slug: "valasaravakkam", name: "Valasaravakkam Samithi", district: "Chennai" }];
  }
  try {
    const res = await fetch(`${base}/samithis`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("directory unavailable");
    const json = (await res.json()) as { samithis?: DirectoryEntry[] };
    if (Array.isArray(json.samithis)) return json.samithis;
  } catch {
    // Fall through to the built-in entry below.
  }
  return [{ slug: "valasaravakkam", name: "Valasaravakkam Samithi", district: "Chennai" }];
}

// Temporary home during the multi-tenant rollout: at cutover this moves to
// `/` (nextplan.md D3) and Valasaravakkam moves to `/s/valasaravakkam`.
export default async function SamithisDirectory() {
  const list = await getDirectory();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <label htmlFor="samithi-search" className="sr-only">
        Search samithis
      </label>
      <input
        id="samithi-search"
        type="search"
        placeholder="Search by samithi or district…"
        className="mx-auto mb-8 block w-full max-w-xl rounded-full border border-slate-200 bg-white px-5 py-3 text-sm placeholder:text-slate-400 focus:border-[#1e64d8] focus:outline-none focus:ring-2 focus:ring-[#1e64d8]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
  // Client-side filter without extra JS framework: the list is small,
      // so a tiny inline script that hides non-matching <li> is enough and
      // keeps the page fully indexable (all links rendered server-side).
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `addEventListener('DOMContentLoaded',function(){var q=document.getElementById('samithi-search');var items=[...document.querySelectorAll('ul li')];if(!q)return;q.addEventListener('input',function(){var v=q.value.toLowerCase().trim();items.forEach(function(li){var t=li.textContent.toLowerCase();li.style.display=!v||t.includes(v)?'':"none"})})})`,
        }}
      />
      <SectionTitle
        title="Find Your Samithi"
        description="Every samithi on this network, sharing one template and one motto — Love All, Serve All. Type a name like “Porur” to filter instantly."
        level={1}
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/s/${s.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="font-display text-lg font-bold text-[#272829] transition-colors group-hover:text-primary-dark dark:text-slate-100 dark:group-hover:text-[#7dd3fc]">
                {s.name}
              </span>
              {s.district ? (
                <span className="mt-1 text-sm text-[#475569] dark:text-slate-300">{s.district}</span>
              ) : null}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary-dark dark:text-[#7dd3fc]">
                Visit website
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted dark:text-gray-400">
          No samithis listed yet — Sai Ram, please check back soon.
        </p>
      ) : null}
    </div>
  );
}
