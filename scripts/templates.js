// @ts-nocheck

// POKEMON CARD TEMPLATES

function createPokemonCardHTML(cardData) {
  return `
    <button class="pokemon-card type-${cardData.primaryType}" data-id="card" aria-label="Open ${cardData.name}, Pokémon number ${cardData.id}" onclick="openPokemonModal(${cardData.id})">
        <div class="title">
            <p>#${cardData.id}</p>
            <h2>${cardData.name}</h2>
        </div>
        <img data-id="card-image" src="${cardData.image}" alt="${cardData.name} artwork">
        <div class="type-container">
            ${cardData.typeIconsHTML}
        </div>
    </button>
  `;
}

function createTypeIconHTML(type) {
  return `<img class="type-icon" src="${type.icon}" alt="${type.name}">`;
}

// MODAL / DIALOG MAIN TEMPLATE

function createPokemonDialogHTML(poke) {
  return `
    <section class="dialog-content" data-id="overly-pokemon-name" onclick="event.stopPropagation()">
        <div class="dialog-top">
            <div class="dialog-title">
                <button class="left-button" id="prevButton" data-id="prev-button" aria-label="Previous Pokémon"
                    onclick="navigatePokemon(${poke.id}, -1)">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                        <g id="arrow-left" fill="#000000">
                            <rect x="4" y="7" width="1" height="2" />
                            <rect x="5" y="6" width="1" height="4" />
                            <rect x="6" y="5" width="1" height="6" />
                            <rect x="7" y="4" width="1" height="8" />
                            <rect x="8" y="7" width="4" height="2" />
                        </g>
                    </svg>
                </button>
                <div class="id-and-name">
                    <p>#${poke.id}</p>
                    <h3>${poke.name}</h3>
                </div>
                <button class="right-button" id="nextButton" data-id="next-button" aria-label="Next Pokémon"
                    onclick="navigatePokemon(${poke.id}, 1)">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                        <g id="arrow-right" fill="#000000">
                            <rect x="4" y="7" width="4" height="2" />
                            <rect x="8" y="4" width="1" height="8" />
                            <rect x="9" y="5" width="1" height="6" />
                            <rect x="10" y="6" width="1" height="4" />
                            <rect x="11" y="7" width="1" height="2" />
                        </g>
                    </svg>
                </button>
            </div>
            <button class="close-button" data-id="close-dialog-button" aria-label="Close Pokémon Details"
                onclick="closeModal()">Close</button>
        </div>
        <div class="detail-content">
            <div class="detail-images">
                <img class="main-images type-${poke.primaryType}" data-id="dialog-image" src="${poke.image}" alt="${poke.name} artwork">
                ${poke.evolutionHTML}
            </div>
            <div class="detail-infos">
                <h4>Description: </h4>
                <p class="entry-text">${poke.flavorText}</p>
                <nav class="dialog-navbar" role="tablist" aria-label="Pokémon Information">
                    <button class="active" role="tab" aria-selected="true"
                        aria-controls="dialog_detail_container"
                        onclick="showDetails(${poke.id}, this)">Details</button>
                    <button role="tab" aria-selected="false" aria-controls="dialog_detail_container"
                        onclick="showStats(${poke.id}, this)">Stats</button>
                    <button role="tab" aria-selected="false" aria-controls="dialog_detail_container"
                        onclick="showCall(${poke.id}, this)">Call</button>
                    <button role="tab" aria-selected="false" aria-controls="dialog_detail_container"
                        onclick="showForms(${poke.id}, this)">Forms</button>
                </nav>
                <div id="dialog_detail_container">
                    ${poke.detailsHTML}
                </div>
            </div>
        </div>
    </section>
  `;
}

// MODAL SUB-TABS

function getDetailsHTML(data) {
  return `
    <table class="dialog-details">
        <tr>
            <th>Type:</th>
            <td>${data.typeNames}</td>
        </tr>
        <tr>
            <th>Height:</th>
            <td>${data.height}m</td>
        </tr>
        <tr>
            <th>Weight:</th>
            <td>${data.weight}kg</td>
        </tr>
    </table>
  `;
}

function getStatsHTML(statsRowsHTML) {
  return `
    <table class="dialog-details">
        ${statsRowsHTML}
    </table>
  `;
}

function getCallHTML(audioHTML) {
  return `
    <div class="dialog-callbox dialog-details">
        <p>Listen to Pokémon Call: </p>
        ${audioHTML}
    </div>
  `;
}

function getFormsHTML(formsContentHTML) {
  return `
    <div class="dialog-details form-wrapper">
        <div class="evo-chain">${formsContentHTML}</div>
    </div>
  `;
}

// COMPONENTS

function renderEvolutionChainHTML(buttonHtml) {
  return `
    <section class="evolution-wrapper">
        <h4>Evolutions</h4>
        <div class="evo-chain">
            ${buttonHtml}
        </div>
    </section>
  `;
}

function renderEvoButtonHTML(item) {
  return `
    <button class="evo-button" onclick="openPokemonEvolution('${item.name}')">
        <img src="${item.image}" alt="${item.name}">
        <p>${item.name}</p>
    </button>
  `;
}
