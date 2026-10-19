/** Secondary actions: white, hairline edge, pressable. The primary action is `Button`. */
export const SECONDARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-mist bg-surface px-4 text-[0.9375rem] font-medium ' +
  'transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 ' +
  '[@media(hover:hover)]:hover:border-line [@media(hover:hover)]:hover:bg-wash'

/** A white surface on the white page: a hairline does the work a shadow used to. */
export const SURFACE = 'rounded-2xl border border-mist bg-surface'

/** The primary action: coral with navy text (white on coral is too faint to read). Size is added by the caller. */
export const PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-ember font-semibold text-navy ' +
  'shadow-[inset_0_-1px_0_rgb(15_42_51/0.12)] ' +
  'transition-[transform,filter] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:brightness-105'

/** Every signed-in page's column: one measure for reading pages, the wide one where charts earn it. */
export const PAGE = 'mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10'
export const PAGE_WIDE = 'mx-auto w-full max-w-5xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10'

/** The type scale: page title, section heading, and the quiet line under a title. */
export const PAGE_TITLE = 'font-display text-[2rem] leading-[1.1] font-semibold tracking-tight sm:text-[2.5rem]'
export const SECTION_TITLE = 'font-display text-xl font-semibold tracking-tight'
export const LEAD = 'mt-1.5 text-ink-soft'

/** A text action inside a row or a sentence: teal, underlined, with a finger-sized hit area. */
export const TEXT_BUTTON =
  'inline-flex min-h-9 items-center text-[0.9375rem] font-medium text-link underline decoration-link/40 underline-offset-[3px] ' +
  'transition-colors hover:decoration-link disabled:opacity-60'

/** Segmented tabs (Active / Archived): a wash track, the chosen one lifted onto white. */
export const TABS = 'inline-flex gap-1 rounded-full bg-wash p-1 ring-1 ring-mist ring-inset'
export const tab = (selected: boolean) =>
  `min-h-10 rounded-full px-4 text-[0.9375rem] font-medium transition-[background-color,color,box-shadow] duration-200 ease-out ${
    selected ? 'bg-pill text-ink shadow-[0_1px_2px_rgb(15_42_51/0.12)] ring-1 ring-mist' : 'text-ink-soft hover:text-ink'
  }`
