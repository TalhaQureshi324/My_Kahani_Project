/**
 * Infinite ticker — content is rendered twice; the track translates
 * -50% in a loop for a seamless scroll. Pauses on hover.
 */
export default function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
    >
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-display text-lg font-medium italic sm:text-xl">
            {item}
          </span>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <path d="M5 0l1.4 3.6L10 5 6.4 6.4 5 10 3.6 6.4 0 5l3.6-1.4Z" fill="currentColor" />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative overflow-hidden py-5 select-none">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
