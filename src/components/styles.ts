/** Secondary actions: white, soft edge, pressable. The primary action is `Button`. */
export const SECONDARY =
  'inline-flex h-10 items-center justify-center rounded-xl border border-mist bg-surface px-4 text-sm font-medium ' +
  'transition-[transform,border-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 ' +
  '[@media(hover:hover)]:hover:border-ink-soft'

/** A white surface that lifts just off the chalk page. */
export const SURFACE = 'rounded-2xl bg-surface shadow-[0_1px_2px_rgb(9_38_52/0.06),0_8px_20px_-14px_rgb(9_38_52/0.25)]'

/** The primary action: orange with navy text (white on orange is too faint to read). Size is added by the caller. */
export const PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-ember font-semibold text-navy ' +
  'shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_8px_20px_-8px_rgb(255_110_66/0.65)] ' +
  'transition-[transform,filter] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:brightness-110'
