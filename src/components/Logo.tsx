export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--cobalt)" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="var(--saffron)" strokeWidth="4" />
      <ellipse cx="32" cy="33" rx="13" ry="10" fill="#F5A9BC" />
      <ellipse cx="27" cy="33" rx="2.6" ry="3.6" fill="#121A33" />
      <ellipse cx="37" cy="33" rx="2.6" ry="3.6" fill="#121A33" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.9rem] leading-none font-black tracking-tight">Purcel</span>
    </span>
  )
}
