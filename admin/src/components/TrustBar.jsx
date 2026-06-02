const logos = [
  'IMMO PRESTIGE',
  'BÂTI-PRO',
  'GROUPE HORIZON',
  'CONSTRUCTA',
  'NEXIA',
  'AGENCE LUMA',
  'TERRA BTP',
  'VOLTA SERVICES',
]

export default function TrustBar() {
  return (
    <section className="bg-cloud py-10">
      <div className="container-x">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Ils pilotent déjà leurs équipes avec Pratonna
        </p>

        <div className="relative mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee items-center gap-12">
            {[...logos, ...logos].map((name, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-ink/35 transition-colors hover:text-brand-500"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
