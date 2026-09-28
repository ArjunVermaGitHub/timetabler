import React from 'react';

export default function IconProvider({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  /** Softer outline for `star` (e.g. warm brown on dashboard); defaults to near-black. */
  strokeColor,
}) {
  const starStroke = strokeColor ?? 'rgba(0, 0, 0, 0.95)';
  // Unique per-instance id so multiple gradient icons don't collide in the DOM.
  const uid = React.useId();
  const trophyGradientId = `trophy-grad-${uid}`;
  const brainGradientId = `brain-grad-${uid}`;
  const eyeGradientId = `eye-grad-${uid}`;
  const chatGradientId = `chat-grad-${uid}`;
  const lockGradientId = `lock-grad-${uid}`;
  const icons = {
    back: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} stroke={starStroke} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
        {/* Triangle with rounded corners - using quadratic curves for rounded corners */}
        <path d="M2.5 21 Q2 21 2 20.5 L2 20.3 Q2 20 2.3 20 L10.8 3.8 Q11 3.5 11.5 3.2 Q12 2.8 12.5 3.2 Q13 3.5 13.2 3.8 L21.7 20 Q22 20 22 20.3 L22 20.5 Q22 21 21.5 21 Z" fill={color} stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1"/>
        {/* Exclamation mark - top rectangle */}
        <path d="M11 9h2v5h-2v-4z" fill="rgba(0, 0, 0, 0.95)"/>
        {/* Exclamation mark - bottom rectangle */}
        <path d="M11 16h2v2h-2v-2z" fill="rgba(0, 0, 0, 0.95)"/>
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    copy: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    ),
    play: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M8 5v14l11-7z"/>
      </svg>
    ),
    trophy: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={trophyGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCE38A" />
            <stop offset="48%" stopColor="#F6C722" />
            <stop offset="100%" stopColor="#C8941A" />
          </linearGradient>
        </defs>
        <path
          d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
          fill={`url(#${trophyGradientId})`}
          stroke="#3a2a05"
          strokeWidth="0.9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
    // Web 2.0 gradient glyphs (used in the lesson "you'll learn to" rail)
    brain: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={brainGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBCFE8" />
            <stop offset="55%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>
        </defs>
        <path
          d="M11 4.5A2.5 2.5 0 0 0 8.5 2 3.5 3.5 0 0 0 5 5.5c0 .2.02.39.05.58A3.5 3.5 0 0 0 3 9.25c0 .9.34 1.72.9 2.34A3 3 0 0 0 3 13.9 3 3 0 0 0 6 17h.05A3 3 0 0 0 9 19.5 1.5 1.5 0 0 0 10.5 21 .5.5 0 0 0 11 20.5zM13 4.5A2.5 2.5 0 0 1 15.5 2 3.5 3.5 0 0 1 19 5.5c0 .2-.02.39-.05.58A3.5 3.5 0 0 1 21 9.25c0 .9-.34 1.72-.9 2.34A3 3 0 0 1 21 13.9 3 3 0 0 1 18 17h-.05A3 3 0 0 1 15 19.5 1.5 1.5 0 0 1 13.5 21 .5.5 0 0 1 13 20.5z"
          fill={`url(#${brainGradientId})`}
        />
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={eyeGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <path
          d="M12 5C6.48 5 2.73 8.61 1 12c1.73 3.39 5.48 7 11 7s9.27-3.61 11-7c-1.73-3.39-5.48-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
          fill={`url(#${eyeGradientId})`}
        />
      </svg>
    ),
    eyeOff: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
    chatGradient: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={chatGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A5B4FC" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <path
          d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
          fill={`url(#${chatGradientId})`}
        />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={lockGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <path
          d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
          fill={`url(#${lockGradientId})`}
        />
      </svg>
    ),
    delete: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    ),
    expand: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
    collapse: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    ),
    reminder: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
      </svg>
    ),
    map: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M20.5 3l-5.5 2-6-2-6 2v16l6-2 6 2 5.5-2V3zm-11 2.84l4 1.33v12.99l-4-1.33V5.84zM5 6.04l3-1v13.02l-3 1V6.04zm14 11.92l-3 1V5.94l3-1v13.02z"/>
      </svg>
    ),
    chevronLeft: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    ),
    chevronRight: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    ),
    report: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
    ),
    edit: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    ),
    learning: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    ),
    fieldReports: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
    ),
    /**
     * Streak, solid flame with a lighter inner core.
     * Silhouette from Material Symbols `local_fire_department` (Apache-2.0).
     * Both paths use `color`, so the icon inherits whatever the badge sets and
     * stays legible in light and dark without hardcoded warm tones.
     */
    fire: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          fill={color}
          d="M16 6l-.44.55C14.38 8.02 12 7.19 12 5.3V2S4 6 4 13c0 2.92 1.56 5.47 3.89 6.86-.56-.79-.89-1.76-.89-2.81 0-1.32.52-2.56 1.47-3.5L12 10.1l3.53 3.45c.95.94 1.47 2.18 1.47 3.5 0 1.05-.33 2.02-.89 2.81C18.44 18.47 20 15.92 20 13c0-3.16-1.53-6.06-4-7z"
        />
        <path
          fill={color}
          fillOpacity="0.38"
          d="M12 12.9l-2.03 2.71c-.31.41-.47.92-.47 1.43 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5c0-.51-.16-1.02-.47-1.43L12 12.9z"
        />
      </svg>
    ),
    sets: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
    ),
    gamePath: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        {/* Curved dashed path connecting the pointed ends of the pins - horizontal wavy S-curve */}
        <path d="M5 19 C8 19, 8 11, 12 11 C16 11, 16 8, 19 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" strokeDasharray="2.5,2.5"/>
        {/* Bottom-left circle - same size as top-right */}
        <circle cx="5" cy="19" r="3" fill={color}/>
        <circle cx="5" cy="19" r="1.8" fill="white"/>
        {/* Top-right circle - same size as bottom-left */}
        <circle cx="19" cy="8" r="3" fill={color}/>
        <circle cx="19" cy="8" r="1.8" fill="white"/>
      </svg>
    ),
    wingmanLocator: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
      </svg>
    ),
    /** Community / wingmen, three figures (reads as “people nearby”) */
    community: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          fill={color}
          d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
        />
      </svg>
    ),
    /** People seated around a round table, community discussion / verdict */
    roundTable: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="12" cy="15.35" rx="8.1" ry="2.95" fill={color} opacity="0.28" />
        <ellipse
          cx="12"
          cy="14.85"
          rx="6.85"
          ry="2.35"
          fill="none"
          stroke={color}
          strokeWidth="1.15"
        />
        <g fill={color}>
          <g transform="translate(12 2.85)">
            <circle cx="0" cy="0" r="1.2" />
            <path d="M-1.75 1.05h3.5c.28 0 .5.22.5.5v2.35c0 .38-.31.68-.69.68h-3.62c-.38 0-.69-.3-.69-.68v-2.35c0-.28.22-.5.5-.5z" />
          </g>
          <g transform="translate(2.9 10.2) rotate(62)">
            <circle cx="0" cy="0" r="1.15" />
            <path d="M-1.65 1h3.3c.26 0 .47.21.47.47v2.2c0 .35-.28.63-.63.63h-3.48c-.35 0-.63-.28-.63-.63v-2.2c0-.26.21-.47.47-.47z" />
          </g>
          <g transform="translate(21.1 10.2) rotate(-62)">
            <circle cx="0" cy="0" r="1.15" />
            <path d="M-1.65 1h3.3c.26 0 .47.21.47.47v2.2c0 .35-.28.63-.63.63h-3.48c-.35 0-.63-.28-.63-.63v-2.2c0-.26.21-.47.47-.47z" />
          </g>
          <g transform="translate(6.85 21.05) rotate(142)">
            <circle cx="0" cy="0" r="1.15" />
            <path d="M-1.65 1h3.3c.26 0 .47.21.47.47v2.2c0 .35-.28.63-.63.63h-3.48c-.35 0-.63-.28-.63-.63v-2.2c0-.26.21-.47.47-.47z" />
          </g>
          <g transform="translate(17.15 21.05) rotate(-142)">
            <circle cx="0" cy="0" r="1.15" />
            <path d="M-1.65 1h3.3c.26 0 .47.21.47.47v2.2c0 .35-.28.63-.63.63h-3.48c-.35 0-.63-.28-.63-.63v-2.2c0-.26.21-.47.47-.47z" />
          </g>
        </g>
      </svg>
    ),
    /** Field report, journal / stacked pages + bookmark */
    book: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          fill={color}
          fillOpacity="0.92"
          d="M5 3h8v18H6c-1.1 0-2-.9-2-2V5c0-.55.22-1.05.59-1.41C4.95 3.22 5.47 3 6 3h8"
        />
        <path
          fill={color}
          fillOpacity="0.72"
          d="M13 3h6c.55 0 1.05.22 1.41.59.37.36.59.86.59 1.41v14c0 1.1-.9 2-2 2h-6V3z"
        />
        <path fill="rgba(255,255,255,0.92)" d="M6.5 5.5h5.75v12h-5.25c-.28 0-.5-.22-.5-.5V6c0-.28.22-.5.5-.5z" />
        <path fill="rgba(255,255,255,0.85)" d="M13.75 5.25h5.15c.28 0 .5.22.5.5v11.35c0 .28-.22.5-.5.5h-5.15V5.25z" />
        <path stroke={color} strokeOpacity="0.35" strokeWidth="0.6" d="M13 3.25v17.5" />
        <path fill="#38bdf8" d="M15.25 3.5v5.4l.95-.72.95.72V3.5h-1.9z" />
        <path stroke={color} strokeOpacity="0.22" strokeWidth="0.45" strokeLinecap="round" d="M7.4 7.8h3.5M7.4 10h3.5M7.4 12.2h2.6M14.35 7.8h3.2M14.35 10h3.2M14.35 12.2h2.4" />
      </svg>
    ),
    sloganWall: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <rect x="2" y="4" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="10" y="4" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="18" y="4" width="4" height="3" fill={color} opacity="0.8"/>
        <rect x="5" y="8" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="13" y="8" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="2" y="12" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="10" y="12" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="18" y="12" width="4" height="3" fill={color} opacity="0.8"/>
        <rect x="5" y="16" width="6" height="3" fill={color} opacity="0.8"/>
        <rect x="13" y="16" width="6" height="3" fill={color} opacity="0.8"/>
        <line x1="2" y1="7" x2="22" y2="7" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="2" y1="11" x2="22" y2="11" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="2" y1="15" x2="22" y2="15" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="2" y1="19" x2="22" y2="19" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="8" y1="4" x2="8" y2="22" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="16" y1="4" x2="16" y2="22" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="11" y1="8" x2="11" y2="22" stroke={color} strokeWidth="0.5" opacity="0.3"/>
        <line x1="19" y1="8" x2="19" y2="22" stroke={color} strokeWidth="0.5" opacity="0.3"/>
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
      </svg>
    ),
    send: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>
    ),
    practice: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
        {/* Clipboard/checklist base */}
        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill={color} stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1"/>
        {/* Checkmark 1 */}
        <path d="M9 12l2 2 4-4" stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Checkmark 2 */}
        <path d="M9 16l2 2 4-4" stroke="rgba(0, 0, 0, 0.95)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    thumbsUp: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
      </svg>
    ),
    thumbsDown: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
    ),
    export: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        {/* Download: arrow into tray (not upload) */}
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18h14v2H5z" />
      </svg>
    ),
    columns: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Three rounded vertical panes (reads as columns, not pause bars) */}
        <rect x="4" y="5" width="4.75" height="14" rx="1.35" fill={color} />
        <rect x="9.625" y="5" width="4.75" height="14" rx="1.35" fill={color} />
        <rect x="15.25" y="5" width="4.75" height="14" rx="1.35" fill={color} />
      </svg>
    ),
    sort: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
      </svg>
    ),
    file: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      </svg>
    ),
    filter: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>
    ),
    /** Shield, private / secure trust tiles */
    shield: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
      </svg>
    ),
    hourglass: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        <path d="M6 2v4h.01L10 10.5V13h4v-2.5L17.99 6H18V2H6zm2 16v4h8v-4h-.01L14 13.5V11h-4v2.5L8.01 18H8z" />
      </svg>
    ),
    brokenHeart: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        <path d="M16 5c-1.66 0-3 1.34-3 3 0 .35.07.68.17 1H9.83c.1-.32.17-.65.17-1 0-2.21-1.79-4-4-4S2 4.79 2 7c0 2.52 2.18 5.13 6.22 8.66L12 21.35l3.78-5.69C19.82 12.13 22 9.52 22 7c0-2.21-1.79-4-4-4-1.09 0-2.08.44-2.81 1.15L16 5zm-1.41 4.41L12 8.83l-2.59 2.58L8.17 10l-1.42 1.42L10.59 15l1.41-1.41L12 15.59l2.59-2.58 1.42 1.41L13.41 15l1.41 1.41 3.84-3.84-1.41-1.41L15 13.41l-1.41 1.41-1.41-1.41 1.41-1.41-1.41-1.41z" />
      </svg>
    ),
    lightning: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08 3.41-4.84 1.24-1.76 2.13-3.02 2.67-3.78C13.25 4.05 13.5 4 14 4h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15-6.9 9.34z" />
      </svg>
    ),
    bookmark: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      </svg>
    ),
    moreVertical: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color} aria-hidden="true">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    ),
    /**
     * Handshake forming a heart, monoline, rounded caps (respect / mutual trust).
     * Loosely matches brand asset: two arms from below, clasp at the point, lobes at top.
     */
    respectHandshake: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.75 17.25c.5-3.4 2.65-6.6 5.9-8.35a4.1 4.1 0 0 1 3.45-.35" />
        <path d="M21.25 17.25c-.5-3.4-2.65-6.6-5.9-8.35a4.1 4.1 0 0 0-3.45-.35" />
        <path d="M9.15 8.55c.55-1.05 1.65-1.7 2.85-1.7s2.3.65 2.85 1.7" />
        <path d="M12 6.85v1.35" />
        <path d="M8.6 17.1c.85.95 2.05 1.5 3.4 1.5s2.55-.55 3.4-1.5" />
        <path d="M10.5 18.9L12 20.25 13.5 18.9" />
      </svg>
    ),
  };

  const icon = icons[name];
  
  if (!icon) {
    console.warn(`Icon "${name}" not found in IconProvider`);
    return null;
  }

  return (
    <span 
      className={className}
      style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size
      }}
    >
      {React.cloneElement(icon, { width: size, height: size })}
    </span>
  );
}
