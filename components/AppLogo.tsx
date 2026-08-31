export function AppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="npv-logo"
          x1="4"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#npv-logo)" />
      <path fill="#fff" d="M16 6.4 7.6 10.6v10.8L16 25.6l8.4-4.2V10.6L16 6.4Z" />
      <path fill="#C7D2FE" d="M16 15.8 7.6 10.6 16 6.4l8.4 4.2L16 15.8Z" />
      <path fill="#EEF2FF" d="M16 15.8v9.8l8.4-4.2V10.6L16 15.8Z" />
      <circle cx="22.2" cy="22.4" r="6.4" fill="#2563EB" />
      <circle
        cx="22.2"
        cy="22.4"
        r="6.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.3 22.5 21.3 24.4 25.2 20.3"
      />
    </svg>
  );
}
