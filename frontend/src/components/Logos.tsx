/** Inline SVG brand marks shown next to page titles and nav tabs. */

/**
 * Google ADS mark — two crossed rounded bars (yellow + blue) forming a peak
 * with a yellow pivot dot. NOT the generic multicolour Google "G".
 */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect
        x="6.4"
        y="1.9"
        width="5.2"
        height="15.7"
        rx="2.6"
        fill="#FBBC04"
        transform="rotate(22.5 9 9.75)"
      />
      <rect
        x="12.4"
        y="1.9"
        width="5.2"
        height="15.7"
        rx="2.6"
        fill="#4285F4"
        transform="rotate(-22.5 15 9.75)"
      />
      <circle cx="7" cy="17.3" r="2.9" fill="#FBBC04" />
    </svg>
  );
}

export function MetaLogo({ size = 20, color = "#1B3A6B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill={color}
        d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
      />
    </svg>
  );
}

export function YandexLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
      <path
        fill="#fff"
        d="M13.32 17.83h2.04V6.17h-2.97c-2.99 0-4.56 1.54-4.56 3.8 0 1.81.86 2.88 2.4 3.98l-2.67 3.88h2.21l2.97-4.44-1.03-.69c-1.25-.84-1.86-1.5-1.86-2.92 0-1.25.88-2.09 2.55-2.09h.92v10.14z"
      />
    </svg>
  );
}

export function Ga4Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#F9AB00"
        d="M22.84 2.998v17.999a2.983 2.983 0 0 1-2.967 2.998 2.98 2.98 0 0 1-.368-.02 3.06 3.06 0 0 1-2.61-3.1V3.12A3.06 3.06 0 0 1 19.51.02a2.983 2.983 0 0 1 3.329 2.978z"
      />
      <path
        fill="#E37400"
        d="M4.133 18.055a2.973 2.973 0 1 0 0 5.945 2.973 2.973 0 0 0 0-5.945zm7.872-9.01h-.05a3.06 3.06 0 0 0-2.892 3.126v7.985c0 2.167.954 3.482 2.35 3.763a2.978 2.978 0 0 0 3.57-2.927v-8.959a2.983 2.983 0 0 0-2.978-2.988z"
      />
    </svg>
  );
}

/**
 * Microsoft Clarity mark — the faceted blue pyramid (light top-left face,
 * medium right face, dark front-bottom facet).
 */
export function ClarityLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="clLeft" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#7FB8F6" />
          <stop offset="100%" stopColor="#3F8DEA" />
        </linearGradient>
        <linearGradient id="clRight" x1="0.3" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A86E8" />
          <stop offset="100%" stopColor="#1C5DC6" />
        </linearGradient>
        <linearGradient id="clBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A55BC" />
          <stop offset="100%" stopColor="#123F95" />
        </linearGradient>
        <clipPath id="clTri">
          <path d="M11.1 3.1 Q12 2 12.9 3.1 L21.2 20 Q21.7 21 20.5 21 L3.5 21 Q2.3 21 2.8 20 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#clTri)">
        <polygon points="12,2.5 12,21 2,21" fill="url(#clLeft)" />
        <polygon points="12,2.5 22,21 12,21" fill="url(#clRight)" />
        <polygon points="2,21 22,21 12,13.5" fill="url(#clBottom)" />
      </g>
    </svg>
  );
}

/**
 * Microsoft Advertising mark — the four-square Microsoft logo
 * (red / green / blue / yellow quadrants).
 */
export function MicrosoftLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/** Neutral dashboard glyph for the Overview tab. */
export function OverviewLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="#6e80ff" />
      <rect x="13" y="3" width="8" height="5" rx="2" fill="#5e6373" />
      <rect x="13" y="10" width="8" height="11" rx="2" fill="#8fa0ff" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="#5e6373" />
    </svg>
  );
}
