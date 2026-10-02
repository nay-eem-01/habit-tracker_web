import { useId, useState, type InputHTMLAttributes } from 'react'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  /** Short values (a count, a time) get a short input; the hint under it keeps the full width. */
  narrow?: boolean
}

const INPUT =
  'h-12 w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-ink-soft/70 ' +
  'shadow-[0_1px_2px_rgb(29_36_51/0.05)] transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:border-lapis focus-visible:shadow-[0_0_0_4px_rgb(47_75_216/0.16)] focus-visible:outline-none'

export function Field({ label, hint, error, narrow, type, className = '', ...input }: FieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className={`relative ${narrow ? 'w-40' : ''}`}>
        <input
          {...input}
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT} ${error ? 'border-alert' : 'border-mist'} ${isPassword ? 'pr-20' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 rounded-r-xl px-4 text-sm font-medium text-lapis transition-colors duration-150 hover:text-lapis-deep"
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
