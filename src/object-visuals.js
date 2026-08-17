export const OBJECT_SVGS = Object.freeze({
  chair: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <path class="object-fill chair-back" d="M9 6c0-2 1.5-3 3.5-3h7C21.5 3 23 4 23 6v10H9V6Z" />
        <path d="M12 7v7M16 7v7M20 7v7" />
        <path class="object-accent" d="M7 16h18v6H7z" />
        <path d="M9 22v7M23 22v7M7 19h18" />
      </g>
    </svg>`,
  bed: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="object-fill" x="2.5" y="5" width="27" height="22" rx="1" />
        <rect class="object-accent" x="5.5" y="8" width="8.5" height="16" rx="1.5" />
        <path d="M16 7v18M19 10h7M19 16h7M19 22h7M3.5 25h25" />
      </g>
    </svg>`,
  carpet: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="carpet-field" x="2" y="3" width="28" height="26" rx="1.5" />
        <rect class="carpet-border" x="4.5" y="5.5" width="23" height="21" rx="1" />
        <path class="carpet-motif" d="M16 8 25 16 16 24 7 16 16 8ZM16 11.5 21.5 16 16 20.5 10.5 16 16 11.5Z" />
      </g>
    </svg>`,
  puddle: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <path class="object-fill" d="M4 18c0-3 3-5 7-5 2-1 3-5 7-4 3 1 3 4 6 5 3 1 5 3 4 6-1 4-7 5-12 5S4 23 4 18Z" />
        <path d="M10 17c3-2 7-3 11-1M13 21c3 1 6 0 9-2" />
        <circle class="object-accent" cx="9" cy="20" r="1.2" />
      </g>
    </svg>`,
  table: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="object-fill table-top" x="3" y="6" width="26" height="20" rx="2" />
        <rect x="5.5" y="8.5" width="21" height="15" rx="1" />
        <circle class="object-accent" cx="8" cy="11" r="1.5" />
        <circle class="object-accent" cx="24" cy="11" r="1.5" />
        <circle class="object-accent" cx="8" cy="21" r="1.5" />
        <circle class="object-accent" cx="24" cy="21" r="1.5" />
      </g>
    </svg>`,
  shelf: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="object-fill" x="3" y="7" width="26" height="18" rx="1" />
        <path d="M4.5 10h23M4.5 22h23" />
        <path class="object-accent shelf-books" d="M7 11v10M10 12v9M13 11v10M17 11v10M20 13v8M23 11v10M26 12v9" />
      </g>
    </svg>`,
  plant: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <path class="object-accent" d="M10 21h12l-2 7h-8l-2-7Z" />
        <path d="M16 22V8" />
        <path class="object-fill" d="M16 14c-5 0-8-3-8-7 5 0 8 2 8 7ZM16 18c5 0 8-3 8-7-5 0-8 2-8 7ZM16 11c0-5 2-8 6-9 1 5-1 8-6 9Z" />
      </g>
    </svg>`,
  counter: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="object-fill" x="3" y="6" width="26" height="20" rx="1" />
        <path d="M4.5 9.5h23M4.5 23h23M7 13h8v7H7z" />
        <rect class="object-accent counter-basin" x="19" y="13" width="7" height="7" rx="1" />
        <path d="M21 13v-3h4v3" />
      </g>
    </svg>`,
  tv: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <rect class="object-fill" x="3" y="7" width="26" height="16" rx="2" />
        <rect class="object-accent" x="6" y="10" width="20" height="10" rx="1" />
        <path d="M11 27h10M16 23v4M10 4l6 3 6-3" />
      </g>
    </svg>`,
  statue: `
    <svg viewBox="0 0 32 32" preserveAspectRatio="none" aria-hidden="true">
      <g class="object-drawing">
        <circle class="object-fill" cx="16" cy="7" r="4" />
        <path class="object-fill" d="M10 20c0-6 2-9 6-9s6 3 6 9H10Z" />
        <path d="M13 12v5M19 12v5M8 20h16l-2 4H10l-2-4Z" />
        <path class="object-accent" d="M11 24h10v4H11z" />
      </g>
    </svg>`,
});

export function getObjectSvg(type, fallback = '') {
  return OBJECT_SVGS[type] ?? fallback;
}
