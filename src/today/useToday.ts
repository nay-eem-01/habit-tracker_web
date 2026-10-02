import { useEffect, useState } from 'react'
import { todayIn } from './today'

/** The user's calendar day, kept current: a page left open past midnight moves on to the new day. */
export function useToday(timezone: string): string {
  const [today, setToday] = useState(() => todayIn(timezone))
  useEffect(() => {
    const id = setInterval(() => setToday(todayIn(timezone)), 30_000)
    return () => clearInterval(id)
  }, [timezone])
  return today
}
