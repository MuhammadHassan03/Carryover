// Shared site facts. The visible FAQ and the FAQPage JSON-LD both read from here, so they always match.

// TODO(founder): set NEXT_PUBLIC_SITE_URL to the real domain before deploying.
// carryover.app is a placeholder and may not be yours.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://carryover.app").replace(/\/+$/, "");

export const GITHUB_URL = "https://github.com/MuhammadHassan03/Carryover";
export const PCRF_URL = "https://www.pcrf.net/donate/gazareliefandrecovery.html";

export const SITE = {
  name: "Carryover",
  title: "Carryover: move apps and files to a new Windows PC, free",
  description:
    "Carryover sets up a new or freshly reset Windows PC from your old one: apps, drivers, settings and files. Free, no account, no USB stick needed.",
  definition:
    "Carryover is a free Windows app that sets up a new or freshly reset PC from your old one: apps, settings, drivers and files.",
};

export type Faq = { q: string; a: string; more?: string };

// First answers are written to stand on their own (about 40 to 60 words each).
export const FAQS: Faq[] = [
  {
    q: "How do I move my apps to a new PC without reinstalling them one by one?",
    a: "Run Carryover on the old PC. It reads your apps, drivers and settings and writes them into one small file, the PC Recipe, with each app saved as an installable ID. Pair the new PC once over your Wi-Fi, approve the plan, and Carryover installs clean copies of those apps on the new machine.",
    more: "Your files come along too. Windows Backup only restores Store apps, so without a tool like this everything else is a manual reinstall.",
  },
  {
    q: "Can I reinstall Windows without a USB stick?",
    a: "Yes. In Refresh this PC mode, Carryover stages Windows Setup on a drive that stays untouched, so you don't need a USB stick. It copies your files off the Windows drive first and writes the PC Recipe. After the fresh install it puts your files back and rebuilds your apps, drivers and settings.",
    more: "The recipe includes the storage driver Windows Setup needs, which is the usual cause of the \"We couldn't find any drives\" error.",
  },
  {
    q: "Is Carryover free?",
    a: "Yes. Carryover is free with every feature included: New device, Refresh this PC, drivers, Organize my files and rollback. There is no account, no limit on moves and no ads. If it saved you an evening, we ask you to consider a donation to the Palestine Children's Relief Fund instead of paying us.",
  },
  {
    q: "Is it safe? Can Carryover wipe the wrong drive?",
    a: "An AI can draft the plan, but plain code checks every step against fixed rules before anything runs, 13 of them today. Only the Windows volume can be erased, the BitLocker key is saved before erasing, and the recipe is never saved to the drive being erased. You see the whole plan and approve it yourself.",
  },
  {
    q: "What can't Carryover move automatically?",
    a: "Licenses tied to an account or a machine, like Adobe or Office, and two-factor authenticator apps. Carryover can't sign in for you, so the done report lists these as a short checklist. Everything it did move, including apps, drivers, settings and files, is marked as done in the same report.",
  },
  {
    q: "Does Carryover work on Mac or Android?",
    a: "Not yet. Carryover is Windows first: it moves a Windows PC to a new or freshly reset Windows PC. macOS and Android are planned but not built, so for now both the old and the new machine need to run Windows.",
  },
  {
    q: "Does my data go through a server?",
    a: "No. In New device mode you pair the two PCs once with a QR code or a short address on your Wi-Fi. The old PC serves Carryover to the new one directly, and the transfer is encrypted. Nothing goes through a server, and the app itself is about 5 to 10 MB and portable.",
  },
];
