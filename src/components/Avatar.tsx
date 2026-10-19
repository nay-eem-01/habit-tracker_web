import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getAvatar } from '../api/account'
import type { AuthUser } from '../api/client'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

const SIZES = {
  md: 'size-10 text-sm',
  lg: 'size-20 text-2xl',
}

/**
 * The person's profile picture, or their initials on teal when there is none (or it won't load).
 * The picture is fetched with the token and kept per `avatarUpdatedAt`, so a new one is fetched once.
 */
export function Avatar({ user, size = 'md' }: { user: Pick<AuthUser, 'id' | 'name' | 'avatarUpdatedAt'>; size?: keyof typeof SIZES }) {
  const picture = useQuery({
    queryKey: ['avatar', user.id, user.avatarUpdatedAt],
    queryFn: getAvatar,
    enabled: Boolean(user.avatarUpdatedAt),
    staleTime: Infinity,
  })
  const blob = user.avatarUpdatedAt ? picture.data : undefined
  const image = useRef<HTMLImageElement>(null)
  // the address only lives as long as the picture shows it
  useEffect(() => {
    if (!blob || !image.current) return
    const url = URL.createObjectURL(blob)
    image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-lapis font-semibold text-chalk ${SIZES[size]}`}>
      {blob ? <img ref={image} alt="" className="size-full object-cover" /> : initials(user.name)}
    </span>
  )
}
