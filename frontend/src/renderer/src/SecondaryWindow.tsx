import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  { id: 1, label: 'TEST1' },
  { id: 2, label: 'TEST2' }
]

export default function SecondaryWindow(): React.JSX.Element {
  const [current, setCurrent] = useState(0)

  const prev = (): void => setCurrent((i) => (i - 1 + slides.length) % slides.length)
  const next = (): void => setCurrent((i) => (i + 1) % slides.length)

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)] select-none">
      <div className="h-8 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="flex flex-col flex-1 items-center justify-center">
      <div className="flex items-center gap-8">
        <button
          onClick={prev}
          className="p-3 rounded-full hover:bg-[var(--color-border)] transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8 text-[var(--color-foreground)]" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl font-bold tracking-tight text-[var(--color-foreground)]">
            {slides[current].label}
          </span>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === current
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-[var(--color-border)]'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={next}
          className="p-3 rounded-full hover:bg-[var(--color-border)] transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8 text-[var(--color-foreground)]" />
        </button>
      </div>

      <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
        {current + 1} / {slides.length}
      </p>
      </div>
    </div>
  )
}
