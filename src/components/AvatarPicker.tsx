import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PigAvatar } from '@/components/PigAvatar'
import { PIG_COUNT } from '@/components/pigs'

export function AvatarPicker({ value, onChange }: { value: number; onChange: (avatar: number) => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('profile.avatar')} className="grid grid-cols-5 gap-2.5 sm:grid-cols-8 md:grid-cols-10">
      {Array.from({ length: PIG_COUNT }, (_, index) => index + 1).map((avatar) => {
        const selected = avatar === value
        return (
          <button
            key={avatar}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t('profile.pigNumber', { number: avatar })}
            onClick={() => onChange(avatar)}
            className="relative grid aspect-square place-items-center rounded-full transition-transform duration-200 hover:-rotate-6 hover:scale-110"
          >
            {selected ? (
              <motion.span
                layoutId="avatar-ring"
                className="absolute -inset-1 rounded-full border-[3px] border-cobalt"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            ) : null}
            <PigAvatar avatar={avatar} size="100%" />
          </button>
        )
      })}
    </div>
  )
}
