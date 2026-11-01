import GivePicker from "@/components/interactive/GivePicker";
import { DONATE_WHERE } from "@/lib/site";

export default function Donate() {
  return (
    <section className="donate" id="donate" aria-labelledby="donate-title">
      <div className="wrap donate-in">
        <h2 id="donate-title" className="h-l">Carryover is free. If it helped, give to children in Gaza.</h2>
        <p className="donate-where">{DONATE_WHERE}</p>
        <GivePicker />
      </div>
    </section>
  );
}
