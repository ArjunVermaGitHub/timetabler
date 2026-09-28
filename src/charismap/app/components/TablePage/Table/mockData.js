import pokemonNames from './pokemonNames.json';
import pokemonGameData from './pokemonGameData.json';
import { buildPokemonRowsFromGameData, pokemonMockColumnDefs } from './pokemonMockBuilder.jsx';

/**
 * Full National Dex demo (~1025 rows), sorted A–Z by name. Static only, no runtime API.
 * Game stats/types/dimensions/text are sourced from PokéAPI (aligned with PokémonDB tables).
 * Regenerate data: `node scripts/generate-pokemon-game-data.mjs`
 * Sprites: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
 */
export const mockRowData = buildPokemonRowsFromGameData(pokemonNames, pokemonGameData);
export const mockColumnDefs = pokemonMockColumnDefs;

export const mockStylesArray = [];
export const mockRowStyles = mockStylesArray;
export const mockSuperHeaders = [];
