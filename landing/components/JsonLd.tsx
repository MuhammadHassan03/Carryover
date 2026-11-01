import { AUTHOR, FAQS, GITHUB_URL, SITE, SITE_URL } from "@/lib/site";

// Structured data rendered into the static HTML (no client JS needed).
export function buildJsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${SITE_URL}/#author`,
    name: AUTHOR.name,
    url: AUTHOR.github,
    sameAs: [AUTHOR.github, AUTHOR.x],
  };
  const org = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: SITE.name,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/icon.svg`,
    sameAs: [GITHUB_URL],
    founder: { "@id": `${SITE_URL}/#author` },
  };
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE.name,
    url: `${SITE_URL}/`,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#org` },
  };
  const app = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE.name,
    description: SITE.definition,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Windows",
    url: `${SITE_URL}/`,
    downloadUrl: GITHUB_URL,
    fileSize: "5 to 10 MB",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${SITE_URL}/#org` },
    author: { "@id": `${SITE_URL}/#author` },
    creator: { "@id": `${SITE_URL}/#author` },
    featureList: [
      "New device mode: pair once over Wi-Fi, encrypted, no server",
      "Refresh this PC: fresh Windows without a USB stick",
      "PC Recipe: apps as installable IDs, drivers, disk layout, BitLocker key saved first",
      "Organize my files: sorts Desktop and Downloads, never deletes, every move can be undone",
      "Safety rules checked in code before anything runs, then you approve",
    ],
  };
  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.more ? `${f.a} ${f.more}` : f.a },
    })),
  };
  return { "@context": "https://schema.org", "@graph": [person, org, website, app, faq] };
}

export default function JsonLd() {
  const json = JSON.stringify(buildJsonLd()).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
