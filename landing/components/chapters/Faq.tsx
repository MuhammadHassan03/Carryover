import { FAQS } from "@/lib/site";

export default function Faq() {
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <h2 id="faq-title" className="h-l">Questions people ask</h2>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <article key={f.q} className="qa" aria-labelledby={`q${i}`}>
              <h3 id={`q${i}`}>{f.q}</h3>
              <p>{f.a}</p>
              {f.more ? <p className="qa-more">{f.more}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
