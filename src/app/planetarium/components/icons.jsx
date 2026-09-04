'use client';

// Minimal line icons, drawn in currentColor so they inherit the palette.
// These replace the emoji that previously stood in for UI iconography.

function Svg({ children, className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MissionIcon({ className }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.25" />
    </Svg>
  );
}

export function LaunchIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M5 19c1.2-2.6 3.2-3 4.4-1.8C10.6 18.4 10.2 20.4 7.6 21.6 6.4 22 5.2 21.8 4.6 21.2 4 20.6 4.4 19.6 5 19Z" />
      <path d="M10.4 16.4 7.6 13.6c0-4.4 2.6-8.4 7.2-10.6 1.6-.8 3.4-.8 4.6.4 1.2 1.2 1.2 3 .4 4.6-2.2 4.6-6.2 7.2-10.6 7.2Z" />
      <circle cx="14.8" cy="9.2" r="1.75" />
    </Svg>
  );
}

export function CameraIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.7l1.2-2h6.2l1.2 2h3.7A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="13" r="3.25" />
    </Svg>
  );
}

export function LevelsIcon({ className }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="2.75" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4.25" transform="rotate(-22 12 12)" />
    </Svg>
  );
}

export function CheckIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function CloseIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="M6 18 18 6M6 6l12 12" />
    </Svg>
  );
}

export function ChevronDownIcon({ className }) {
  return (
    <Svg className={className}>
      <path d="m19 9-7 7-7-7" />
    </Svg>
  );
}
