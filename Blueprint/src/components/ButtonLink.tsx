import type { ComponentProps } from 'react'
import { Link } from 'react-router'

export default function ButtonLink({ className = '', ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`inline-flex min-h-13 items-center justify-center rounded-lg bg-brand px-8 text-[17px] font-semibold text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
      {...props}
    />
  )
}
