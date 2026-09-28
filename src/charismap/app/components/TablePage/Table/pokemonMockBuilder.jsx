import React from 'react';

/** Core series–style type colors (same palette family as PokémonDB type badges) */
export const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

function mix(hex, withHex, t) {
  const h = hex.replace('#', '');
  const w = withHex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - t) + parseInt(w.slice(0, 2), 16) * t);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - t) + parseInt(w.slice(2, 4), 16) * t);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - t) + parseInt(w.slice(4, 6), 16) * t);
  return `rgb(${r},${g},${b})`;
}

function typePill(typeKey) {
  const k = String(typeKey).toLowerCase();
  const base = TYPE_COLORS[k] || '#888888';
  const top = mix(base, '#FFFFFF', 0.22);
  const bot = mix(base, '#000000', 0.12);
  const label = k.toUpperCase();
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        marginRight: 6,
        marginBottom: 4,
        borderRadius: 6,
        border: '2px solid #FFFFFF',
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.25)',
        fontWeight: 800,
        fontSize: '0.65rem',
        letterSpacing: '0.08em',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        background: `linear-gradient(180deg, ${top} 0%, ${base} 42%, ${bot} 100%)`,
      }}
    >
      {label}
    </span>
  );
}

function StatBarChart({ stats }) {
  const order = [
    { key: 'hp', label: 'HP' },
    { key: 'attack', label: 'Atk' },
    { key: 'defense', label: 'Def' },
    { key: 'specialAttack', label: 'SpA' },
    { key: 'specialDefense', label: 'SpD' },
    { key: 'speed', label: 'Spe' },
  ];
  const vals = order.map((o) => stats[o.key]);
  const max = Math.max(1, ...vals);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 88,
        padding: '8px 0 4px',
        borderTop: '1px solid var(--divider-secondary, #e5e7eb)',
        marginTop: 8,
      }}
    >
      {order.map((o) => {
        const v = stats[o.key];
        const h = Math.round((v / max) * 64);
        return (
          <div
            key={o.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 44,
            }}
          >
            <div
              title={`${o.label}: ${v}`}
              style={{
                width: '100%',
                height: h,
                minHeight: 4,
                borderRadius: 3,
                background: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            />
            <span style={{ fontSize: 9, marginTop: 4, fontWeight: 600, opacity: 0.85 }}>{o.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}

function buildEmbed(row) {
  const bst =
    row.bst ??
    row.hp +
      row.attack +
      row.defense +
      row.specialAttack +
      row.specialDefense +
      row.speed;
  const kg =
    typeof row.weightKg === 'number' && row.weightKg % 1 !== 0
      ? row.weightKg.toFixed(1)
      : String(row.weightKg);
  return (
    <div style={{ fontSize: '0.8125rem', lineHeight: 1.45, maxWidth: 560 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Pokédex entry (English)</p>
      <p style={{ margin: '0 0 8px', opacity: 0.95 }}>{row.description}</p>
      <p style={{ margin: '0 0 12px', opacity: 0.85, fontSize: '0.75rem' }}>
        Category: {row.genus} · Base stat total {bst} ·{' '}
        {typeof row.heightM === 'number' ? row.heightM.toFixed(1) : row.heightM} m · {kg} kg · Habitat:{' '}
        {row.habitat} · Species color: {row.color}
      </p>
      <StatBarChart stats={row} />
    </div>
  );
}

/**
 * @param {string[]} nameList, display names (same order as `pokemonNames.json`, PokéAPI list order)
 * @param {object[]} gameDataRows, rows from `pokemonGameData.json` (generated via `scripts/generate-pokemon-game-data.mjs`)
 */
export function buildPokemonRowsFromGameData(nameList, gameDataRows) {
  const n = Math.min(nameList.length, gameDataRows.length);
  const rows = [];

  for (let i = 0; i < n; i++) {
    const name = nameList[i];
    const g = gameDataRows[i];
    const type1 = g.types[0];
    const type2 = g.types[1] ?? null;
    const typesSearch = [g.types.join(' '), g.slug, name, g.genus || '']
      .join(' ')
      .toLowerCase();

    const bst = g.hp + g.attack + g.defense + g.specialAttack + g.specialDefense + g.speed;
    const row = {
      id: g.pokemonId,
      dexNumber: g.speciesId,
      name,
      type1,
      type2,
      typesSearch,
      hp: g.hp,
      attack: g.attack,
      defense: g.defense,
      specialAttack: g.specialAttack,
      specialDefense: g.specialDefense,
      speed: g.speed,
      bst,
      heightM: g.heightM,
      weightKg: g.weightKg,
      color: g.color,
      habitat: g.habitat,
      genus: g.genus,
      description: g.flavorText,
      legendary: g.isLegendary,
      mythical: g.isMythical,
    };
    row.embedsContent = buildEmbed(row);
    rows.push(row);
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

const SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export const pokemonMockColumnDefs = [
  {
    field: 'dexNumber',
    header: 'Dex #',
    width: 72,
    style: { justifyContent: 'flex-start', textAlign: 'left' },
    headerStyle: { justifyContent: 'flex-start', textAlign: 'left' },
  },
  {
    field: 'name',
    header: 'Pokémon',
    width: 168,
    style: {
      fontWeight: 600,
    },
    styleFunction: (value, _rowIndex, row) => {
      if (row?.legendary || row?.mythical) {
        return {
          backgroundColor: 'var(--table-row-legendary-bg)',
          color: 'var(--text-body)',
        };
      }
      return {
        backgroundColor: 'var(--table-row-name-bg)',
        color: 'var(--text-body)',
      };
    },
  },
  {
    field: 'id',
    header: 'Sprite',
    width: 88,
    renderFunction: (value) => (
      <img
        src={`${SPRITE_BASE}/${value}.png`}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        style={{
          imageRendering: 'pixelated',
          display: 'block',
          margin: '0 auto',
        }}
      />
    ),
  },
  {
    field: 'type1',
    header: 'Types',
    width: 220,
    sticky: true,
    style: {
      justifyContent: 'flex-start',
      textAlign: 'left',
    },
    headerStyle: {
      justifyContent: 'flex-start',
      textAlign: 'left',
    },
    renderFunction: (value, rowIndex, row) => (
      <span style={{ whiteSpace: 'normal', textAlign: 'left', display: 'block', width: '100%' }}>
        {[row.type1, row.type2]
          .filter(Boolean)
          .map((t, i) => (
            <span key={`${row.id}-${i}-${t}`} style={{ display: 'inline-block' }}>
              {typePill(t)}
            </span>
          ))}
      </span>
    ),
  },
  { field: 'hp', header: 'HP', width: 64 },
  { field: 'attack', header: 'Atk', width: 64 },
  { field: 'defense', header: 'Def', width: 64 },
  { field: 'specialAttack', header: 'SpA', width: 64 },
  { field: 'specialDefense', header: 'SpD', width: 64 },
  { field: 'speed', header: 'Spe', width: 64 },
  {
    field: 'bst',
    header: 'BST',
    width: 72,
    style: { fontWeight: 700 },
    headerStyle: { fontWeight: 700 },
  },
  {
    field: 'heightM',
    header: 'Height (m)',
    width: 96,
    renderFunction: (v) => (typeof v === 'number' ? v.toFixed(1) : v),
  },
  {
    field: 'weightKg',
    header: 'Weight (kg)',
    width: 104,
    renderFunction: (v) => (typeof v === 'number' ? (v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1)) : v),
  },
  { field: 'color', header: 'Color', width: 88 },
  {
    field: 'genus',
    header: 'Category',
    width: 148,
    minWidth: 120,
  },
  { field: 'habitat', header: 'Habitat', width: 120 },
  {
    field: 'typesSearch',
    header: '',
    width: 0,
    show: false,
  },
  {
    field: 'description',
    header: 'Pokédex entry',
    width: 420,
    minWidth: 320,
  },
];
