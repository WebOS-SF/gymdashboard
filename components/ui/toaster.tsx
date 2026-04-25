'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group flex w-[360px] items-start gap-3 rounded-2xl border border-white/8 bg-[#121923] px-4 py-3 text-white shadow-2xl shadow-black/40',
          title: 'text-sm font-semibold text-white',
          description: 'text-sm text-slate-300',
          actionButton:
            'inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground',
          cancelButton:
            'inline-flex h-8 items-center rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground',
          closeButton:
            'mt-0.5 rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white',
          success:
            'border-emerald-400/20 bg-[#121923] [&_[data-icon]]:text-emerald-400',
          error:
            'border-rose-400/20 bg-[#121923] [&_[data-icon]]:text-rose-400',
        },
      }}
    />
  )
}
