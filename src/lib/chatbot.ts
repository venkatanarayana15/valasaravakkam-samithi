import type { SiteData } from "./data-shape";

export type ChatLink = { label: string; href: string };

export type FaqEntry = {
  id: string;
  keywords: string[];
  phrases: string[];
  text: string;
  links?: ChatLink[];
  followUps: string[];
};

export type ChatAnswer = {
  text: string;
  links?: ChatLink[];
  followUps: string[];
};

export const QUICK_REPLIES = [
  "Class timings",
  "Upcoming events",
  "Contact us",
  "How to join",
  "Where are you located?",
];

function serviceText(data: SiteData, match: string): string | null {
  const found = data.services.find((s) =>
    s.title.toLowerCase().includes(match),
  );
  return found ? `${found.title}: ${found.description}` : null;
}

function coordinatorList(data: SiteData): string {
  const unique = new Map<string, string>();
  for (const c of data.coordinators) unique.set(`${c.name} — ${c.role}`, c.role);
  return [...unique.keys()].join("\n");
}

export function buildFaqs(data: SiteData): FaqEntry[] {
  const { siteConfig } = data;
  const bhajans = serviceText(data, "bhajan") ?? "Bhajans are held weekly in the Samithi.";
  const balvikas =
    serviceText(data, "balvikas") ?? "Balvikas classes are held every Sunday.";
  const cleaning =
    serviceText(data, "cleaning") ?? "Temple cleaning seva is held monthly.";
  const narayanaSeva =
    serviceText(data, "narayana") ?? "Narayana Seva is offered monthly.";
  const saiProtein =
    serviceText(data, "protein") ?? "Sai Protein is packed monthly with love.";
  const studyCircle =
    serviceText(data, "study") ?? "Study Circle is held monthly in the Samithi.";

  const memberStat = data.stats.find((s) =>
    s.label.toLowerCase().includes("member"),
  );
  const balvikasStat = data.stats.find((s) =>
    s.label.toLowerCase().includes("balvikas"),
  );

  return [
    {
      id: "greeting",
      keywords: ["hi", "hello", "hey", "vanakam", "sairam", "sai", "ram", "morning", "evening", "afternoon"],
      phrases: ["sai ram"],
      text: `Sai Ram! Welcome to ${siteConfig.name}. I can help with class timings, upcoming events, seva activities, contact details, and how to join. What would you like to know?`,
      followUps: ["Class timings", "Upcoming events", "How to join"],
    },
    {
      id: "timings",
      keywords: ["time", "timing", "timings", "when", "schedule", "hours", "days", "weekly", "daily"],
      phrases: ["what time", "class timings"],
      text: [
        "Here are our regular timings:",
        "",
        "Bhajans — every Saturday, 5:30 to 7:00 PM.",
        "Balvikas — every Sunday, 1 hour.",
        "Study Circle — every 3rd Saturday, 5:30 to 7:00 PM.",
        "Temple Cleaning — every 3rd Sunday, 9:00 to 11:00 AM.",
        "Narayana Seva — every month on the 20th.",
        "Sai Protein — every month on the last Thursday.",
        "",
        "All are welcome to attend.",
      ].join("\n"),
      links: [{ label: "See all services", href: "#services" }],
      followUps: ["Tell me about Bhajans", "How to join", "Where are you located?"],
    },
    {
      id: "bhajans",
      keywords: ["bhajan", "satsang", "singing", "devotional", "saturday"],
      phrases: ["saturday bhajan"],
      text: bhajans,
      followUps: ["Class timings", "Where are you located?", "Upcoming events"],
    },
    {
      id: "balvikas",
      keywords: ["balvikas", "children", "kids", "child", "class", "classes", "sunday", "students"],
      phrases: ["bal vikas"],
      text: [
        balvikas,
        balvikasStat
          ? `We currently nurture ${balvikasStat.value} Balvikas children across our centers.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      links: [{ label: "Balvikas gallery", href: "/gallery/balvikas" }],
      followUps: ["Class timings", "How to join", "Upcoming events"],
    },
    {
      id: "cleaning",
      keywords: ["cleaning", "temple", "clean", "seva", "sunday", "premises"],
      phrases: ["temple cleaning"],
      text: cleaning,
      links: [{ label: "Temple cleaning gallery", href: "/gallery/temple-cleaning" }],
      followUps: ["How to join", "Class timings", "Contact us"],
    },
    {
      id: "narayana-seva",
      keywords: ["narayana", "food", "annadanam", "hungry", "needy", "distribution", "20th"],
      phrases: ["narayana seva"],
      text: narayanaSeva,
      followUps: ["Tell me about Sai Protein", "How to join", "Contact us"],
    },
    {
      id: "sai-protein",
      keywords: ["protein", "sai", "pregnant", "hospital", "thursday", "nutrition", "patients"],
      phrases: ["sai protein"],
      text: saiProtein,
      followUps: ["Tell me about Narayana Seva", "How to join", "Contact us"],
    },
    {
      id: "study-circle",
      keywords: ["study", "circle", "teachings", "discussion", "scripture", "philosophy"],
      phrases: ["study circle"],
      text: studyCircle,
      followUps: ["Tell me about Bhajans", "Class timings", "How to join"],
    },
    {
      id: "events",
      keywords: ["event", "events", "program", "programs", "celebration", "festival", "ratha", "upcoming", "future", "yatra", "mahotsavam", "pooja", "p pooja"],
      phrases: ["upcoming events", "ratha mahotsavam"],
      text: data.upcomingEvents.length
        ? [
            "Our upcoming events:",
            "",
            ...data.upcomingEvents.map(
              (e) =>
                `${e.title}${e.location ? ` at ${e.location}` : ""}${e.description ? ` — ${e.description}` : ""}`,
            ),
          ].join("\n")
        : "Event details are updated regularly. Please contact us for the latest schedule.",
      links: [{ label: "See upcoming events", href: "#upcoming-events" }],
      followUps: ["Where are you located?", "Contact us", "How to join"],
    },
    {
      id: "contact",
      keywords: ["contact", "phone", "call", "mobile", "email", "mail", "whatsapp", "number", "reach", "talk", "speak"],
      phrases: ["contact us", "phone number"],
      text: [
        "You can reach us here:",
        "",
        `Phone: ${siteConfig.phone}`,
        `Email: ${siteConfig.email}`,
        `Address: ${siteConfig.address}`,
      ].join("\n"),
      links: [
        { label: "WhatsApp group", href: siteConfig.whatsapp },
        { label: "Contact section", href: "#contact" },
      ],
      followUps: ["Where are you located?", "How to join", "Class timings"],
    },
    {
      id: "location",
      keywords: ["where", "location", "address", "direction", "directions", "map", "reach", "landmark", "area", "situated"],
      phrases: ["where are you", "how to reach"],
      text: [
        `We are at ${siteConfig.address}.`,
        "You will find a map in the Contact section of this website.",
      ].join("\n\n"),
      links: [{ label: "Open contact section with map", href: "#contact" }],
      followUps: ["Contact us", "Class timings", "Upcoming events"],
    },
    {
      id: "join",
      keywords: ["join", "volunteer", "participate", "member", "become", "enroll", "admission", "register", "help", "serve"],
      phrases: ["how to join", "how can i join", "i want to join"],
      text: [
        memberStat
          ? `We are a family of ${memberStat.value} members, and newcomers are always welcome.`
          : "Newcomers are always welcome.",
        "Just walk into any Bhajan (Saturdays, 5:30 PM) or contact us and we will guide you to the right coordinator. There is no fee — all programs are free.",
      ].join(" "),
      links: [{ label: "Contact us", href: "#contact" }],
      followUps: ["Class timings", "Contact us", "Who are the coordinators?"],
    },
    {
      id: "coordinators",
      keywords: ["coordinator", "coordinators", "convenor", "incharge", "in-charge", "leader", "leaders", "who", "committee", "organiser", "organizer", "team"],
      phrases: ["who are the coordinators"],
      text: `Our coordinators:\n\n${coordinatorList(data)}`,
      followUps: ["How to join", "Contact us", "Tell me about the Samithi"],
    },
    {
      id: "gallery",
      keywords: ["photo", "photos", "gallery", "images", "pictures", "memories", "videos", "albums"],
      phrases: ["show photos"],
      text: `You can browse ${data.galleryCategories.map((g) => g.label).join(", ")} in our gallery.`,
      links: [{ label: "Open gallery", href: "/gallery" }],
      followUps: ["Tell me about Balvikas", "Upcoming events", "How to join"],
    },
    {
      id: "about",
      keywords: ["about", "samithi", "organisation", "organization", "sssso", "sathya", "sai", "baba", "history", "mission", "motto", "zone", "trust"],
      phrases: ["about samithi", "what is samithi"],
      text: [
        `${siteConfig.name} is part of the ${siteConfig.orgName}, ${siteConfig.zone}.`,
        `Our guiding message: "${siteConfig.tagline}"`,
        "Our core wings are devotional (bhajans, study circles), service (Narayana Seva, Sai Protein, temple cleaning, medical support), and education (Balvikas for children, youth programs).",
      ].join(" "),
      links: [{ label: "Read more about us", href: "#about" }],
      followUps: ["Class timings", "How to join", "Who are the coordinators?"],
    },
    {
      id: "cost",
      keywords: ["fee", "fees", "cost", "charge", "charges", "price", "donate", "donation", "contribute", "money", "free"],
      phrases: ["is it free"],
      text: "All our programs — bhajans, Balvikas, study circle, and seva activities — are completely free. For contributions towards seva activities, please contact us directly.",
      links: [{ label: "Contact us", href: "#contact" }],
      followUps: ["How to join", "Tell me about Narayana Seva", "Class timings"],
    },
    {
      id: "thanks",
      keywords: ["thanks", "thank", "thankyou", "nandri", "great", "helpful", "bye"],
      phrases: ["thank you", "thanks a lot"],
      text: "You are most welcome! Sai Ram. Feel free to ask anything else about the Samithi.",
      followUps: ["Upcoming events", "Contact us", "Class timings"],
    },
  ];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findAnswer(query: string, faqs: FaqEntry[]): ChatAnswer {
  const q = normalize(query);
  if (!q) {
    return {
      text: "Please type your question — for example, class timings, upcoming events, or how to join.",
      followUps: QUICK_REPLIES.slice(0, 3),
    };
  }

  let best: FaqEntry | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    let score = 0;
    for (const phrase of faq.phrases) {
      if (q.includes(phrase)) score += 4;
    }
    const words = new Set(q.split(" "));
    for (const keyword of faq.keywords) {
      if (words.has(keyword)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  if (!best || bestScore < 2) {
    return {
      text: "I am not sure about that yet. For specific queries, please contact us directly — we will be happy to help. Meanwhile, you can try one of these topics.",
      followUps: ["Class timings", "Upcoming events", "Contact us"],
    };
  }

  return { text: best.text, links: best.links, followUps: best.followUps };
}
