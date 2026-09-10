import type { Metadata, Viewport } from "next";
import { Poppins, Raleway } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ScrollTop from "@/components/ScrollTop";
import Chatbot from "@/components/Chatbot";
import { SiteDataProvider } from "@/lib/site-data";
import { DarkModeProvider } from "@/lib/dark-mode";
import { asset, siteConfig } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

// Only the weights actually used in the UI (font-light/normal/medium/
// semibold/bold/extrabold) — the previous all-9-weights × 2-families setup
// shipped ~18 font files per visitor.
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Valasaravakkam Samithi | Sri Sathya Sai Seva Organisation, Chennai Metro West",
    template: "%s | Valasaravakkam Samithi",
  },
  description:
    "Official website of Valasaravakkam Samithi (Sri Sathya Sai Seva Organisation, Chennai Metro West). Weekly bhajans, Balvikas for children, Narayana Seva, Sai Protein, temple cleaning and study circle. Love All, Serve All. Help Ever, Hurt Never.",
  keywords: [
    "Valasaravakkam Samithi",
    "Sri Sathya Sai Seva Organisation",
    "SSSSO Chennai Metro West",
    "Sai bhajans Chennai",
    "Balvikas Valasaravakkam",
    "Narayana Seva Chennai",
    "Sai Protein Chennai",
    "Temple cleaning seva Chennai",
    "Sai Organisation Tamil Nadu",
    "Alwartirunagar Sai Samithi",
    "Sri Sathya Sai Baba Chennai",
    "Sai study circle Chennai",
  ],
  applicationName: siteConfig.name,
  authors: [{ name: "Valasaravakkam Samithi" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Valasaravakkam Samithi",
    title: "Valasaravakkam Samithi | Sri Sathya Sai Seva Organisation, Chennai Metro West",
    description:
      "Weekly bhajans, Balvikas, Narayana Seva and community seva in Valasaravakkam, Chennai. Love All, Serve All. Help Ever, Hurt Never.",
    images: [
      {
        url: "/assets/img/sathya-sai-100-years-logo.png",
        width: 512,
        height: 512,
        alt: "Sri Sathya Sai Centenary Celebrations logo, 100 years",
      },
      {
        url: "/assets/img/sssso-emblem-512.png",
        width: 512,
        height: 512,
        alt: "Sri Sathya Sai Seva Organisations emblem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Valasaravakkam Samithi | Sri Sathya Sai Seva Organisation",
    description:
      "Sri Sathya Sai Seva Organisation - Valasaravakkam Samithi, Chennai Metro West. Love All, Serve All.",
    images: ["/assets/img/sathya-sai-100-years-logo.png"],
    creator: "@SSSSOCMW",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "organization",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: asset("/assets/img/sssso-emblem-32.png"),
    apple: asset("/assets/img/sssso-emblem-180.png"),
  },
  // Non-standard but widely honoured meta tags.
  // speakable tells Google Assistant (and some search features) which parts
  // of the page are safe to read aloud for voice results.
  other: {
    "copyright": "Valasaravakkam Samithi",
    "geo.region": "IN-TN",
    "geo.placename": "Chennai",
    "geo.position": "13.0472;80.1855",
    "ICBM": "13.0472, 80.1855",
    "article:publisher": SITE_URL,
    "dcterms.subject": "Sri Sathya Sai Seva Organisation",
    "dcterms.type": "Website",
    "rating": "general",
    "referrer": "strict-origin-when-cross-origin",
    "speakable": JSON.stringify({
      "@type": "SpeakableSpecification",
      cssSelector: ["#hero", "#upcoming-events", "#services", "#contact"],
    }),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${raleway.variable} antialiased`}>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:font-semibold focus:text-white focus:shadow-xl"
        >
          Skip to main content
        </a>
        <DarkModeProvider>
          <SiteDataProvider>
            <div className="flex flex-col">
              <SiteHeader />
              <div className="flex-1">
                <main id="main-content" tabIndex={-1} className="min-h-screen pb-20 pt-14 outline-none sm:pb-24 sm:pt-16 lg:pb-0 lg:pt-20">{children}</main>
                <Footer />
              </div>
            </div>
            <ScrollTop />
            <Chatbot />
            <BottomNav />
          </SiteDataProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
