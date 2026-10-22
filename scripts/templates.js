// @ts-nocheck

function createPokemonCardHTML(poke) {
  return `
  <button class="pokemon-card">
                    <span>#${poke.id}</span>
                    <h2>${poke.name}</h2>
                    <img src="${poke.sprites.front_default}" alt="${poke.name}">
                </button>
    `;
}
