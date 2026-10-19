import { DotsThree } from '@phosphor-icons/react'
import type { ReactElement, ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export interface RowMenuItem {
  label: string
  icon?: ReactNode
  /** A link item renders as the element given (a router Link); otherwise it runs `onSelect`. */
  render?: ReactElement
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
}

/** A row's housekeeping (edit, archive) folded behind one quiet "…" button, so the row leads with what it is. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-soft transition-[background-color,color] duration-150 hover:bg-wash hover:text-ink data-[popup-open]:bg-wash data-[popup-open]:text-ink"
      >
        <DotsThree size={24} weight="bold" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 rounded-xl border border-mist p-1.5 shadow-[0_16px_36px_-14px_rgb(15_42_51/0.3)] ring-0">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            render={item.render}
            disabled={item.disabled}
            onClick={item.onSelect}
            variant={item.destructive ? 'destructive' : 'default'}
            className="min-h-11 gap-2.5 rounded-lg px-3 text-[0.9375rem] font-medium focus:bg-wash"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
