import { GITHUB_URL } from "@/lib/site";

export default function SiteHeader() {
  return (
    <>
      <a className="skip" href="#main">Skip to the story</a>
      <header className="nav" id="top">
        <div className="nav-in">
          <a className="brand" href="#ch1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon.svg" width={36} height={36} alt="Carryover" />
            <span aria-hidden="true">Carryover</span>
          </a>
          <nav aria-label="Main">
            <ul>
              <li><a href="#ch1">The story</a></li>
              <li><a href="#free">Free</a></li>
              <li><a href="#faq">Questions</a></li>
            </ul>
          </nav>
          <a className="btn btn-ink btn-sm" href={GITHUB_URL}>Get Carryover on GitHub</a>
        </div>
        <div className="nav-tape" aria-hidden="true"><span /></div>
      </header>
    </>
  );
}
