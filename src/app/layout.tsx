import type { Metadata } from "next";
import { Poppins, Raleway } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ScrollTop from "@/components/ScrollTop";
import { SiteDataProvider } from "@/lib/site-data";

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
    icon: "/assets/img/favicon.jpg",
    apple: "/assets/img/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${raleway.variable} antialiased`}>
      <body>
        <SiteDataProvider>
          <div className="flex flex-col">
            <SiteHeader />
            <div className="flex-1">
              <main className="min-h-screen pb-24 pt-16 lg:pb-0 lg:pt-20">{children}</main>
              <Footer />
            </div>
          </div>
          <ScrollTop />
          <BottomNav />
        </SiteDataProvider>
      </body>
    </html>
  );
}
