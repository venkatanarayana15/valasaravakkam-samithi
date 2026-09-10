/**
 * CommonJS mirror of admin/seed.mjs's data (that file is ESM and cannot be
 * require()d from the .cjs webServer launcher). Keep the shapes in sync.
 * Used ONLY by the admin e2e webServer to seed a throwaway data dir with
 * deterministic content so UI assertions have stable counts/titles.
 */
module.exports = {
  siteconfig: {
    siteConfig: {
      name: "Valasaravakkam Samithi",
      shortName: "SSSSO",
      orgName: "Sri Sathya Sai Seva Organisation",
      zone: "Chennai Metro West",
      tagline: "Love All, Serve All. Help Ever, Hurt Never.",
      email: "valasaravakkamsamithi1@gmail.com",
      phone: "+91 9087951742",
      address: "17, Chintamani Vinayagar Koil St, Alwartirunagar, Chennai, Tamil Nadu 600087",
      whatsapp: "https://chat.whatsapp.com/example",
      youtube: "https://www.youtube.com/@example",
      mapsEmbed: "https://www.google.com/maps/embed?pb=example",
    },
    socialLinks: [
      { label: "Facebook", icon: "bi-facebook", href: "https://www.facebook.com/example", color: "text-[#1a6ab0]" },
    ],
    navLinks: [
      { label: "Home", href: "/#hero", icon: "bi-house" },
      { label: "Contact", href: "/#contact", icon: "bi-envelope" },
    ],
  },
  stats: [
    { icon: "bi-emoji-smile", value: 132, label: "Total Members", suffix: "In our samithi" },
  ],
  activities: [{ name: "Service", value: 100 }],
  events: [
    {
      title: "E2E Flagship Festival",
      description: "Three days of celebrations.",
      image: "",
    },
    { title: "Day 1 (Mon)", location: "Samithi", mapsUrl: "", description: "Bhajans." },
    { title: "Day 2 (Tue)", location: "Temple", mapsUrl: "", description: "Procession." },
  ],
  services: [
    { icon: "fa-om", title: "E2E Service", description: "Held weekly." },
  ],
  coordinators: [
    {
      name: "E2E Convenor",
      role: "Convenor",
      image: "",
      description: "Leads the samithi.",
    },
    { name: "E2E Youth Coordinator", role: "Gents Youth Co-ordinator", image: "", description: "Guides youth." },
  ],
  gallery: [
    {
      slug: "e2e",
      label: "E2E Album",
      icon: "fa-children",
      description: "Test album.",
      images: [],
    },
  ],
  homegallery: [],
  about: [{ heading: "Core Activities", items: [] }],
  members: [],
  balvikas: [],
};
