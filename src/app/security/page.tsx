import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description:
    "Security and privacy information for the Valasaravakkam Samithi website — responsible disclosure, data handling, admin controls, and how we protect visitor information.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security & Privacy | Valasaravakkam Samithi",
    description:
      "How we protect visitor information and report security issues — responsible disclosure and data-handling practices.",
    url: "/security",
  },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen px-4 py-12 dark:bg-[#0f172a]" style={{ backgroundColor: "rgba(147,156,156,0.25)" }}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-gradient-static font-display text-3xl font-bold dark:text-blue-400 sm:text-4xl">
          Security & Privacy
        </h1>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent to-[#38bdf8] sm:w-14" />
          <span className="divider-dot h-2 w-2 rounded-full bg-[#38bdf8]" />
          <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-transparent to-[#38bdf8] sm:w-14" />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted dark:text-gray-400">
          What we do to keep this site safe, what data we collect, and how to report a problem.
        </p>

        <div className="mt-8 space-y-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-[#1e293b] dark:ring-gray-700 sm:p-8">
          <section id="responsible-disclosure">
            <h2 className="font-display text-xl font-bold text-[#272829] dark:text-gray-100">Responsible Disclosure</h2>
            <p className="mt-3 leading-relaxed text-sm text-[#475569] dark:text-gray-300">
              If you find a security problem on this site, please report it to us privately and give us reasonable time to fix it before sharing it publicly. We appreciate responsible researchers.
            </p>
            <div className="mt-4 rounded-lg bg-surface-deep p-4 text-sm text-[#272829] dark:bg-[#0f172a] dark:text-gray-300">
              <p className="font-semibold">Preferred ways to report:</p>
              <ul className="mt-2 space-y-1">
                <li>Email: <Link href="mailto:valasaravakkamsamithi1@gmail.com" className="text-primary hover:underline dark:text-[#7dd3fc]">valasaravakkamsamithi1@gmail.com</Link></li>
                <li>Contact section on this site: <Link href="/#contact" className="text-primary hover:underline dark:text-[#7dd3fc]">/security#contact</Link></li>
                <li>WhatsApp group (public group — use email for sensitive reports):{" "}
                  <Link href="https://chat.whatsapp.com/FRGkXU2sH6X2AlEqkrvtlP" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline dark:text-[#7dd3fc]">WhatsApp group</Link>
                </li>
              </ul>
            </div>
          </section>

          <section id="data-handling">
            <h2 className="font-display text-xl font-bold text-[#272829] dark:text-gray-100">Data Handling</h2>
            <p className="mt-3 leading-relaxed text-sm text-[#475569] dark:text-gray-300">
              This is a public informational site. We do not publish members&apos; personal details on the public site. Personal-data fields managed in the admin CMS are token-protected server-side and excluded from the public content API.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#475569] dark:text-gray-300">
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Contact form:</strong> Messages are sent through a server-side endpoint with validation, length caps, and a honeypot field to reduce spam.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Admin CMS:</strong> Content edits require an admin token. Personal-data collections are read-only with the token and are not exposed publicly.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Uploaded images:</strong> Only raster formats (jpg, png, gif, webp) are accepted. SVG is rejected to prevent same-origin script execution. Uploaded files are served with nosniff and sandboxing headers.
              </li>
            </ul>
          </section>

          <section id="controls">
            <h2 className="font-display text-xl font-bold text-[#272829] dark:text-gray-100">Security Controls</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#475569] dark:text-gray-300">
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Admin auth:</strong> Every non-GET API mutation and every private-data read requires an admin token, compared with timing-safe equality.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Atomic writes:</strong> CMS changes write to a temporary file, fsync, then rename — so a crash cannot corrupt the JSON datastore.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Path containment:</strong> Static and upload serving uses path-relative containment so sibling directories cannot be escaped.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Hardened responses:</strong> Uploaded files and admin pages are served with X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: no-referrer, and sandboxing CSP where appropriate.
              </li>
              <li>
                <strong className="text-[#272829] dark:text-gray-100">Site headers:</strong> The public site sends security headers including HSTS, CSP, X-Frame-Options, and Permissions-Policy. See the response headers for the latest values.
              </li>
            </ul>
          </section>

          <section id="privacy">
            <h2 className="font-display text-xl font-bold text-[#272829] dark:text-gray-100">Privacy</h2>
            <p className="mt-3 leading-relaxed text-sm text-[#475569] dark:text-gray-300">
              We aim to keep this site lightweight and respectful of visitors. Any message you send through the contact form is used to respond to you and is not published on the site. We do not knowingly track visitors for advertising.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display text-xl font-bold text-[#272829] dark:text-gray-100">Contact</h2>
            <p className="mt-3 leading-relaxed text-sm text-[#475569] dark:text-gray-300">
              For security or privacy questions, use the contact details above. For general questions, the contact section on the home page also lists our phone and email.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-surface-dark shadow-sm dark:border-gray-700 dark:bg-[#0f172a]">
              <Link
                href="/#contact"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Contact on the site
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-[#272829] transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
              >
                Return to Home
              </Link>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-muted dark:text-gray-500">
          Last reviewed: 2026-09-06. This page reflects the site&apos;s current controls and is updated when they change.
        </p>
      </div>
    </div>
  );
}
