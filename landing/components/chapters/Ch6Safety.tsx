import Kicker from "./Kicker";

const NAMED = [
  "Never save the recipe to the drive being erased.",
  "Never install an app that wasn't on the old PC.",
  "Save the BitLocker key before erasing.",
  "Only the Windows volume can be erased.",
];

export default function Ch6Safety() {
  return (
    <section className="chapter" id="ch6" data-chapter="6" style={{ ["--len" as string]: 2.2 }} aria-labelledby="ch6-title">
      <div className="pin side-l">
        <div className="head">
          <Kicker tag="Chapter 6">The checkpoint</Kicker>
          <h2 id="ch6-title" className="h-l">Nothing runs until the plan passes the rules and you approve it.</h2>
        </div>
        <div className="stage-wrap">
          <div className="stage stage-dom gate-stage" data-stage="6" data-plan="normal">
            <div className="lane">
              <div className="slip" data-slip>
                <p className="slip-title">Plan <span data-plan-name>(drafted)</span></p>
                <ol className="slip-steps plan-normal">
                  <li>Save BitLocker key to D:</li>
                  <li>Save PC Recipe to D:</li>
                  <li>Copy your files from C: to D:</li>
                  <li>Erase C: (Windows volume)</li>
                  <li>Install fresh Windows</li>
                  <li>Reinstall apps from the recipe</li>
                </ol>
                <ol className="slip-steps plan-risky">
                  <li className="bad">Save PC Recipe to C:</li>
                  <li>Erase C: (Windows volume)</li>
                  <li>Install fresh Windows</li>
                  <li className="bad">Install &quot;PC Optimizer Pro&quot;</li>
                </ol>
                <p className="stamp" aria-hidden="true">Approved by you</p>
              </div>
              <div className="gate" aria-hidden="true">
                <span className="gate-post" />
                <span className="gate-arm" />
                <span className="gate-light" />
              </div>
            </div>
            <div className="lights" aria-hidden="true">
              {Array.from({ length: 13 }, (_, i) => <span key={i} style={{ ["--i" as string]: i }} />)}
              <b data-lights-label>0 of 13 rules checked</b>
            </div>
          </div>
          <div className="stage-tools gate-tools">
            <button className="btn btn-line btn-sm" type="button" data-act="risky">Try a risky plan</button>
            <button className="btn btn-line btn-sm" type="button" data-act="normal">Send the normal plan</button>
            <button className="btn btn-ink btn-sm" type="button" data-act="approve" disabled>Approve plan</button>
          </div>
        </div>
        <div className="body">
          <p>An AI can draft the plan. Plain code then checks every step against fixed rules, 13 of them today. A few of them:</p>
          <ul className="rules">
            {NAMED.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div className="status gate-status" role="status" data-gate-status />
        </div>
      </div>
    </section>
  );
}
