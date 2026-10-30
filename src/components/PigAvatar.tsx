import { memo, useId, type ReactNode } from 'react'
import clsx from 'clsx'
import { PIGS, type Accessory, type Ears, type Eyes, type Mouth, type PigConfig } from '@/components/pigs'

const INK = '#121A33'
const SW = 2.5
const stroke = { stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const line = { ...stroke, fill: 'none' }

function mirror(node: ReactNode) {
  return <g transform="translate(120 0) scale(-1 1)">{node}</g>
}

function both(node: ReactNode) {
  return (
    <>
      {node}
      {mirror(node)}
    </>
  )
}

function star(cx: number, cy: number, r: number) {
  const points: string[] = []
  for (let index = 0; index < 10; index++) {
    const radius = index % 2 === 0 ? r : r * 0.45
    const angle = (Math.PI / 5) * index - Math.PI / 2
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

function backEars(ears: Ears, pig: PigConfig) {
  if (ears === 'up') {
    return both(
      <g>
        <path d="M28 54 L21 18 Q22 14 26 16 L54 38 Z" fill={pig.skin} {...stroke} />
        <path d="M30 46 L26 25 L45 38 Z" fill={pig.snout} />
      </g>,
    )
  }
  if (ears === 'round') {
    return both(
      <g>
        <circle cx="30" cy="36" r="13" fill={pig.skin} {...stroke} />
        <circle cx="30" cy="36" r="7" fill={pig.snout} />
      </g>,
    )
  }
  return null
}

function frontEars(ears: Ears, pig: PigConfig) {
  if (ears !== 'floppy') return null
  return both(<path d="M36 38 Q18 28 14 46 Q12 60 28 58 Q38 50 46 42 Z" fill={pig.skin} {...stroke} />)
}

function eye(kind: Eyes, x: number, side: 'left' | 'right'): ReactNode {
  const y = 60
  switch (kind) {
    case 'happy':
      return <path d={`M${x - 6} ${y + 2} Q${x} ${y - 6} ${x + 6} ${y + 2}`} {...line} strokeWidth={3} />
    case 'sleepy':
      return <path d={`M${x - 6} ${y} Q${x} ${y + 5} ${x + 6} ${y}`} {...line} strokeWidth={3} />
    case 'wink':
      return side === 'left' ? eye('dot', x, side) : eye('happy', x, side)
    case 'wide':
      return (
        <g>
          <circle cx={x} cy={y} r="7.5" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={x} cy={y + 0.5} r="3.6" fill={INK} />
        </g>
      )
    case 'star':
      return <polygon points={star(x, y, 7)} fill="#F0B30A" {...stroke} strokeWidth={1.8} />
    case 'heart':
      return (
        <path
          transform={`translate(${x} ${y}) scale(1.5)`}
          d="M0 3.6 C-6 -1 -4.6 -7.4 0 -3.6 C4.6 -7.4 6 -1 0 3.6 Z"
          fill="#D9364A"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      )
    case 'dizzy':
      return <path d={`M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`} {...line} strokeWidth={3} />
    case 'angry':
      return (
        <g>
          {eye('dot', x, side)}
          <path d={side === 'left' ? `M${x - 9} ${y - 11} L${x + 6} ${y - 6}` : `M${x + 9} ${y - 11} L${x - 6} ${y - 6}`} {...line} strokeWidth={3.2} />
        </g>
      )
    case 'side':
      return (
        <g>
          <ellipse cx={x} cy={y} rx="7" ry="5.5" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={x + 3} cy={y + 0.5} r="3" fill={INK} />
          <path d={`M${x - 8} ${y - 2} L${x + 8} ${y - 2}`} {...line} strokeWidth={2} />
        </g>
      )
    case 'tired':
      return (
        <g>
          <circle cx={x} cy={y + 1} r="4" fill={INK} />
          <path d={`M${x - 6} ${y - 1} L${x + 6} ${y - 1}`} {...line} strokeWidth={3} />
          <path d={`M${x - 6} ${y + 7} Q${x} ${y + 10} ${x + 6} ${y + 7}`} fill="none" stroke="#9A6A8A" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'money':
      return (
        <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="Arial, sans-serif" fill="#13A06E" stroke={INK} strokeWidth="0.8">
          $
        </text>
      )
    default:
      return (
        <g>
          <circle cx={x} cy={y} r="4.6" fill={INK} />
          <circle cx={x + 1.6} cy={y - 1.6} r="1.6" fill="#fff" />
        </g>
      )
  }
}

function mouth(kind: Mouth) {
  switch (kind) {
    case 'grin':
    case 'goldtooth':
      return (
        <g>
          <path d="M46 90 Q60 106 74 90 Z" fill="#fff" {...stroke} />
          <path d="M48 92.5 L72 92.5" stroke={INK} strokeWidth="1.5" />
          {kind === 'goldtooth' ? <rect x="62" y="90.6" width="5" height="4.6" rx="1" fill="#F0B30A" stroke={INK} strokeWidth="1.2" /> : null}
        </g>
      )
    case 'open':
      return (
        <g>
          <ellipse cx="60" cy="95" rx="6.5" ry="6" fill="#7A1F33" {...stroke} />
          <path d="M55.5 97.5 Q60 94 64.5 97.5 Q60 101 55.5 97.5 Z" fill="#EE7C91" />
        </g>
      )
    case 'tongue':
      return (
        <g>
          <path d="M55 94 Q60 105 65 94 Z" fill="#E8546B" {...stroke} strokeWidth={2} />
          <path d="M49 92 Q60 99 71 92" {...line} strokeWidth={3} />
        </g>
      )
    case 'flat':
      return <path d="M52 95 L68 95" {...line} strokeWidth={3} />
    case 'smirk':
      return <path d="M51 95 Q63 98 71 89" {...line} strokeWidth={3} />
    case 'o':
      return <circle cx="60" cy="95" r="4" fill="#7A1F33" {...stroke} strokeWidth={2} />
    case 'frown':
      return <path d="M50 99 Q60 90 70 99" {...line} strokeWidth={3} />
    case 'fangs':
      return (
        <g>
          <path d="M53 93 L55.5 99.5 L58 93.5 Z M62 93.5 L64.5 99.5 L67 93 Z" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M48 92 Q60 97 72 92" {...line} strokeWidth={3} />
        </g>
      )
    default:
      return <path d="M49 92 Q60 101 71 92" {...line} strokeWidth={3} />
  }
}

const BEHIND: Partial<Record<Accessory, ReactNode>> = {
  cape: (
    <g>
      <path d="M2 122 L16 70 L36 98 L60 108 L84 98 L104 70 L118 122 Z" fill="#1B1626" {...stroke} />
      <path d="M22 122 L26 92 L40 104 L60 112 L80 104 L94 92 L98 122 Z" fill="#B3192F" />
    </g>
  ),
  mullet: both(<path d="M24 62 Q16 98 34 112 L42 92 Q30 84 30 62 Z" fill="#8B5A2B" {...stroke} />),
}

const FACE: Partial<Record<Accessory, ReactNode>> = {
  sunglasses: (
    <g>
      <path d="M24 56 L34 56 M86 56 L96 56 M56 58 Q60 55 64 58" {...line} />
      <rect x="33" y="51" width="24" height="15" rx="6" fill={INK} />
      <rect x="63" y="51" width="24" height="15" rx="6" fill={INK} />
      <path d="M37 55 L43 55 M67 55 L73 55" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  ),
  glasses: (
    <g>
      <circle cx="46" cy="60" r="10" fill="#fff" fillOpacity="0.25" {...stroke} />
      <circle cx="74" cy="60" r="10" fill="#fff" fillOpacity="0.25" {...stroke} />
      <path d="M56 59 Q60 56 64 59 M36 58 L25 54 M84 58 L95 54" {...line} />
    </g>
  ),
  monocle: (
    <g>
      <circle cx="74" cy="60" r="10.5" fill="#fff" fillOpacity="0.2" stroke="#C99A06" strokeWidth="3" />
      <path d="M82 67 Q88 84 84 100" fill="none" stroke="#C99A06" strokeWidth="1.6" strokeDasharray="2 2" />
    </g>
  ),
  eyepatch: (
    <g>
      <path d="M22 48 L38 55 M54 56 L98 44" {...line} strokeWidth={2.2} />
      <ellipse cx="46" cy="60" rx="10" ry="8.5" fill={INK} />
    </g>
  ),
  glasses3d: (
    <g>
      <rect x="32" y="51" width="56" height="17" rx="3" fill="#fff" {...stroke} />
      <rect x="36" y="54" width="20" height="11" rx="2" fill="#D9364A" opacity="0.9" />
      <rect x="64" y="54" width="20" height="11" rx="2" fill="#2E8BE6" opacity="0.9" />
    </g>
  ),
  goggles: (
    <g>
      <path d="M21 58 L99 58" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <rect x="31" y="49" width="58" height="21" rx="10" fill="#F0B30A" {...stroke} />
      <path d="M38 54 Q48 51 56 55" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </g>
  ),
  clownNose: (
    <g>
      <circle cx="60" cy="78" r="12.5" fill="#E02F45" {...stroke} />
      <circle cx="55" cy="73" r="3.4" fill="#fff" opacity="0.75" />
    </g>
  ),
  handlebar: both(<path d="M60 87.5 C52 83 44 85 40 90 C38 93 33 91 35 86" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />),
  walrus: <path d="M38 89 Q60 78 82 89 Q80 99 71 95 Q66 101 60 96 Q54 101 49 95 Q40 99 38 89 Z" fill="#6E4B2A" {...stroke} />,
  beard: <path d="M24 80 Q28 114 60 116 Q92 114 96 80 Q86 102 60 102 Q34 102 24 80 Z" fill="#6E4B2A" {...stroke} />,
  cigar: (
    <g>
      <g transform="rotate(14 70 94)">
        <rect x="66" y="91" width="24" height="6" rx="2.5" fill="#8B5A2B" {...stroke} strokeWidth={1.8} />
        <rect x="86" y="91" width="5" height="6" rx="1.5" fill="#C8C8C8" stroke={INK} strokeWidth="1.4" />
        <rect x="72" y="91" width="4" height="6" fill="#D9364A" />
      </g>
    </g>
  ),
  pipe: (
    <g>
      <path d="M65 94 L82 98" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M79 88 L91 88 L90 100 Q85 104 80 100 Z" fill="#6E4B2A" {...stroke} strokeWidth={2} />
    </g>
  ),
  bandaid: (
    <g transform="rotate(-28 84 44)">
      <rect x="74" y="40" width="22" height="8" rx="4" fill="#E8C39E" {...stroke} strokeWidth={1.8} />
      <rect x="81" y="40" width="8" height="8" fill="#D9AE85" />
    </g>
  ),
  scar: <path d="M39 48 L54 72 M42 56 L47 53 M46 63 L51 60" fill="none" stroke="#9E2337" strokeWidth="2.2" strokeLinecap="round" />,
  earring: <circle cx="25" cy="54" r="4.5" fill="none" stroke="#E0A800" strokeWidth="2.8" />,
  bowtie: (
    <g>
      <path d="M60 107 L44 99 L44 115 Z M60 107 L76 99 L76 115 Z" fill="#D9364A" {...stroke} />
      <circle cx="60" cy="107" r="4" fill="#B3192F" {...stroke} strokeWidth={2} />
    </g>
  ),
  scarf: (
    <g>
      <path d="M24 98 Q60 116 96 98 L98 110 Q60 128 22 110 Z" fill="#F0B30A" {...stroke} />
      <path d="M23 104 Q60 121 97 104" stroke="#2443C6" strokeWidth="4" fill="none" opacity="0.95" />
      <path d="M24 108.5 Q60 125 96 108.5" stroke="#D9364A" strokeWidth="3.4" fill="none" />
    </g>
  ),
  sweat: <path d="M93 40 Q99 49 96 53 Q92 56 89 52 Q88 47 93 40 Z" fill="#8FD0F5" {...stroke} strokeWidth={1.6} />,
  tear: <path d="M42 68 Q47 76 44 80 Q40 83 37 79 Q37 74 42 68 Z" fill="#8FD0F5" {...stroke} strokeWidth={1.6} />,
}

const TOP: Partial<Record<Accessory, ReactNode>> = {
  vampireHair: <path d="M22 54 Q22 24 60 26 Q98 24 98 54 Q90 42 75 41 L60 56 L45 41 Q30 42 22 54 Z" fill="#14101C" {...stroke} />,
  mullet: <path d="M28 42 Q60 22 92 42 Q78 36 70 40 Q64 34 58 39 Q50 34 44 40 Q36 36 28 42 Z" fill="#8B5A2B" {...stroke} />,
  mohawk: <path d="M44 38 L46 12 L54 32 L60 4 L66 32 L74 12 L76 38 Z" fill="#D9364A" {...stroke} />,
  curl: <path d="M60 34 Q50 22 60 17 Q70 16 68 25 Q66 30 61 27" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  tophat: (
    <g>
      <rect x="42" y="2" width="36" height="32" rx="3" fill={INK} />
      <rect x="42" y="24" width="36" height="7" fill="#D9364A" />
      <ellipse cx="60" cy="34" rx="31" ry="6" fill={INK} />
    </g>
  ),
  cap: (
    <g>
      <path d="M28 42 Q28 12 60 12 Q92 12 92 42 Z" fill="#2443C6" {...stroke} />
      <path d="M60 38 Q94 34 108 46 Q92 50 60 44 Z" fill="#1A3299" {...stroke} />
      <circle cx="60" cy="12.5" r="3" fill="#F0B30A" stroke={INK} strokeWidth="1.6" />
    </g>
  ),
  crown: (
    <g>
      <path d="M33 40 L35 14 L48 28 L60 8 L72 28 L85 14 L87 40 Z" fill="#F0B30A" {...stroke} />
      <circle cx="60" cy="31" r="3.4" fill="#D9364A" stroke={INK} strokeWidth="1.4" />
      <circle cx="44" cy="34" r="2.4" fill="#2443C6" />
      <circle cx="76" cy="34" r="2.4" fill="#2443C6" />
    </g>
  ),
  party: (
    <g transform="rotate(-14 60 36)">
      <path d="M60 2 L45 38 L75 38 Z" fill="#2443C6" {...stroke} />
      <path d="M52.5 20 L67.5 20 M48.6 29 L71.4 29" stroke="#F0B30A" strokeWidth="4" />
      <circle cx="60" cy="3" r="5" fill="#D9364A" {...stroke} strokeWidth={1.8} />
    </g>
  ),
  beanie: (
    <g>
      <path d="M25 46 Q25 12 60 12 Q95 12 95 46 Z" fill="#13A06E" {...stroke} />
      <rect x="22" y="38" width="76" height="13" rx="6.5" fill="#0D7A53" {...stroke} />
      <path d="M32 40 V49 M42 40 V49 M52 40 V49 M62 40 V49 M72 40 V49 M82 40 V49 M90 40 V49" stroke="#0A5E40" strokeWidth="2" />
      <circle cx="60" cy="10" r="7.5" fill="#fff" {...stroke} />
    </g>
  ),
  chef: (
    <g>
      <rect x="38" y="22" width="44" height="17" rx="3" fill="#fff" {...stroke} />
      <circle cx="44" cy="18" r="11" fill="#fff" {...stroke} />
      <circle cx="76" cy="18" r="11" fill="#fff" {...stroke} />
      <circle cx="60" cy="12" r="13" fill="#fff" {...stroke} />
      <path d="M36 26 L84 26" stroke="#fff" strokeWidth="6" />
    </g>
  ),
  cowboy: (
    <g>
      <path d="M40 34 Q38 6 52 10 Q60 14 68 10 Q82 6 80 34 Z" fill="#8B5A2B" {...stroke} />
      <rect x="40" y="27" width="40" height="6" fill="#D9364A" />
      <path d="M10 32 Q30 46 60 42 Q90 46 110 32 Q100 28 92 34 Q60 38 28 34 Q20 28 10 32 Z" fill="#A86C36" {...stroke} />
    </g>
  ),
  viking: (
    <g>
      <path d="M32 32 Q12 26 13 4 Q24 22 40 24 Z" fill="#F3EBD8" {...stroke} />
      <path d="M88 32 Q108 26 107 4 Q96 22 80 24 Z" fill="#F3EBD8" {...stroke} />
      <path d="M27 46 Q27 14 60 14 Q93 14 93 46 Z" fill="#9AA3B5" {...stroke} />
      <rect x="25" y="39" width="70" height="9" rx="4" fill="#6B7590" {...stroke} />
      <path d="M60 14 V39" stroke="#6B7590" strokeWidth="5" />
    </g>
  ),
  wizard: (
    <g>
      <path d="M64 -6 L34 40 L86 40 Z" fill="#7A4FD0" {...stroke} />
      <ellipse cx="60" cy="40" rx="36" ry="6.5" fill="#5D36B0" {...stroke} />
      <polygon points={star(56, 26, 5)} fill="#F0B30A" />
      <polygon points={star(68, 14, 3.5)} fill="#F0B30A" />
    </g>
  ),
  halo: <ellipse cx="60" cy="14" rx="25" ry="6.5" fill="none" stroke="#F0B30A" strokeWidth="5" />,
  horns: both(<path d="M40 38 Q32 18 42 6 Q44 24 52 34 Z" fill="#D9364A" {...stroke} />),
  fedora: (
    <g>
      <path d="M38 32 Q36 10 50 12 Q60 18 70 12 Q84 10 82 32 Z" fill="#2E2A3A" {...stroke} />
      <rect x="38" y="25" width="44" height="6" fill="#C9A227" />
      <ellipse cx="60" cy="33" rx="35" ry="6.5" fill="#2E2A3A" {...stroke} />
    </g>
  ),
  beret: (
    <g transform="rotate(-12 58 28)">
      <ellipse cx="58" cy="30" rx="32" ry="12" fill="#1E2238" {...stroke} />
      <rect x="56" y="14" width="4" height="7" rx="2" fill="#1E2238" />
    </g>
  ),
  santa: (
    <g>
      <path d="M28 40 Q38 6 70 8 Q94 12 100 34 Z" fill="#D9364A" {...stroke} />
      <path d="M70 8 Q98 2 104 24" fill="none" stroke={INK} strokeWidth={SW} />
      <path d="M68 9 Q96 4 102 22 L94 26 Q90 14 70 14 Z" fill="#D9364A" />
      <circle cx="104" cy="26" r="7" fill="#fff" {...stroke} />
      <rect x="22" y="33" width="78" height="12" rx="6" fill="#fff" {...stroke} />
    </g>
  ),
  bow: (
    <g transform="rotate(18 88 26)">
      <path d="M88 26 L74 18 L74 34 Z M88 26 L102 18 L102 34 Z" fill="#D9468F" {...stroke} />
      <circle cx="88" cy="26" r="4" fill="#B02E6E" {...stroke} strokeWidth={2} />
    </g>
  ),
  headphones: (
    <g>
      <path d="M20 66 Q18 10 60 10 Q102 10 100 66" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <rect x="12" y="54" width="16" height="24" rx="7" fill="#D9364A" {...stroke} />
      <rect x="92" y="54" width="16" height="24" rx="7" fill="#D9364A" {...stroke} />
    </g>
  ),
  bandana: (
    <g>
      <path d="M22 48 Q60 32 98 48 L97 38 Q60 22 23 38 Z" fill="#D9364A" {...stroke} />
      <circle cx="40" cy="38" r="1.8" fill="#fff" />
      <circle cx="60" cy="33" r="1.8" fill="#fff" />
      <circle cx="80" cy="38" r="1.8" fill="#fff" />
      <path d="M97 42 L110 36 L106 48 Z M97 44 L108 54 L98 54 Z" fill="#D9364A" {...stroke} strokeWidth={2} />
    </g>
  ),
  sweatband: (
    <g>
      <path d="M23 48 Q60 32 97 48 L97 39 Q60 24 23 39 Z" fill="#fff" {...stroke} />
      <path d="M24 44 Q60 28.5 96 44" stroke="#2443C6" strokeWidth="2.6" fill="none" />
    </g>
  ),
  flower: (
    <g>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="30" cy="22" rx="5" ry="8" fill="#fff" stroke={INK} strokeWidth="1.6" transform={`rotate(${angle} 30 30)`} />
      ))}
      <circle cx="30" cy="30" r="4.5" fill="#F0B30A" stroke={INK} strokeWidth="1.6" />
    </g>
  ),
  icepack: (
    <g transform="rotate(-16 64 22)">
      <rect x="44" y="12" width="40" height="20" rx="9" fill="#8FD0F5" {...stroke} />
      <rect x="80" y="17" width="9" height="10" rx="2" fill="#2443C6" {...stroke} strokeWidth={1.8} />
      <path d="M52 19 Q58 16 64 19" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  ),
}

function PigSvg({ pig, title }: { pig: PigConfig; title?: string }) {
  const clip = useId()
  const accessories = pig.accessories
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={title} className="block size-full">
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="120" height="120" fill={pig.background} />
        <circle cx="60" cy="132" r="54" fill="#000" opacity="0.12" />
        {accessories.map((item) => (BEHIND[item] ? <g key={`b-${item}`}>{BEHIND[item]}</g> : null))}
        {backEars(pig.ears, pig)}
        <ellipse cx="60" cy="68" rx="38" ry="35" fill={pig.skin} {...stroke} />
        {pig.spots ? (
          <g fill={pig.snout} opacity="0.75">
            <ellipse cx="38" cy="86" rx="6" ry="4.5" />
            <ellipse cx="84" cy="48" rx="5" ry="7" />
            <ellipse cx="88" cy="84" rx="3.5" ry="3" />
          </g>
        ) : null}
        {frontEars(pig.ears, pig)}
        {pig.cheeks ? (
          <g fill="#E8546B" opacity="0.35">
            <ellipse cx="33" cy="76" rx="6.5" ry="4.5" />
            <ellipse cx="87" cy="76" rx="6.5" ry="4.5" />
          </g>
        ) : null}
        {eye(pig.eyes, 46, 'left')}
        {eye(pig.eyes, 74, 'right')}
        {!accessories.includes('clownNose') ? (
          <g>
            <ellipse cx="60" cy="78" rx="15.5" ry="10.5" fill={pig.snout} {...stroke} />
            <ellipse cx="54.5" cy="78" rx="2.6" ry="4" fill={INK} />
            <ellipse cx="65.5" cy="78" rx="2.6" ry="4" fill={INK} />
          </g>
        ) : null}
        {mouth(pig.mouth)}
        {accessories.map((item) => (FACE[item] ? <g key={`f-${item}`}>{FACE[item]}</g> : null))}
        {accessories.map((item) => (TOP[item] ? <g key={`t-${item}`}>{TOP[item]}</g> : null))}
      </g>
    </svg>
  )
}

const PigSvgMemo = memo(PigSvg)

interface PigAvatarProps {
  avatar: number
  size?: number | string
  className?: string
  title?: string
  online?: boolean
  ring?: boolean
}

export function PigAvatar({ avatar, size = 40, className, title, online, ring }: PigAvatarProps) {
  const pig = PIGS[(Math.max(1, avatar) - 1) % PIGS.length]
  return (
    <span
      className={clsx('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <span className={clsx('block size-full overflow-hidden rounded-full', ring && 'ring-[3px] ring-surface')}>
        <PigSvgMemo pig={pig} title={title} />
      </span>
      {online !== undefined ? (
        <span
          className={clsx(
            'absolute right-[2%] bottom-[2%] block size-[28%] min-h-2.5 min-w-2.5 rounded-full border-2 border-surface',
            online ? 'bg-pine' : 'bg-ink-faint',
          )}
        />
      ) : null}
    </span>
  )
}
