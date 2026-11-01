import { AUTHOR, DONATE_WHERE, GITHUB_URL, PCRF_URL } from "@/lib/site";
import StageArt from "@/components/chapters/StageArt";

export default function SiteFooter() {
  return (
    <footer className="foot" aria-labelledby="foot-title">
      <div className="wrap foot-grid">
        <div className="foot-copy">
          <h2 id="foot-title" className="h-l">Moving day is done. The boxes fold flat.</h2>
          <p>Carryover is early and open on GitHub. Windows first.</p>
          <a className="btn btn-tape" href={GITHUB_URL}>Get Carryover on GitHub</a>
        </div>
        <div className="stage-wrap" data-chapter="foot">
          <div className="stage stage-foot" data-stage="foot" role="img" aria-label="A stack of flattened moving boxes. Click a box to poke it.">
            <StageArt kind="stack" />
          </div>
          <div className="stage-tools">
            <button className="btn btn-line-light btn-sm" type="button" data-act="poke">Poke the stack</button>
          </div>
        </div>
      </div>
      <div className="wrap foot-meta">
        <div className="foot-give">
          <p className="foot-label">Give back</p>
          <p>{DONATE_WHERE}</p>
          <a href={PCRF_URL} target="_blank" rel="noopener noreferrer">Donate to PCRF<span className="sr-only"> (opens pcrf.net in a new tab)</span></a>
          <span className="foot-note" aria-hidden="true">opens pcrf.net</span>
        </div>
        <div className="foot-credits">
          <p className="foot-label">Credits</p>
          <p>{`Made by ${AUTHOR.name}.`}</p>
          <ul>
            <li><a href={AUTHOR.github}>{AUTHOR.name} on GitHub</a></li>
            <li><a href={AUTHOR.x}>{AUTHOR.name} on X</a></li>
            <li><a href={GITHUB_URL}>Carryover source code</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap foot-small">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.svg" width={28} height={28} alt="" />
        <p>Carryover. Early development, free to use. Windows is a trademark of Microsoft.</p>
      </div>
    </footer>
  );
}
