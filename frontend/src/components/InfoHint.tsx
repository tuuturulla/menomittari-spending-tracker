/** Keeps short explanations available to mouse, keyboard and touch users. */
import { useId, useLayoutEffect, useRef, useState } from 'react'

export function InfoHint({ label, children }: { label: string; children: string }) {
  const id = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [placement, setPlacement] = useState<'above' | 'below'>('below')
  const copyRef = useRef<HTMLSpanElement>(null)
  const visible = (hovered || focused || pinned) && !dismissed

  useLayoutEffect(() => {
    if (!visible || !copyRef.current?.offsetParent) return
    const box = copyRef.current.offsetParent.getBoundingClientRect()
    const requiredSpace = copyRef.current.offsetHeight + 8
    // Near the viewport bottom, reveal the explanation above its containing card.
    setPlacement(window.innerHeight - box.bottom < requiredSpace && box.top >= requiredSpace ? 'above' : 'below')
  }, [visible])
  return (
    <span className="info-hint" onMouseEnter={() => { setHovered(true); setDismissed(false) }}
      onMouseLeave={() => setHovered(false)}>
      <button type="button" className="info-button" aria-label={label} aria-describedby={id}
        aria-expanded={visible} aria-controls={id}
        onFocus={() => { setFocused(true); setDismissed(false) }}
        onBlur={() => { setFocused(false); setPinned(false); setDismissed(false) }}
        onClick={() => { setPinned(!pinned); setDismissed(pinned) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setDismissed(true); setPinned(false) }
        }}><span className="info-symbol" aria-hidden="true">i</span></button>
      <span ref={copyRef} id={id} role="tooltip" className="info-copy" data-placement={placement} hidden={!visible}>{children}</span>
    </span>
  )
}
