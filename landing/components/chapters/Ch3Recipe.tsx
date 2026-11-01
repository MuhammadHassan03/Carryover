import Kicker from "./Kicker";
import StageArt from "./StageArt";

export const RECIPE = `# PC Recipe
from: old laptop, Windows 11
bitlocker_key: saved first
apps:
  - Mozilla.Firefox
  - 7zip.7zip
  - Valve.Steam
  - VideoLAN.VLC
drivers:
  - storage controller  # Setup needs it
  - wifi, audio, touchpad
disks: C: Windows, D: Data
games: re-link D:\\SteamLibrary
debloat: remove trial apps`;

export default function Ch3Recipe() {
  return (
    <section className="chapter" id="ch3" data-chapter="3" style={{ ["--len" as string]: 2.8 }} aria-labelledby="ch3-title">
      <div className="pin side-r">
        <div className="head">
          <Kicker tag="Chapter 3">Pack it</Kicker>
          <h2 id="ch3-title" className="h-l">All of it fits in one small file, the PC Recipe.</h2>
        </div>
        <div className="stage-wrap">
          <div
            className="stage"
            data-stage="3"
            role="img"
            aria-label="The tiles drop into a cardboard moving box labelled PC Recipe. The flaps fold shut and orange tape seals it."
          >
            <StageArt kind="box" />
          </div>
          <div className="stage-tools">
            <p className="hint">Drag the box to turn it.</p>
            <button className="btn btn-line btn-sm" type="button" data-act="seal" aria-pressed="false">Seal the box</button>
          </div>
        </div>
        <div className="body">
          <p>Apps, drivers, disk layout and your debloat choices, in plain text you can read. That includes the storage driver Windows Setup needs, so &quot;We couldn&apos;t find any drives&quot; never shows up.</p>
          <p>Your BitLocker key is saved first. Game libraries get re-linked, so your games don&apos;t download again.</p>
          <figure className="recipe">
            <figcaption>pc-recipe.yaml <span>(example)</span></figcaption>
            <pre className="recipe-full" data-recipe>{RECIPE}</pre>
          </figure>
        </div>
      </div>
    </section>
  );
}
