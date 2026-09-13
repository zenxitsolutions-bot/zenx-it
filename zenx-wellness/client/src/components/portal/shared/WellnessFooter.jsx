export function WellnessFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 bg-cream px-5 py-7 text-forest min-[1050px]:px-9 min-[1050px]:py-9">
      <p className="text-[8px] leading-5 tracking-[0.25em] uppercase">
        Wellness <span className="mx-3" aria-hidden="true">/</span> For healthier, happier humans
      </p>
      <span className="hidden h-px min-w-12 max-w-md flex-1 bg-brand-mid/45 xl:block" aria-hidden="true" />
      <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:gap-6 min-[1050px]:pr-14">
        <p className="min-w-0 font-serif text-sm italic">Good nutrition today. A kinder tomorrow.</p>
        <svg viewBox="0 0 48 48" className="size-10 shrink-0 text-brand-mid" fill="none" aria-hidden="true">
          <path d="M10 43C17 29 25 18 40 6M21 27L13 16M28 19L38 18" stroke="currentColor" strokeWidth="1.1" />
          <path d="M15 34C4 29 5 20 7 17C14 20 18 26 15 34ZM20 27C10 22 11 12 13 8C20 13 24 20 20 27ZM25 23C29 14 37 14 42 15C37 22 32 25 25 23ZM30 16C30 6 37 3 43 3C42 10 37 15 30 16Z" fill="currentColor" opacity=".85" />
          <path d="M15 33L8 20M20 26L14 11M27 22L39 17M32 14L41 5" stroke="var(--color-cream)" strokeWidth=".7" />
        </svg>
      </div>
    </footer>
  );
}
