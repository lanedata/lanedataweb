'use client'

import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

interface Props {
  html: string
}

export function TableOfContents({ html }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    // Parse headings from the article HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const nodes = doc.querySelectorAll('h2, h3')
    const items: Heading[] = []

    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? ''
      if (!text) return
      const id = node.id || text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      items.push({ id, text, level: parseInt(node.tagName[1]) })
    })

    setHeadings(items)
  }, [html])

  useEffect(() => {
    if (!headings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-10% 0% -80% 0%' }
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  return (
    <nav aria-label="Tabla de contenidos" className="sticky top-20 hidden xl:block">
      <p className="label-mono mb-3 text-ink/40">Contenidos</p>
      <ul className="space-y-1.5 border-l border-ink/[0.1]">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`block py-0.5 pl-4 text-sm transition-colors ${
                level === 3 ? 'pl-7' : ''
              } ${
                active === id
                  ? 'border-l-2 -ml-px border-mint font-medium text-ink'
                  : 'text-ink/45 hover:text-ink/70'
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
