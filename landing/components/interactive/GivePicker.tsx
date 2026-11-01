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
    <>
      <fieldset className="amounts">
        <legend>Pick an amount to see what it does, using PCRF&apos;s own examples</legend>
        {AMOUNTS.map((a) => (
          <label key={a}>
            <input type="radio" name="amt" value={a} checked={amt === a} onChange={() => setAmt(a)} />
            <span>${a}</span>
          </label>
        ))}
      </fieldset>
      <p className="give-says" aria-live="polite">{SAYS[amt]}</p>
      <a className="btn btn-tape" href={PCRF_URL} target="_blank" rel="noopener noreferrer">
        Give ${amt} through PCRF
        <span className="sr-only"> (opens the Palestine Children&apos;s Relief Fund site in a new tab)</span>
      </a>
    </>
  );
}
