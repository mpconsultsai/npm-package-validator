export function AppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      className={`block ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#2563eb" />
      <path
        fill="#fff"
        d="M16 6.4 7.6 10.6v10.8L16 25.6l8.4-4.2V10.6L16 6.4Z"
      />
      <path
        fill="#bfdbfe"
        d="M16 15.8 7.6 10.6 16 6.4l8.4 4.2L16 15.8Z"
      />
      <path
        fill="#dbeafe"
        d="M16 15.8v9.8l8.4-4.2V10.6L16 15.8Z"
      />
      <circle cx="22.2" cy="22.4" r="6.4" fill="#1e40af" />
      <circle
        cx="21.5"
        cy="21.7"
        r="3.15"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M23.7 23.9 27.1 27.3"
      />
    </svg>
  );
}
