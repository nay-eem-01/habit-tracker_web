import { useQuery } from '@tanstack/react-query'
import { getLevel } from '../api/level'

/** The signed-in user's level; check-ins refresh it (Today invalidates `['level']`). */
export function useLevel() {
  return useQuery({ queryKey: ['level'], queryFn: getLevel, staleTime: 60_000 })
}
