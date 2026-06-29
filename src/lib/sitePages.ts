"use client";

import { useSyncExternalStore } from "react";

/**
 * Editable "Company" pages (About Us, Careers, Terms & Privacy) and the
 * Contact-page business details.
 *
 * There is no backend in this prototype, so admin edits are persisted to
 * `localStorage` under a single versioned key. Both the public pages and the
 * Admin → Content Control → Pages editor read and write this same store via
 * `useSiteContent()`, so anything an admin saves is reflected on the public
 * site immediately (and across tabs).
 */

export interface SiteSection {
  id: string;
  heading: string;
  headingHi: string;
  body: string;
  bodyHi: string;
}

export interface SitePage {
  slug: string; // public route, e.g. "about" → /about
  navLabel: string; // footer / admin label
  eyebrow: string;
  eyebrowHi: string;
  title: string;
  titleHi: string;
  intro: string;
  introHi: string;
  sections: SiteSection[];
}

export interface ContactInfo {
  eyebrow: string;
  title: string;
  intro: string;
  phoneDisplay: string;
  whatsapp: string; // digits only, e.g. "919918359017"
  email: string;
  address: string;
  hours: string;
  instagram: string; // handle without the URL
  website: string; // domain without protocol
}

export interface SiteContent {
  pages: SitePage[];
  contact: ContactInfo;
}

/* ── Defaults (seed content) ──────────────────────────────────────────────── */

export const DEFAULT_SITE_CONTENT: SiteContent = {
  pages: [
    {
      slug: "about",
      navLabel: "About Us",
      eyebrow: "About Us",
      eyebrowHi: "हमारे बारे में",
      title: "India's Feast Booking Platform",
      titleHi: "भारत का दावत बुकिंग प्लेटफ़ॉर्म",
      intro:
        "Bhojpatra is India's feast booking platform, helping families create memorable celebrations through trusted specialists. From the first chaat counter to the final pan, every craft is curated, vetted and orchestrated into one unforgettable evening.",
      introHi:
        "Bhojpatra भारत का दावत बुकिंग प्लेटफ़ॉर्म है, जो परिवारों को भरोसेमंद विशेषज्ञों के ज़रिए यादगार आयोजन रचने में मदद करता है। पहले चाट काउंटर से लेकर आख़िरी पान तक, हर कला को चुना, परखा और एक अविस्मरणीय शाम में पिरोया जाता है।",
      sections: [
        {
          id: "about-story",
          heading: "Our Story",
          headingHi: "हमारी कहानी",
          body: "Bhojpatra was born from a simple idea: booking the right caterer for a celebration should be as joyful as the feast itself. We connect families and businesses with trusted, verified specialists across the country — from grand wedding spreads to intimate corporate gatherings.",
          bodyHi:
            "Bhojpatra एक सरल विचार से जन्मा: किसी आयोजन के लिए सही कैटरर बुक करना उतना ही आनंददायक होना चाहिए जितनी दावत स्वयं। हम परिवारों और व्यवसायों को देशभर के भरोसेमंद, सत्यापित विशेषज्ञों से जोड़ते हैं — भव्य शादी के भोज से लेकर छोटे कॉर्पोरेट आयोजनों तक।",
        },
        {
          id: "about-mission",
          heading: "Our Mission",
          headingHi: "हमारा उद्देश्य",
          body: "To make great food accessible for every occasion. We bring transparency to pricing, quality to every kitchen we list, and ease to the booking process — so you can focus on the celebration, not the logistics.",
          bodyHi:
            "हर अवसर के लिए बेहतरीन भोजन सुलभ बनाना। हम कीमतों में पारदर्शिता, हर सूचीबद्ध रसोई में गुणवत्ता और बुकिंग प्रक्रिया में आसानी लाते हैं — ताकि आप व्यवस्था की नहीं, बल्कि आयोजन की चिंता करें।",
        },
      ],
    },
    {
      slug: "careers",
      navLabel: "Careers",
      eyebrow: "Careers",
      eyebrowHi: "करियर",
      title: "Build the Future of Feasts",
      titleHi: "दावतों का भविष्य बनाएँ",
      intro:
        "We're a small team with a big appetite for impact. If you love food, hospitality and great products, we'd love to hear from you.",
      introHi:
        "हम एक छोटी टीम हैं जिसकी प्रभाव डालने की भूख बड़ी है। यदि आपको भोजन, आतिथ्य और बेहतरीन उत्पाद पसंद हैं, तो हम आपसे ज़रूर सुनना चाहेंगे।",
      sections: [
        {
          id: "careers-life",
          heading: "Life at Bhojpatra",
          headingHi: "Bhojpatra में जीवन",
          body: "We move fast, care deeply about our customers and vendors, and celebrate the wins (often over a shared meal). Expect ownership from day one, a flat structure, and teammates who have your back.",
          bodyHi:
            "हम तेज़ी से काम करते हैं, अपने ग्राहकों और विक्रेताओं की गहराई से परवाह करते हैं, और जीत का जश्न मनाते हैं (अक्सर एक साझा भोजन पर)। पहले दिन से ज़िम्मेदारी, एक सरल संरचना, और ऐसे साथी जो हमेशा आपके साथ खड़े रहें।",
        },
        {
          id: "careers-open",
          heading: "Open Roles",
          headingHi: "उपलब्ध पद",
          body: "Operations Associate · Lucknow — Onboard and support catering partners.\nFull-Stack Engineer · Remote — Build the platform powering every booking.\nVendor Success Manager · Lucknow — Help our specialists grow on Bhojpatra.",
          bodyHi:
            "ऑपरेशन्स एसोसिएट · Lucknow — कैटरिंग पार्टनर्स को जोड़ें और सहयोग दें।\nफ़ुल-स्टैक इंजीनियर · Remote — हर बुकिंग को संचालित करने वाला प्लेटफ़ॉर्म बनाएँ।\nवेंडर सक्सेस मैनेजर · Lucknow — हमारे विशेषज्ञों को Bhojpatra पर आगे बढ़ने में मदद करें।",
        },
        {
          id: "careers-apply",
          heading: "How to Apply",
          headingHi: "आवेदन कैसे करें",
          body: "Don't see your exact role? We still want to meet great people. Email your resume and a short note about why you're excited to careers@bhojpatra.co.in.",
          bodyHi:
            "अपना सटीक पद नहीं दिख रहा? फिर भी हम बेहतरीन लोगों से मिलना चाहते हैं। अपना रिज़्यूमे और यह बताते हुए एक छोटा नोट कि आप क्यों उत्साहित हैं, careers@bhojpatra.co.in पर ईमेल करें।",
        },
      ],
    },
    {
      slug: "terms",
      navLabel: "Terms & Privacy",
      eyebrow: "Legal",
      eyebrowHi: "कानूनी",
      title: "Terms & Privacy",
      titleHi: "नियम और गोपनीयता",
      intro:
        "Please read these terms carefully. By using Bhojpatra you agree to the policies below. This is sample placeholder content — replace it with your finalised legal copy.",
      introHi:
        "कृपया इन नियमों को ध्यान से पढ़ें। Bhojpatra का उपयोग करके आप नीचे दी गई नीतियों से सहमत होते हैं। यह नमूना सामग्री है — इसे अपनी अंतिम कानूनी सामग्री से बदलें।",
      sections: [
        {
          id: "terms-use",
          heading: "Terms of Use",
          headingHi: "उपयोग की शर्तें",
          body: "By accessing Bhojpatra you agree to use the platform lawfully and to provide accurate information when booking. Bookings are confirmed once the advance payment is received. Cancellation and refund timelines are shared at the time of booking.",
          bodyHi:
            "Bhojpatra का उपयोग करके आप प्लेटफ़ॉर्म का वैध रूप से उपयोग करने और बुकिंग करते समय सही जानकारी देने के लिए सहमत होते हैं। अग्रिम भुगतान प्राप्त होने पर ही बुकिंग की पुष्टि होती है। रद्दीकरण और रिफंड की समय-सीमा बुकिंग के समय साझा की जाती है।",
        },
        {
          id: "terms-privacy",
          heading: "Privacy Policy",
          headingHi: "गोपनीयता नीति",
          body: "We collect only the information needed to process your enquiries and bookings — your name, contact details and event preferences. We never sell your data. Vendor partners receive only the details required to fulfil your booking.",
          bodyHi:
            "हम केवल वही जानकारी एकत्र करते हैं जो आपकी पूछताछ और बुकिंग को संसाधित करने के लिए आवश्यक है — आपका नाम, संपर्क विवरण और आयोजन की प्राथमिकताएँ। हम आपका डेटा कभी नहीं बेचते। विक्रेता पार्टनर्स को केवल वही विवरण मिलते हैं जो आपकी बुकिंग पूरी करने के लिए आवश्यक हैं।",
        },
        {
          id: "terms-cookies",
          heading: "Cookies",
          headingHi: "कुकीज़",
          body: "We use essential cookies to keep the site working and basic analytics to improve your experience. You can control cookies through your browser settings at any time.",
          bodyHi:
            "हम साइट को चालू रखने के लिए आवश्यक कुकीज़ और आपके अनुभव को बेहतर बनाने के लिए बुनियादी एनालिटिक्स का उपयोग करते हैं। आप अपने ब्राउज़र सेटिंग्स के माध्यम से कभी भी कुकीज़ को नियंत्रित कर सकते हैं।",
        },
        {
          id: "terms-contact",
          heading: "Questions?",
          headingHi: "प्रश्न हैं?",
          body: "For any questions about these terms or your data, reach us at info@bhojpatra.co.in and we'll be happy to help.",
          bodyHi:
            "इन नियमों या आपके डेटा के बारे में किसी भी प्रश्न के लिए, हमें info@bhojpatra.co.in पर संपर्क करें और हमें मदद करने में खुशी होगी।",
        },
      ],
    },
    {
      slug: "refund",
      navLabel: "Refund Policy",
      eyebrow: "Legal",
      eyebrowHi: "कानूनी",
      title: "Refund & Cancellation Policy",
      titleHi: "रिफंड और रद्दीकरण नीति",
      intro:
        "We want every celebration to go smoothly. This policy explains how cancellations and refunds work for bookings made through Bhojpatra. This is sample placeholder content — replace it with your finalised policy.",
      introHi:
        "हम चाहते हैं कि हर आयोजन सहजता से हो। यह नीति बताती है कि Bhojpatra के माध्यम से की गई बुकिंग के लिए रद्दीकरण और रिफंड कैसे काम करते हैं। यह नमूना सामग्री है — इसे अपनी अंतिम नीति से बदलें।",
      sections: [
        {
          id: "refund-cancellation",
          heading: "Cancellations",
          headingHi: "रद्दीकरण",
          body: "You may request a cancellation by contacting us with your booking details. The applicable refund depends on how far in advance you cancel before the event date, as outlined below. Cancellation requests are processed only once confirmed in writing by our team.",
          bodyHi:
            "आप अपनी बुकिंग का विवरण देकर हमसे संपर्क करके रद्दीकरण का अनुरोध कर सकते हैं। लागू रिफंड इस बात पर निर्भर करता है कि आप आयोजन की तारीख से कितने पहले रद्द करते हैं, जैसा कि नीचे बताया गया है। रद्दीकरण अनुरोध केवल हमारी टीम द्वारा लिखित में पुष्टि होने के बाद ही संसाधित किए जाते हैं।",
        },
        {
          id: "refund-timelines",
          heading: "Refund Timelines",
          headingHi: "रिफंड की समय-सीमा",
          body: "Cancelled 7 or more days before the event: full refund of the advance, less payment-gateway charges.\nCancelled 3 to 6 days before the event: 50% of the advance is refunded.\nCancelled within 48 hours of the event: the advance is non-refundable, as preparations and procurement are already underway.",
          bodyHi:
            "आयोजन से 7 या अधिक दिन पहले रद्द: अग्रिम का पूरा रिफंड, पेमेंट-गेटवे शुल्क घटाकर।\nआयोजन से 3 से 6 दिन पहले रद्द: अग्रिम का 50% वापस किया जाता है।\nआयोजन के 48 घंटे के भीतर रद्द: अग्रिम वापस नहीं किया जाता, क्योंकि तैयारी और खरीद पहले ही शुरू हो चुकी होती है।",
        },
        {
          id: "refund-process",
          heading: "How Refunds Are Processed",
          headingHi: "रिफंड कैसे संसाधित होते हैं",
          body: "Approved refunds are credited to your original payment method within 7–10 business days. Timelines may vary depending on your bank or payment provider. You will receive a confirmation once the refund is initiated.",
          bodyHi:
            "स्वीकृत रिफंड 7–10 कार्य दिवसों के भीतर आपके मूल भुगतान माध्यम में जमा कर दिए जाते हैं। समय-सीमा आपके बैंक या भुगतान प्रदाता के आधार पर भिन्न हो सकती है। रिफंड शुरू होने पर आपको एक पुष्टि प्राप्त होगी।",
        },
        {
          id: "refund-contact",
          heading: "Need Help?",
          headingHi: "मदद चाहिए?",
          body: "For any cancellation or refund request, reach us at info@bhojpatra.co.in and our team will guide you through the process.",
          bodyHi:
            "किसी भी रद्दीकरण या रिफंड अनुरोध के लिए, हमें info@bhojpatra.co.in पर संपर्क करें और हमारी टीम पूरी प्रक्रिया में आपका मार्गदर्शन करेगी।",
        },
      ],
    },
  ],
  contact: {
    eyebrow: "Contact Us",
    title: "Let's Plan Your Feast",
    intro:
      "Reach out and our team will help you book the perfect celebration.",
    phoneDisplay: "+91 99183 59017",
    whatsapp: "919918359017",
    email: "ankit23690@gmail.com",
    address: "C-59, Sec K, Aliganj, Lucknow",
    hours: "10 AM – 7 PM (Open all days)",
    instagram: "@bhojpatraofficial",
    website: "www.bhojpatra.co.in",
  },
};

/* ── Store (localStorage + cross-tab/component sync) ──────────────────────── */

const STORAGE_KEY = "bhojpatra.site-content.v1";
const EVENT = "bhojpatra:site-content";

/** Merge stored content over defaults so newly-added fields keep a value. */
function reconcile(stored: Partial<SiteContent> | null): SiteContent {
  if (!stored) return DEFAULT_SITE_CONTENT;
  const storedPages = stored.pages ?? [];
  // Keep the admin's edited pages, but append any default pages that were
  // added after this store was last saved (e.g. a newly-introduced policy page)
  // so they always surface on the public site and in the admin editor.
  const missingDefaults = DEFAULT_SITE_CONTENT.pages.filter(
    (def) => !storedPages.some((p) => p.slug === def.slug),
  );
  return {
    pages: storedPages.length
      ? [...storedPages, ...missingDefaults]
      : DEFAULT_SITE_CONTENT.pages,
    contact: { ...DEFAULT_SITE_CONTENT.contact, ...stored.contact },
  };
}

function read(): SiteContent {
  if (typeof window === "undefined") return DEFAULT_SITE_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return reconcile(raw ? (JSON.parse(raw) as Partial<SiteContent>) : null);
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

/** Cached snapshot so useSyncExternalStore gets a stable reference. */
let snapshot: SiteContent = DEFAULT_SITE_CONTENT;
let hydrated = false;

function getSnapshot(): SiteContent {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): SiteContent {
  return DEFAULT_SITE_CONTENT;
}

function subscribe(callback: () => void): () => void {
  const onChange = () => {
    snapshot = read();
    callback();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Persist the next content and notify all subscribers (this tab + others). */
export function saveSiteContent(next: SiteContent): void {
  if (typeof window === "undefined") return;
  snapshot = next;
  hydrated = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

/** Read the live site content. Re-renders when an admin saves changes. */
export function useSiteContent(): SiteContent {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience: a single page by slug (undefined if not found). */
export function useSitePage(slug: string): SitePage | undefined {
  return useSiteContent().pages.find((p) => p.slug === slug);
}
