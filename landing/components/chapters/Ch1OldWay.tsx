import Kicker from "./Kicker";
import StageArt from "./StageArt";
import { SITE } from "@/lib/site";

export default function Ch1OldWay() {
  return (
    <section className="chapter" id="ch1" data-chapter="1" style={{ ["--len" as string]: 3.2 }} aria-labelledby="ch1-title">
      <div className="pin side-r">
        <div className="head">
          <Kicker tag="Chapter 1">The old way</Kicker>
          <h1 id="ch1-title" className="h-xl">Setting up a new PC still eats a weekend.</h1>
          <p className="lead">{SITE.definition}</p>
        </div>
        <div className="stage-wrap">
          <div className="clock" aria-hidden="true">
            <span className="clock-label">Your weekend</span>
            <span className="clock-time" data-clock>Sat 10:00</span>
            <span className="clock-hours"><b data-hours>0</b> hours in</span>
          </div>
          <div
            className="stage"
            data-stage="1"
            role="img"
            aria-label="An old laptop in 3D. As you scroll, installer windows, sticky notes with passwords, Windows Setup errors and a BitLocker recovery screen pile up around it."
          >
            <StageArt kind="pain" />
          </div>
          <div className="stage-tools">
            <p className="hint"><span className="marker">Drag the mess around,</span> or click a window to close it.</p>
            <button className="btn btn-line btn-sm" type="button" data-act="close-one">Close a window</button>
          </div>
        </div>
        <div className="body">
          <ol className="beats" aria-label="What a new PC usually costs you">
            <li>Dozens of apps to find, download and click through, one installer at a time.</li>
            <li>Windows Backup brings back your Store apps. Everything else is on you.</li>
            <li>Windows Setup says &quot;We couldn&apos;t find any drives&quot; because the storage driver is missing.</li>
            <li>A BitLocker screen asks for a recovery key you never wrote down.</li>
            <li>Paid migration tools cost $35 to $80, and they are slow.</li>
          </ol>
          <p className="sr-only">The clock runs from Saturday morning into Sunday night while this happens.</p>
          <div className="cta-row">
            <a className="btn btn-tape" href="#ch2">See how Carryover does it</a>
          </div>
        </div>
      </div>
    </section>
  );
}
