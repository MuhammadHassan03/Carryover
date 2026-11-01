import Kicker from "./Kicker";
import StageArt from "./StageArt";

export default function Ch7Unpacked() {
  return (
    <section className="chapter" id="ch7" data-chapter="7" style={{ ["--len" as string]: 2.4 }} aria-labelledby="ch7-title">
      <div className="pin side-r">
        <div className="head">
          <Kicker tag="Chapter 7">Unpacked</Kicker>
          <h2 id="ch7-title" className="h-l">The new PC fills up, and you get a short list of what&apos;s left.</h2>
        </div>
        <div className="stage-wrap">
          <div
            className="stage"
            data-stage="7"
            role="img"
            aria-label="On the new laptop the box opens. Tiles fly out and fill the screen with apps until it looks like the old desktop."
          >
            <StageArt kind="unpacked" />
          </div>
          <div className="stage-tools">
            <p className="hint">Drag to turn the laptop.</p>
          </div>
        </div>
        <div className="body">
          <div className="report">
            <p className="report-title">Done report <span>(example)</span></p>
            <p>Apps reinstalled. Drivers in. Settings and files back where they were.</p>
            <fieldset>
              <legend>Still needs you</legend>
              <label><input type="checkbox" /> Sign in to Adobe</label>
              <label><input type="checkbox" /> Activate Office</label>
              <label><input type="checkbox" /> Set up your two-factor app again</label>
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}
