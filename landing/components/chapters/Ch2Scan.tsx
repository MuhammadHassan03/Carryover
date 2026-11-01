import Kicker from "./Kicker";
import StageArt from "./StageArt";

export default function Ch2Scan() {
  return (
    <section className="chapter" id="ch2" data-chapter="2" style={{ ["--len" as string]: 2.4 }} aria-labelledby="ch2-title">
      <div className="pin side-l">
        <div className="head">
          <Kicker tag="Chapter 2">Read the old PC</Kicker>
          <h2 id="ch2-title" className="h-l">First, Carryover reads your old PC.</h2>
        </div>
        <div className="stage-wrap">
          <div
            className="stage"
            data-stage="2"
            role="img"
            aria-label="A scan line passes down the old laptop. Apps, drivers, settings and files lift out of the screen as labelled tiles."
          >
            <StageArt kind="scan" />
          </div>
          <div className="stage-tools">
            <p className="hint">Example scan. Point at a tile to lift it.</p>
            <button className="btn btn-line btn-sm" type="button" data-act="rescan">Run the scan again</button>
          </div>
        </div>
        <div className="body">
          <p>It finds the apps it can reinstall, the drivers your hardware needs, your settings and where your files live.</p>
          <p>Apps are saved as installable IDs, so the new PC gets clean copies.</p>
          <ul className="found" aria-label="What the example scan found">
            <li><span className="tag tag-app">App</span> Firefox, Steam, VLC, 7-Zip</li>
            <li><span className="tag tag-drv">Driver</span> Storage controller, Wi-Fi</li>
            <li><span className="tag tag-set">Setting</span> Dark mode, mouse speed</li>
            <li><span className="tag tag-file">Files</span> Documents, Photos</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
