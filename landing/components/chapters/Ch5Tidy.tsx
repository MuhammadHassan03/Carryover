import Kicker from "./Kicker";

const FOLDERS = ["Installers", "Screenshots", "Photos, by month", "PDFs", "Word", "Spreadsheets"];
// [name, extension badge, folder index, duplicate?]
const FILES: [string, string, number, boolean?][] = [
  ["setup_x64.exe", "EXE", 0],
  ["Screenshot 2026-03-14.png", "PNG", 1],
  ["IMG_2041.jpg", "JPG", 2],
  ["rent-receipt.pdf", "PDF", 3],
  ["cover-letter.docx", "DOC", 4],
  ["budget.xlsx", "XLS", 5],
  ["vlc-win64.exe", "EXE", 0],
  ["IMG_2041 (1).jpg", "JPG", 2, true],
  ["manual.pdf", "PDF", 3],
  ["Screenshot 2026-05-02.png", "PNG", 1],
  ["notes.docx", "DOC", 4],
  ["IMG_2188.jpg", "JPG", 2],
];

export default function Ch5Tidy() {
  return (
    <section className="chapter" id="ch5" data-chapter="5" style={{ ["--len" as string]: 2 }} aria-labelledby="ch5-title">
      <div className="pin side-r">
        <div className="head">
          <Kicker tag="Chapter 5">Optional</Kicker>
          <h2 id="ch5-title" className="h-l">Your Downloads folder can come out tidier than it went in.</h2>
          <label className="switch">
            <input type="checkbox" role="switch" data-organize />
            <span className="switch-ui" aria-hidden="true"><span /></span>
            <span className="switch-text">Organize my files</span>
          </label>
        </div>
        <div className="stage-wrap">
          <div className="stage stage-dom desk" data-stage="5">
            <p className="desk-bar"><span>Downloads</span><span aria-hidden="true">_ □ ×</span></p>
            <ul className="files" aria-label="Loose files in Downloads (example)">
              {FILES.map(([name, ext, f, dup], i) => (
                <li key={name} className="file" data-folder={f} data-dup={dup ? "1" : undefined} style={{ ["--i" as string]: i }}>
                  <span className="file-in">
                    <span className={`file-ico ext-${ext.toLowerCase()}`} aria-hidden="true">{ext}</span>
                    <span className="file-name">{name}</span>
                    {dup ? <span className="dup-flag">Duplicate? Kept</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="folders" aria-label="Folders Carryover sorts into">
              {FOLDERS.map((n, i) => (
                <li key={n} className="folder" data-folder-i={i}>
                  <span className="folder-ico" aria-hidden="true" />
                  <span className="folder-name">{n}</span>
                  <span className="folder-count" data-count={i} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </div>
          <div className="stage-tools">
            <p className="hint"><span className="marker">Flick the switch.</span> Nothing gets deleted.</p>
            <button className="btn btn-line btn-sm" type="button" data-act="undo" disabled>Undo all moves</button>
          </div>
        </div>
        <div className="body">
          <p>Loose files on your Desktop and in Downloads go into folders: Installers, Screenshots, Photos by month, PDFs, Word, Spreadsheets.</p>
          <p>Nothing gets deleted or overwritten. Duplicates get a flag, and you can undo any move.</p>
          <p className="status" role="status" data-organize-status />
        </div>
      </div>
    </section>
  );
}
