// @ts-nocheck

//  POKEMON CARD TEMPLATES & DATA HELPERS

function getPokemonData(poke) {
  return {
    id: poke.id,
    name: poke.name,
    image: poke.sprites.front_default,
    primaryType: poke.types[0].type.name,
    typeIconsHTML: renderTypeIcons(poke.typeIcons),
  };
}

function createPokemonCardHTML(poke) {
  let cardData = getPokemonData(poke);

  return `
  <button class="pokemon-card type-${cardData.primaryType}" data-id="card" onclick='openPokemonModal(${cardData.id})'>
                <div class="title">
                    <p>#${cardData.id}</p>
                    <h2>${cardData.name}</h2>
                </div>
                    <img data-id="card-image" src="${cardData.image}" alt="${cardData.name}">
                <div class="type-container">
                    ${cardData.typeIconsHTML}
                </div>
    </button>
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

//  MODAL / DIALOG MAIN TEMPLATE

function createPokemonDialogHTML(poke) {
  return `
    <section data-id="overly-pokemon-name">
        <div class="dialog-top">
            <div class="dialog-title">
                <button class="left_button" id="prevButton" data-id="prev-button" onclick="navigatePokemon(${poke.id}, -1)"
                    aria-label="previous pokemon">
                    < </button>
                        <p>#${poke.id}</p>
                        <h3>${poke.name}</h3>
                        <button class="right_button" id="nextButton" data-id="next-button" onclick="navigatePokemon(${poke.id}, 1)"
                            aria-label="next pokemon">
                            >
                        </button>
            </div>
            <button data-id="close-dialog-button" onclick="closeModal()">Close</button>
        </div>
        <div class="detail-content">
            <div class="detail-images">
                <img data-id="dialog-image" src="${poke.sprites.other.home.front_default}" alt="${poke.name}">

                ${renderEvolutionChain(poke.evolutionChain)}
            </div>
            <div class="detail-infos">
                <h4>Description: </h4>
                <p class="entry-text">${poke.flavorText}</p>
                <nav class="dialog-navbar">
                    <button class="active" onclick="showDetails(${poke.id}, event.target)">Details</button>
                    <button onclick="showStats(${poke.id}, event.target)">Stats</button>
                    <button onclick="showCall(${poke.id}, event.target)">Call</button>
                    <button onclick="showForms(${poke.id}, event.target)">Forms</button>
                </nav>
                <div id="dialog_detail_container">
                    ${getDetailsHTML(poke)}
                </div>
            </div>
        </div>
    </section>
    `;
}

//  MODAL SUB-TABS

function getDetailsHTML(poke) {
  return `
    <table class="dialog-details">
        <tr>
            <th>Type:</th>
            <td>${renderTypeNames(poke.typeIcons)}</td>
        </tr>
        <tr>
            <th>Height:</th>
            <td>${convertToMeters(poke.height)}m</td>
        </tr>
        <tr>
            <th>Weight:</th>
            <td>${convertToKg(poke.weight)}kg</td>
        </tr>
    </table>
    `;
}

function getStatsHTML(poke) {
  let statsRows = poke.stats
    .map(
      (statObject) => `
            <tr>
                <th>${statObject.stat.name.toUpperCase()}:</th>
                <td>${statObject.base_stat}</td>
            </tr>
        `,
    )
    .join("");

  return `
        <table class="dialog-details">
            ${statsRows}
        </table>
    `;
}

function getCallHTML(poke) {
  let cryUrl = poke.cries?.latest || "";

  return `
        <div class="dialog-callbox dialog-details">
            <p>Listen to Pokèmon Call: </p>
            ${cryUrl ? `<audio controls src="${cryUrl}"></audio>` : "<p>No Call known</p>"}
        </div>
    `;
}

function getFormsHTML(poke) {
  if (!poke.formsList || poke.formsList.length <= 1) {
    return `<div class="dialog-callbox dialog-details"><p>No alternative forms known.</p></div>`;
  }
  let buttonHtml = poke.formsList
    .map(
      (form) => `
    <button class="evo-button" onclick="openPokemonEvolution('${form.name}')">
        <img src="${form.image}" alt="${form.name}">
        <p>${form.name}</p>
    </button>`,
    )
    .join("");

  return `<div class="dialog-details evolution-wrapper" style="width: 100%; margin: 0; border: none; height: auto;">
            <div class="evo-chain">${buttonHtml}</div>
          </div>`;
}

//  MODAL COMPONENTS

function renderEvolutionChain(evolutionChain) {
  if (!evolutionChain || evolutionChain.length <= 1) return "";
  let buttonHtml = evolutionChain
    .map(
      (evolution) => `
        <button class="evo-button" onclick="openPokemonEvolution('${evolution.name}')">
            <img src="${evolution.image}" alt="${evolution.name}">
            <p>${evolution.name}</p>
        </button>
    `,
    )
    .join("");
  return `<section class="evolution-wrapper">
            <h4>Evolutions</h4>
            <div class="evo-chain">
            ${buttonHtml}
            </div>
        </section>`;
}
