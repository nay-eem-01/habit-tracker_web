import type { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-11 rounded-md bg-lapis px-5 font-medium text-white hover:bg-lapis-deep disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  )
}
