import { GITHUB_URL, PCRF_URL } from "@/lib/site";
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
      <div className="wrap foot-small">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.svg" width={28} height={28} alt="" />
        <p>Carryover. Early development, free to use. Windows is a trademark of Microsoft.</p>
        <ul>
          <li><a href={GITHUB_URL}>Carryover on GitHub</a></li>
          <li>
            <a href={PCRF_URL} target="_blank" rel="noopener noreferrer">
              Give to PCRF<span className="sr-only"> (external charity, opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
