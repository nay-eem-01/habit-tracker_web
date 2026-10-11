/** "11 Oct 2026", in the viewer's own time. */
export function joined(instant: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(instant))
}
