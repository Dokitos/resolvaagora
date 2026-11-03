'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Content stays visible without JS; only off-screen elements receive an entrance. */
export function Reveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || !('IntersectionObserver' in window)) return
    const elements = root.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? []
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08 })
    elements.forEach(el => {
      if (el.getBoundingClientRect().top >= window.innerHeight) el.classList.add('reveal-pending')
      observer.observe(el)
    })
    const finish = () => {
      if (preference.matches) elements.forEach(el => el.classList.remove('reveal-pending'))
    }
    preference.addEventListener('change', finish)
    return () => { observer.disconnect(); preference.removeEventListener('change', finish) }
  }, [])
  return <div ref={root}>{children}</div>
}
