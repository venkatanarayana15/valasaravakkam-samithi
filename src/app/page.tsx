import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Activities from "@/components/home/Activities";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import Memories from "@/components/home/Memories";
import Services from "@/components/home/Services";
import Coordinators from "@/components/home/Coordinators";
import AboutSection from "@/components/home/AboutSection";
import ContactSection from "@/components/home/ContactSection";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Activities />
      <UpcomingEvents />
      <Memories />
      <Services />
      <Coordinators />
      <AboutSection />
      <ContactSection />
    </>
  );
}
