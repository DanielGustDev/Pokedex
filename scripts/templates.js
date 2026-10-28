// @ts-nocheck

function createPokemonCardHTML(poke, index) {
  return `
  <button class="pokemon-card" onclick='openPokemonModal(${index})'>
                <div class="title">
                    <p>#${poke.id}</p>
                    <h2>${poke.name}</h2>
                </div>
                    <img src="${poke.sprites.front_default}" alt="${poke.name}">
                <div class="type-container">
                    ${renderTypeIcons(poke.typeIcons)}
                </div>
    </button>
    `;
}

function createPokemonDetailHTML(poke) {
  return `
    <div class="detail-content">
        <p>#${poke.id}</p>
        <h3>${poke.name}</h3>
        <img src="${poke.sprites.front_default}" alt="${poke.name}">
        <div class="type-container">
            ${renderTypeIcons(poke.typeIcons)}
        </div>
        <p>Height: ${convertToMeters(poke.height)}m</p>
        <p>Weight: ${convertToKg(poke.weight)}kg</p>
        <p class="entry-text">${poke.flavorText}</p>
        <button onclick="closeModal()">Close</button>
    </div>
    `;
}

function renderTypeIcons(typeIcons) {
  if (!typeIcons) return "";

  return typeIcons
    .map(
      (type) => `
  <img class="type-icon" src="${type.icon}" alt="${type.name}">`,
    )
    .join("");
}
