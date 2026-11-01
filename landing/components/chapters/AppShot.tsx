// A real screenshot of the Carryover desktop app, framed as a window taped onto the page.
export type Shot = { file: string; alt: string; caption: string; dark?: boolean };

export default function AppShot({ shot, tilt = 0 }: { shot: Shot; tilt?: number }) {
  const base = `/screenshots/${shot.file}`;
  return (
    <figure className={`shot${shot.dark ? " shot-dark" : ""}`} style={{ ["--tilt" as string]: `${tilt}deg` }}>
      <div className="shot-win">
        <p className="shot-bar" aria-hidden="true"><span>Carryover</span></p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}-1200.webp`}
          srcSet={`${base}-800.webp 800w, ${base}-1200.webp 1200w`}
          sizes="(min-width: 900px) 46vw, 92vw"
          width={1200}
          height={800}
          alt={shot.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}
