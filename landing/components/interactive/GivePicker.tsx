"use client";

import { useState } from "react";
import { PCRF_URL } from "@/lib/site";

// PCRF's own examples from their Gaza Relief and Recovery page.
const SAYS: Record<number, string> = {
  10: "$10 can provide hygiene essentials for a displaced family.",
  20: "$20 can keep a child warm through winter with a thick blanket.",
  50: "$50 can feed a family for several days.",
  100: "$100 can provide a mattress and warm clothing to someone who lost their home.",
};
const AMOUNTS = [10, 20, 50, 100];

export default function GivePicker() {
  const [amt, setAmt] = useState(20);
  return (
    <div className="give-box">
      <fieldset className="amounts">
        <legend>What a gift can do, in PCRF&apos;s own examples</legend>
        <div className="amounts-row">
          {AMOUNTS.map((a) => (
            <label key={a}>
              <input type="radio" name="amt" value={a} checked={amt === a} onChange={() => setAmt(a)} />
              <span>${a}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="give-says" aria-live="polite">{SAYS[amt]}</p>
      <div className="give-actions">
        <a className="btn btn-donate" href={PCRF_URL} target="_blank" rel="noopener noreferrer">
          <span className="btn-donate-main">Donate to PCRF</span>
          <span className="btn-donate-sub">opens pcrf.net in a new tab</span>
        </a>
        <p className="small">You choose the final amount on PCRF&apos;s page.{" "}
          <a href={PCRF_URL} target="_blank" rel="noopener noreferrer">Read about PCRF&apos;s Gaza relief work<span className="sr-only"> (opens pcrf.net in a new tab)</span></a>
        </p>
      </div>
    </div>
  );
}
