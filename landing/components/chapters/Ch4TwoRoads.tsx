import Kicker from "./Kicker";
import StageArt from "./StageArt";

export default function Ch4TwoRoads() {
  return (
    <section className="chapter" id="ch4" data-chapter="4" style={{ ["--len" as string]: 2.6 }} aria-labelledby="ch4-title">
      <div className="pin side-l">
        <div className="head">
          <Kicker tag="Chapter 4">Where the box goes</Kicker>
          <h2 id="ch4-title" className="h-l">Then pick where the box goes.</h2>
          <div className="seg" role="radiogroup" aria-label="Mode">
            <button type="button" role="radio" aria-checked="true" data-mode="new">New device</button>
            <button type="button" role="radio" aria-checked="false" data-mode="refresh" tabIndex={-1}>Refresh this PC</button>
          </div>
        </div>
        <div className="stage-wrap">
          <div
            className="stage"
            data-stage="4"
            role="img"
            aria-label="New device mode: the PC Recipe box hops over Wi-Fi from the old laptop to the new one."
          >
            <StageArt kind="roads" />
          </div>
          <div className="disk" data-disk aria-hidden="true">
            <div className="disk-c">
              <span className="for-new"><b>Old PC:</b> stays exactly as it is</span>
              <span className="for-refresh"><b>C:</b> <span data-c-label>Windows</span></span>
              <i />
            </div>
            <div className="disk-d">
              <span className="for-new"><b>New PC:</b> gets the box</span>
              <span className="for-refresh"><b>D:</b> keeps the box and your files</span>
            </div>
          </div>
        </div>
        <div className="body mode-stack">
          <div className="mode-copy" data-mode-copy="new">
            <p>Pair once with a QR code or a short address on your Wi-Fi. The old PC serves Carryover to the new one, encrypted, and nothing goes through a server. Then it rebuilds the new machine.</p>
            <ul className="fit">
              <li><b>Less RAM?</b> Heavy apps stop starting with Windows.</li>
              <li><b>Smaller SSD?</b> You pick what comes along.</li>
              <li><b>Different GPU or maker?</b> The old vendor tools and drivers stay behind.</li>
            </ul>
          </div>
          <div className="mode-copy" data-mode-copy="refresh">
            <p>Refresh this PC gives you fresh Windows without a USB stick. Setup waits on a drive that stays untouched.</p>
            <p>Your files are copied off the Windows drive first and put back after, then Carryover rebuilds the same PC.</p>
            <p className="disk-text">Drive C: holds Windows and gets erased. Drive D: keeps the box and your files.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
