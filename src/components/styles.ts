/** Secondary actions: white, soft edge, pressable. The primary action is `Button`. */
export const SECONDARY =
  'inline-flex h-10 items-center justify-center rounded-xl border border-mist bg-surface px-4 text-sm font-medium ' +
  'transition-[transform,border-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 ' +
  '[@media(hover:hover)]:hover:border-ink-soft'

/** A white surface that lifts just off the chalk page. */
export const SURFACE = 'rounded-2xl bg-surface shadow-[0_1px_2px_rgb(29_36_51/0.06),0_8px_20px_-14px_rgb(29_36_51/0.25)]'
