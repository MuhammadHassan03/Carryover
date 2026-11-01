# Carryover landing page

The marketing site for Carryover, built with Next.js 15 (App Router, TypeScript, React 19) and exported as plain static files.

## Run it

You need Node.js 18.18 or newer (Node 20 or 22 recommended). These commands work the same on Windows, macOS and Linux:

```
npm install
npm run dev
```

Then open http://localhost:3000. The page reloads when you save a file.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the static site into `out/` |
| `npm run start` | Serves `out/` locally (after a build) |
| `npm run lint` | ESLint (Next.js rules) |
| `npm run typecheck` | TypeScript check, no output files |

## Before you deploy

Set the real domain. Canonical URLs, Open Graph, the sitemap, robots.txt and the JSON-LD all read it:

```
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com
```

Put that in your host's environment variables (or a local `.env.local`). Without it the site uses `https://carryover.app` as a placeholder. Also update the URLs in `public/llms.txt` if you want it to list the site itself.

## Deploy

The build is a folder of static files (`out/`), so any static host works.

- Vercel: import the repo, set Root Directory to `landing`, add `NEXT_PUBLIC_SITE_URL`, deploy. Vercel detects Next.js and the `output: "export"` setting on its own.
- Netlify: base directory `landing`, build command `npm run build`, publish directory `landing/out`, add `NEXT_PUBLIC_SITE_URL`.
- Anything else (GitHub Pages, Cloudflare Pages, S3): run `npm run build` and upload `out/`.

## Where things live

```
app/
  layout.tsx          fonts, metadata, JSON-LD
  page.tsx            the story, in order
  globals.css         design tokens and all styles
  fonts/              self-hosted woff2 (from @fontsource)
  icon.svg, apple-icon.png, opengraph-image.png, twitter-image.png
  sitemap.ts, robots.ts
components/
  chapters/           one server component per chapter (all text is real HTML)
  three/              Three.js scenes, one module per chapter, plus engine.ts and gl.ts
  interactive/        DOM-only chapter logic (organize, checkpoint) and the donation picker
  StoryClient.tsx     loads the story engine in the browser only (ssr: false)
lib/site.ts           site URL, links, FAQ text (shared by the page and the JSON-LD)
public/
  brand/              icon.svg and icon-mono.svg (the app reuses icon.svg)
  screenshots/        real app screenshots as WebP (800 and 1200 wide)
  llms.txt
```

How the motion works: every chapter is server-rendered HTML. After first paint, `StoryEngine` loads `three/engine.ts`, which tracks each chapter's scroll progress and lazy-loads that chapter's module when it gets close. All 3D scenes share one WebGL renderer that draws only inside each stage's box (device pixel ratio capped at 1.5, nothing drawn off screen). Every stage has a static SVG version underneath that stays visible until the 3D scene draws its first frame, so if WebGL is missing or slow you still see the scene. With `prefers-reduced-motion`, chapters stop pinning and show their final state.

## SEO and answer-engine checklist

- [x] One H1, chapters as H2, questions as H3, no skipped levels
- [x] Title 56 characters, description 144 characters, both unique and not a restatement of each other
- [x] Canonical URL, Open Graph and Twitter card with a 1200x630 image and alt text
- [x] `lang="en"`, theme color, viewport
- [x] `sitemap.xml` (with a real last-modified date to update when content changes) and `robots.txt` pointing to it
- [x] JSON-LD in the static HTML: Organization, WebSite, SoftwareApplication (UtilitiesApplication, Windows, price 0 USD) and FAQPage built from the same text as the visible FAQ. Note: Google retired FAQ rich results in May 2026, so FAQPage won't produce a special search result; it stays because it is accurate and other consumers can read it.
- [x] Question headings with self-contained first answers of 40 to 60 words (How do I move my apps to a new PC..., Can I reinstall Windows without a USB stick?, Is Carryover free?)
- [x] A plain definition in the first paragraph ("Carryover is a free Windows app that...")
- [x] All story text is server-rendered, readable without JavaScript (checked in `out/index.html`)
- [x] Screenshots with descriptive alt text, width and height set, lazy loaded, WebP
- [x] 3D loads after first paint; the hero text is the LCP element
- [x] `llms.txt` (optional; Google says it neither helps nor hurts rankings, other AI tools may read it)
- [x] Search and AI answer crawlers allowed (Googlebot, OAI-SearchBot, Claude-SearchBot, PerplexityBot)
- [ ] Decide on AI training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot). They are allowed by default; block them in `app/robots.ts` if you prefer.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain
- [ ] After launch: submit the sitemap in Google Search Console and Bing Webmaster Tools
