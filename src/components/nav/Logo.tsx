interface LogoProps {
  className?: string;
}

// The app mark: a "Z" whose diagonal is a gentle stopwatch-sweep curve, set
// against a partial progress ring with a glowing comet dot at its tip - the
// same visual language as the live timer, distilled into a monogram.
export const Logo = ({ className = '' }: LogoProps) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    <rect x="0" y="0" width="100" height="100" rx="22" fill="#1F3A2E" />
    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.14)" strokeWidth="4.5" fill="none" />
    <path
      d="M50 10 A40 40 0 1 1 11.96 62.36"
      stroke="#A9D977"
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M28 32 H72" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
    <path d="M28 68 H72" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
    <path
      d="M70 36 Q55.7 41.8 30 64"
      stroke="#FFFFFF"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="70" cy="36" r="6" fill="#A9D977" opacity="0.55" />
    <circle cx="70" cy="36" r="3.6" fill="#FFFFFF" />
  </svg>
);
