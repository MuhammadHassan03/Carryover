import Kicker from "./Kicker";
import GivePicker from "@/components/interactive/GivePicker";

const FREE = ["New device", "Refresh this PC", "Drivers", "Organize my files", "Rollback", "No account", "No limits", "No ads"];

export default function FreeGive() {
  return (
    <section className="free" id="free" aria-labelledby="free-title">
      <div className="wrap">
        <Kicker tag="The bill">There isn&apos;t one</Kicker>
        <h2 id="free-title" className="h-xl">Free. All of it.</h2>
        <p className="lead">Every feature is free: New device, Refresh this PC, drivers, Organize my files, rollback. You don&apos;t need an account, there are no limits, and there are no ads.</p>
        <ul className="free-list" aria-label="Included for free">
          {FREE.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <div className="give" id="give">
          <h3 id="give-title">If Carryover saved you an evening, consider giving to children in Gaza instead of paying us.</h3>
          <GivePicker />
          <p className="small">This goes to the Palestine Children&apos;s Relief Fund (PCRF), an outside charity. Carryover takes nothing. You choose the final amount on their page.</p>
        </div>
      </div>
    </section>
  );
}
