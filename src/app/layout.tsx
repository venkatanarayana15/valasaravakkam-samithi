import type { Metadata } from "next";
import { Poppins, Raleway } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ScrollTop from "@/components/ScrollTop";
import Chatbot from "@/components/Chatbot";
import { SiteDataProvider } from "@/lib/site-data";
import { DarkModeProvider } from "@/lib/dark-mode";
import { asset } from "@/lib/data";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valasaravakkam Samithi",
  description:
    "Sri Sathya Sai Seva Organisation - Valasaravakkam Samithi, Chennai Metro West. Love All, Serve All. Help Ever, Hurt Never.",
  icons: {
    icon: asset("/assets/img/sssso-emblem-32.png"),
    apple: asset("/assets/img/sssso-emblem-180.png"),
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${raleway.variable} antialiased`}>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <DarkModeProvider>
          <SiteDataProvider>
            <div className="flex flex-col">
              <SiteHeader />
              <div className="flex-1">
                <main className="min-h-screen pb-20 pt-14 sm:pb-24 sm:pt-16 lg:pb-0 lg:pt-20">{children}</main>
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
