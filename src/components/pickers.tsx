import { CalendarBlank, Clock, GlobeHemisphereEast, X } from '@phosphor-icons/react'
import { cn } from 'cn'
import { useId, useState, type ReactNode } from 'react'
import { Calendar } from '@/components/ui/calendar'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { INPUT } from './Field'

/** A button that reads like the app's text inputs: the closed state of every picker here. */
const FIELD_BUTTON = cn(
  INPUT,
  'flex h-12 w-full items-center gap-3 border-mist text-left font-normal [@media(hover:hover)]:hover:border-ink-soft data-popup-open:border-lapis',
)

/** Label, control, then the hint or the error under it, the same rhythm as `Field`. */
function Labelled({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label id={`${id}-label`} htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>
      )}
    </div>
  )
}

function parseDay(day: string): Date | undefined {
  return day ? new Date(`${day}T00:00:00`) : undefined
}

function toDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "Thu 31 Dec 2026". */
function formatLongDay(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .format(parseDay(day))
    .replace(',', '')
}

const QUICK: { short: string; label: string; months: number }[] = [
  { short: '+1 mo', label: 'In 1 month', months: 1 },
  { short: '+3 mo', label: 'In 3 months', months: 3 },
  { short: '+6 mo', label: 'In 6 months', months: 6 },
  { short: '+1 yr', label: 'In 1 year', months: 12 },
]

/** A day (YYYY-MM-DD, or '' for none) from a calendar, with quick picks for a deadline. */
export function DateField({ label, value, onChange, hint, error, placeholder = 'Pick a day' }: {
  label: string
  value: string
  onChange: (day: string) => void
  hint?: string
  error?: string
  placeholder?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const selected = parseDay(value)
  const pick = (day: string) => {
    onChange(day)
    setOpen(false)
  }

  return (
    <Labelled id={id} label={label} hint={hint} error={error}>
      <div className="flex max-w-sm items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger id={id} className={FIELD_BUTTON} aria-invalid={error ? true : undefined}>
            <CalendarBlank size={20} weight="duotone" className="shrink-0 text-ember-deep" aria-hidden="true" />
            <span className={value ? '' : 'text-ink-soft/80'}>{value ? formatLongDay(value) : placeholder}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto rounded-2xl p-3">
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Quick picks">
              {QUICK.map(({ short, label: text, months }) => {
                return (
                  <button
                    key={text}
                    type="button"
                    aria-label={text}
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + months)
                      pick(toDay(date))
                    }}
                    className="rounded-full bg-mist/45 py-1.5 text-sm font-medium transition-[background-color,transform] duration-150 ease-out active:scale-95 [@media(hover:hover)]:hover:bg-ember/20"
                  >
                    {short}
                  </button>
                )
              })}
            </div>
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) => date && pick(toDay(date))}
              weekStartsOn={1}
              className="p-0 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(10)]"
              classNames={{ caption_label: 'font-display text-base font-semibold select-none' }}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <button
            type="button"
            aria-label="Clear the date"
            onClick={() => onChange('')}
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-[background-color,color] duration-150 hover:bg-mist/50 hover:text-ink"
          >
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    </Labelled>
  )
}

export interface Option {
  value: string
  label: string
}

/** One choice from a short list, in the app's field look. */
export function SelectField({ label, value, onChange, options, hint, error, placeholder, icon, className }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  hint?: string
  error?: string
  placeholder?: string
  icon?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <Labelled id={id} label={label} hint={hint} error={error}>
      <Select items={options} value={value} onValueChange={(next) => onChange(String(next ?? ''))}>
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-invalid={error ? true : undefined}
          // the trigger sets its height per size; ours has to win there too
          className={cn(FIELD_BUTTON, 'pr-3 data-[size=default]:h-12', className)}
        >
          {icon}
          <SelectValue placeholder={placeholder} className="truncate" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="py-2 text-base">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Labelled>
  )
}

/** Every quarter hour of the day, plus the saved time if it falls between them. */
function times(current: string): Option[] {
  const all = Array.from({ length: 96 }, (_, i) => {
    const value = `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
    return { value, label: value }
  })
  if (current && !all.some((option) => option.value === current)) all.push({ value: current, label: current })
  return all.sort((a, b) => a.value.localeCompare(b.value))
}

/** A time of day (HH:mm) in quarter hours. */
export function TimeField({ label, value, onChange, hint, error, className }: {
  label: string
  value: string
  onChange: (time: string) => void
  hint?: string
  error?: string
  className?: string
}) {
  return (
    <SelectField
      label={label}
      value={value}
      onChange={onChange}
      options={times(value)}
      hint={hint}
      error={error}
      icon={<Clock size={20} weight="duotone" className="shrink-0 text-ember-deep" aria-hidden="true" />}
      className={cn('max-w-40', className)}
    />
  )
}

/** One of the browser's region names, searchable: there are about four hundred. */
export function TimezoneField({ label, value, onChange, zones, hint }: {
  label: string
  value: string
  onChange: (zone: string) => void
  zones: string[]
  hint?: string
}) {
  const id = useId()
  const words = (zone: string) => zone.replaceAll('_', ' ')
  return (
    <Labelled id={id} label={label} hint={hint}>
      <Combobox items={zones} value={value} onValueChange={(zone) => zone && onChange(zone)} itemToStringLabel={words}>
        <ComboboxTrigger id={id} aria-labelledby={`${id}-label`} className={cn(FIELD_BUTTON, 'pr-3')}>
          <GlobeHemisphereEast size={20} weight="duotone" className="shrink-0 text-ember-deep" aria-hidden="true" />
          <span className="flex-1 truncate">{words(value)}</span>
        </ComboboxTrigger>
        <ComboboxContent className="rounded-xl">
          <ComboboxInput showTrigger={false} placeholder="Search a city or region" aria-label="Search timezones" />
          <ComboboxEmpty>No timezone matches.</ComboboxEmpty>
          <ComboboxList>
            {(zone: string) => (
              <ComboboxItem key={zone} value={zone} className="py-2 text-base">
                {words(zone)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Labelled>
  )
}

/** An on/off setting with its explanation; the whole row toggles it. */
export function SwitchField({ label, description, checked, onChange, disabled }: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    // a wrapping label: the switch is a span, which htmlFor can't point at
    <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
      <span>
        <span id={`${id}-label`} className="font-medium">
          {label}
        </span>
        {description && (
          <span id={`${id}-description`} className="block text-ink-soft">
            {description}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next)}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        className="mt-0.5"
      />
    </label>
  )
}

/** A small count with − and + on either side; it can still be typed. Kept as text so it can be cleared while typing. */
export function Stepper({ label, value, onChange, min, max, hint, error }: {
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  hint?: string
  error?: string
}) {
  const id = useId()
  const count = Number(value) || min
  const step = (by: number) => onChange(String(Math.min(max, Math.max(min, count + by))))
  const STEP = 'grid size-12 shrink-0 place-items-center text-xl font-medium text-ink-soft transition-[color,background-color] duration-150 enabled:hover:bg-mist/40 enabled:hover:text-ink disabled:opacity-35'
  return (
    <Labelled id={id} label={label} hint={hint} error={error}>
      <div className="inline-flex h-12 items-stretch overflow-hidden rounded-xl border border-mist bg-surface shadow-[0_1px_2px_rgb(9_38_52/0.05)] focus-within:border-lapis">
        <button type="button" tabIndex={-1} aria-label={`Fewer: ${label}`} disabled={count <= min} onClick={() => step(-1)} className={STEP}>
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="w-14 [appearance:textfield] bg-transparent text-center font-display text-xl font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" tabIndex={-1} aria-label={`More: ${label}`} disabled={count >= max} onClick={() => step(1)} className={STEP}>
          +
        </button>
      </div>
    </Labelled>
  )
}
