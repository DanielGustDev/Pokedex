// @ts-nocheck

function getPokemonData(poke) {
  return {
    id: poke.id,
    name: poke.name,
    image: poke.sprites.front_default,
    primaryType: poke.types[0].type.name,
    typeIconsHTML: renderTypeIcons(poke.typeIcons),
  };
}

function createPokemonCardHTML(poke, index) {
  let cardData = getPokemonData(poke);

  return `
  <button class="pokemon-card type-${cardData.primaryType}" onclick='openPokemonModal(${index})'>
                <div class="title">
                    <p>#${cardData.id}</p>
                    <h2>${cardData.name}</h2>
                </div>
                    <img src="${cardData.image}" alt="${cardData.name}">
                <div class="type-container">
                    ${cardData.typeIconsHTML}
                </div>
    </button>
    `;
}

function createPokemonDialogHTML(poke) {
  return `
    <section class="detail-content">
        <div class="dialog-top">
            <div class="dialog-title">
                <p>#${poke.id}</p>
                <h3>${poke.name}</h3>
            </div>
            <button onclick="closeModal()">Close</button>
        </div>
        <div class="detail-images">
            <img src="${poke.sprites.front_default}" alt="${poke.name}">
            <div class="type-container">
                ${renderTypeIcons(poke.typeIcons)}
            </div>
        </div>
        <p class="entry-text">${poke.flavorText}</p>
        <div class="dialog-details">
            <p>Height: ${convertToMeters(poke.height)}m</p>
            <p>Weight: ${convertToKg(poke.weight)}kg</p>
        </div>
    </section >
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
