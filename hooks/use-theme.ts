'use client'

import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const mounted = resolvedTheme !== undefined

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { 
    theme: (resolvedTheme || 'dark') as 'light' | 'dark', 
    toggleTheme, 
    mounted 
  }
}
