// Color constants for the entire application
// Organized by component and purpose

/**
 * Dense semantic fills used outside the interactions chip palette, currently:
 *   - `FOLLOW_UP_CHIP_STYLES` in `src/lib/setFollowUp.js` (`.red`, `.orange`)
 *   - reminder action icon on the interactions row (`.orange.border`)
 *
 * Status + priority chip colours live in `src/app/interactions/Interactions.module.scss`.
 */
export const SURFACE_SEMANTIC_STRONG = Object.freeze({
  green: Object.freeze({ bg: '#4caf50', border: '#388e3c' }),
  red: Object.freeze({ bg: '#d32f2f', border: '#b71c1c' }),
  orange: Object.freeze({ bg: '#ef6c00', border: '#e65100' }),
});

// Slogan Wall Colors
export const SLOGAN_WALL_COLORS = {
  // Light mode post-it colors
  LIGHT_POST_IT: [
    '#FFEB3B', // Classic bright yellow
    '#FFF176', // Light yellow
    '#FFEE58', // Medium yellow
    '#FFC107', // Amber yellow
    '#FFD54F', // Golden yellow
    '#FFECB3', // Very light yellow
    '#FFF9C4', // Cream yellow
    '#FFE082', // Warm yellow
  ],

  // Dark mode post-it colors (darker, more muted)
  DARK_POST_IT: [
    '#8B6914', // Dark golden yellow
    '#9C7B1A', // Dark amber
    '#AD8B20', // Dark yellow
    '#BE9B26', // Dark golden
    '#CFAB2C', // Dark cream
    '#E0BB32', // Dark warm yellow
    '#F1CB38', // Dark bright yellow
    '#A68B1F', // Dark medium yellow
  ],

  // Dark, readable text colors for post-it notes
  TEXT_COLORS: [
    '#1A1A1A', // Deep black
    '#2E2E2E', // Dark gray
    '#1B4D3E', // Dark forest green
    '#4A148C', // Dark purple
    '#B71C1C', // Dark red
    '#0D47A1', // Dark blue
    '#E65100', // Dark orange
    '#4A148C', // Dark purple
    '#1B5E20', // Dark green
    '#3E2723', // Dark brown
    '#263238', // Dark blue-gray
    '#BF360C', // Dark red-orange
    '#1A237E', // Dark indigo
    '#2E7D32', // Dark green
    '#5D4037', // Dark brown
    '#37474F'  // Dark blue-gray
  ]
};

// Font families for slogan wall
export const SLOGAN_WALL_FONTS = [
  '"Impact", "Arial Black", sans-serif',
  '"Courier New", monospace',
  '"Georgia", serif',
  '"Arial Black", sans-serif',
  '"Trebuchet MS", sans-serif',
  'system-ui, -apple-system, sans-serif',
  '"Palatino", serif'
];
