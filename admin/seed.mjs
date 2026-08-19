import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

const seed = {
  siteconfig: {
    siteConfig: {
      name: "Valasaravakkam Samithi",
      shortName: "SSSSO",
      orgName: "Sri Sathya Sai Seva Organisation",
      zone: "Chennai Metro West",
      tagline: "Love All, Serve All. Help Ever, Hurt Never.",
      email: "valasaravakkamsamithi1@gmail.com",
      phone: "+91 9087951742",
      address:
        "17, Chintamani Vinayagar Koil St, Alwartirunagar, Chennai, Tamil Nadu 600087",
      whatsapp: "https://chat.whatsapp.com/FRGkXU2sH6X2AlEqkrvtlP",
      youtube: "https://www.youtube.com/@YourChannel",
      mapsEmbed:
        "https://www.google.com/maps/embed?pb=!3m2!1sen!2sin!4v1750933518873!5m2!1sen!2sin!6m8!1m7!1sP4jWgzof6Ux6vpfU3vEHDw!2m2!1d13.0471520360607!2d80.18547745868291!3f43.769612503958435!4f12.22431640817625!5f1.3357077677436555",
    },
    socialLinks: [
      { label: "Twitter", icon: "bi-twitter-x", href: "#", color: "text-white" },
      { label: "Facebook", icon: "bi-facebook", href: "#", color: "text-[#1a6ab0]" },
      { label: "Instagram", icon: "bi-instagram", href: "#", color: "text-[#f262d8]" },
      { label: "YouTube", icon: "fab-youtube", href: "https://www.youtube.com/@YourChannel", color: "text-[#ef0000]" },
    ],
  },
  stats: [
    { icon: "bi-emoji-smile", value: 132, label: "Total Members", suffix: "In our samithi" },
    { icon: "bi-journal-richtext", value: 56, label: "Balvikas Childrens", suffix: "In our samithi" },
    { icon: "bi-house", value: 6, label: "Balvikas Centers", suffix: "in valasaravakkam" },
    { icon: "bi-people", value: 20, label: "Youth", suffix: "members in samithi" },
  ],
  activities: [
    { name: "Service", value: 100 },
    { name: "Bhajans", value: 90 },
    { name: "Temple Cleaning", value: 75 },
    { name: "Balvikas", value: 80 },
    { name: "Sai Protein", value: 90 },
    { name: "Other Programs", value: 85 },
  ],
  events: [
    {
      title: "Sri Sathya Sai Ratha Mahotsavam – Valasaravakkam Samithi",
      description:
        "Join us for 3 days of divine celebrations with bhajans, Balvikas performances, poojas, cultural events, and the sacred Ratha Yatra!",
      image: "/assets/img/ratha-mahotsavam-bg.png",
    },
    {
      title: "July 4 (Fri, 5:30 PM onwards)",
      location: "Valasaravakkam Samithi",
      mapsUrl: "https://maps.app.goo.gl/8KXq7uX8tu13MUPb7",
      description: "Ashtotram, Bhajans, Balvikas Programs, and Narayana Seva.",
      image: "/assets/img/ratha-mahotsavam-bg.png",
    },
    {
      title: "July 5 (Sat, 7:00 AM onwards)",
      location: "Kankaiaman Temple",
      mapsUrl: "https://maps.app.goo.gl/oUpremDC6Yke7zAT8",
      description:
        "Procession, Mangala Vadhyam, Sahasranamam, Vilakku Pooja, Bhajans, Maha Mangala Aarathi & Narayana Seva.",
      image: "/assets/img/ratha-mahotsavam-bg.png",
    },
    {
      title: "July 6 (Sun, 5:30 AM onwards)",
      location: "Valasaravakkam Samithi",
      mapsUrl: "https://maps.app.goo.gl/8KXq7uX8tu13MUPb7",
      description:
        "Ratham Procession, Mangala Vadhyam, Balvikas Cultural Program, Bhajans, Maha Mangala Aarathi & Narayana Seva.",
      image: "/assets/img/ratha-mahotsavam-bg.png",
    },
  ],
  services: [
    {
      icon: "fa-om",
      title: "Temple Cleaning",
      description:
        "Temple cleaning Seva is held every 3rd Sunday from 9:00 to 11:00 AM. Devotees join hands to lovingly clean and sanctify the Samithi premises. It's a humble offering of service, purity, and gratitude to Swami. All are welcome to participate in this act of devotion and unity.",
    },
    {
      icon: "fa-drum",
      title: "Bhajans",
      description:
        "Bhajans are held every Saturday from 5:30 to 7:00 PM in the Samithi. Devotees gather to offer soulful singing at the Divine Lotus Feet. The atmosphere fills with peace, love, and spiritual energy. All are welcome to join this weekly satsang with Swami's grace.",
    },
    {
      icon: "fa-users",
      title: "Balvikas",
      description:
        "Balvikas classes are held every Sunday for 1 hour with love and care. Children engage in stories, bhajans, slokas, and value-based activities. These sessions build character, devotion, and discipline. It's a joyful journey that brings them closer to Swami each week.",
    },
    {
      icon: "fa-utensils",
      title: "Narayana Seva",
      description:
        "Every 20th of the month, we offer Narayana Seva with love and devotion. Freshly cooked food is distributed to the needy and hungry in nearby areas. It's not just feeding the body—it's feeding the soul through selfless service. This act of love reflects Swami's message: 'Love All, Serve All.'",
    },
    {
      icon: "fa-bag-shopping",
      title: "Sai Protein",
      description:
        "Every last Thursday of the month, Sai Protein is packed with love by devotees. These nutritious packets are offered to pregnant women and TB patients. They are distributed at Chinna Porur Government Hospital as part of our monthly seva. Each packet carries Swami's blessings, care, and compassion.",
    },
    {
      icon: "fa-book-open",
      title: "Study Circle",
      description:
        "Study Circle is held every 3rd Saturday from 5:30 to 7:00 PM in the Samithi. Devotees gather to discuss Swami's teachings and explore their deeper meaning. It's a space for reflection, learning, and spiritual growth through shared wisdom. Together, we walk the path of truth, guided by Sai's divine message.",
    },
  ],
  coordinators: [
    {
      name: "Anand N S",
      role: "Convenor",
      image: "/assets/img/testimonials/download.jpeg",
      description:
        "The Convenor leads the Samithi with devotion, humility, and discipline, upholding Baba's teachings. He coordinate all seva, spiritual, and educational activities with unity and love. He act as a bridge between members and higher organizational levels. Maintaining records and encouraging participation in all wings is part of their sacred duty.",
    },
    {
      name: "Venkata Narayana",
      role: "Gents Service Co-ordinator",
      image: "/assets/img/testimonials/testimonials-2.jpg",
      description:
        "The Service Coordinator plans and organizes all seva activities with dedication and discipline. They ensure regular Narayana Seva, medical camps, environmental efforts, and community outreach. They inspire volunteers to serve with love, humility, and unity. Documentation and reporting of service activities is also their key responsibility.",
    },
    {
      name: "Hari Haran",
      role: "Gents Youth Co-ordinator",
      image: "/assets/img/testimonials/hari.jpg",
      description:
        "The Youth Coordinator guides Sai youth in spiritual, service, and leadership activities. They inspire young minds to live Baba's message through discipline, seva, and devotion. They organize youth satsangs, service projects, and training sessions. Their focus is to build character, unity, and commitment among the younger generation.",
    },
    {
      name: "Venkata Narayana",
      role: "IT Co-ordinator",
      image: "/assets/img/testimonials/testimonials-2.jpg",
      description:
        "The IT Coordinator manages all digital and technical needs of the Samithi. They maintain websites, communication platforms, and support online seva initiatives. They help document activities, design media, and streamline event coordination. Bridging technology and seva, they enable efficient and inspired service delivery.",
    },
    {
      name: "Meenakshi",
      role: "Mahilas Service Co-ordinator",
      image: "/assets/img/testimonials/download.jpeg",
      description:
        "The Service Coordinator plans and organizes all seva activities with dedication and discipline. They ensure regular Narayana Seva, medical camps, environmental efforts, and community outreach. They inspire volunteers to serve with love, humility, and unity. Documentation and reporting of service activities is also their key responsibility.",
    },
    {
      name: "Selvakani",
      role: "Mahilas Youth Co-ordinator",
      image: "/assets/img/testimonials/download.jpeg",
      description:
        "The Youth Coordinator guides Sai youth in spiritual, service, and leadership activities. They inspire young minds to live Baba's message through discipline, seva, and devotion. They organize youth satsangs, service projects, and training sessions. Their focus is to build character, unity, and commitment among the younger generation.",
    },
    {
      name: "Rajeshwari",
      role: "Mahilas Spiritual Co-ordinator",
      image: "/assets/img/testimonials/download.jpeg",
      description:
        "The Spiritual Coordinator leads all devotional activities like bhajans, study circles, and japa sessions. They nurture the spiritual growth of members through regular satsangs and scriptural study. They ensure all programs align with Bhagawan's teachings and calendar. Inspiring inner transformation through collective prayer and devotion is their core mission.",
    },
    {
      name: "Rajesh",
      role: "Gents spiritual Co-ordinator",
      image: "/assets/img/testimonials/download.jpeg",
      description:
        "The Spiritual Coordinator leads all devotional activities like bhajans, study circles, and japa sessions. They nurture the spiritual growth of members through regular satsangs and scriptural study. They ensure all programs align with Bhagawan's teachings and calendar. Inspiring inner transformation through collective prayer and devotion is their core mission.",
    },
  ],
  gallery: [
    {
      slug: "balvikas",
      label: "Balvikas",
      icon: "fa-children",
      description:
        "Spiritual education for children — stories, bhajans, slokas and value-based activities that build character.",
      images: [
        { src: "/assets/img/gallery/balvikas/balvikas1.jpg", title: "Balvikas class", description: "New Balvikas center in Ramar temple" },
        { src: "/assets/img/gallery/balvikas/balvikas2.jpg", title: "Saptaham", description: "Sai Saptaham by past Balvikas" },
        { src: "/assets/img/gallery/balvikas/balvikas3.jpg", title: "Narayana seva", description: "Narayana seva by balvikas children" },
        { src: "/assets/img/gallery/balvikas/summer%20camp.jpg", title: "Summer camp", description: "Summer camp in venkateshwara school" },
        { src: "/assets/img/gallery/balvikas/navarathri.jpg", title: "Navarathri celebration", description: "Navarathri celebration by Balvikas children" },
        { src: "/assets/img/gallery/balvikas/sai%20protein.jpg", title: "Sai Protein", description: "Sai Protein packed with love by Balvikas children" },
      ],
    },
    {
      slug: "temple-cleaning",
      label: "Temple Cleaning",
      icon: "fa-broom",
      description:
        "Devotees join hands every 3rd Sunday to lovingly clean and sanctify temple premises.",
      images: [
        { src: "/assets/img/gallery/balvikas/balvikas4.jpg", title: "Temple cleaning", description: "Temple cleaning in Ramar Temple" },
        { src: "/assets/img/gallery/balvikas/balvikas5.jpg", title: "Temple cleaning", description: "Temple cleaning in Shiva Temple" },
        { src: "/assets/img/gallery/temple-cleaning/temple-cleaning1.jpg", title: "Temple cleaning", description: "Seva with love, purity and gratitude" },
      ],
    },
    {
      slug: "bhajans",
      label: "Bhajans",
      icon: "fa-drum",
      description:
        "Weekly devotional singing and satsangs filled with peace, love and spiritual energy.",
      images: [
        { src: "/assets/img/gallery/balvikas/bhajans.jpg", title: "Special Bhajans", description: "Special bhajans by sai members" },
        { src: "/assets/img/gallery/bhajans/bhajans1.jpg", title: "Bhajans", description: "Soulful singing at the Divine Lotus Feet" },
      ],
    },
    {
      slug: "other",
      label: "Other Services",
      icon: "fa-hand-holding-heart",
      description:
        "Community outreach and celebration moments — Nagarsankirtan, festivals and seva in action.",
      images: [
        { src: "/assets/img/gallery/balvikas/christmas.jpg", title: "Christ celebrations", description: "Christ celebrations in samithi" },
        { src: "/assets/img/gallery/balvikas/nagarsankirtan.jpg", title: "Nagarsankirtan", description: "Nagarsankirtan on Margazhi month" },
        { src: "/assets/img/gallery/balvikas/buttermilk.jpg", title: "Buttermilk", description: "Buttermilk seva on may month" },
        { src: "/assets/img/gallery/other/other1.jpg", title: "Other services", description: "Community outreach in action" },
      ],
    },
  ],
  homegallery: [
    { src: "/assets/img/gallery/balvikas/balvikas1.jpg", title: "Balvikas", description: "Balvikas class for Group 1 children" },
    { src: "/assets/img/gallery/balvikas/summer%20camp.jpg", title: "Summer Camp", description: "Summer camp in venkateswara school" },
    { src: "/assets/img/gallery/balvikas/navarathri.jpg", title: "Navarathri celebration", description: "Navarathri celebration by Balvikas children" },
  ],
  about: [
    {
      heading: "Core Activities Of Samithi",
      items: [
        { strong: "Bhajans and Study Circles:", text: " Weekly devotional singing and satsangs." },
        { strong: "Service Projects:", text: " Annadanam (free food distribution), medical camps, blood donation, and Narayana Seva." },
        { strong: "Balvikas:", text: " Spiritual education for children to cultivate character and values." },
        { strong: "Youth Seva:", text: " Involvement of Sai Youth in service, leadership, and social transformation initiatives." },
        { strong: "Festival Celebrations:", text: " Spiritual celebrations including Gurupoornima, Swami's Birthday, and Mahashivaratri." },
      ],
    },
  ],
  members: [],
  balvikas: [],
};

for (const [name, data] of Object.entries(seed)) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`seeded ${name}.json`);
}
