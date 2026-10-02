import { useId, useState, type InputHTMLAttributes } from 'react'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
}

const INPUT =
  'h-11 w-full rounded-md border bg-white px-3 text-base text-ink placeholder:text-ink-soft/70 ' +
  'focus-visible:border-lapis focus-visible:outline-2 focus-visible:outline-lapis/30 focus-visible:outline-offset-0'

export function Field({ label, hint, error, type, className = '', ...input }: FieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT} ${error ? 'border-alert' : 'border-mist'} ${isPassword ? 'pr-16' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 rounded-r-md px-3 text-sm font-medium text-lapis hover:text-lapis-deep"
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
