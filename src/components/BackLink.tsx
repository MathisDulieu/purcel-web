import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="group mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
      {label}
    </Link>
  )
}
