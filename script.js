// @ts-nocheck

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 20;
let loadedPokemon = [];

async function loadData() {
  showLoadingSpinner();
  try {
    let url = `${BASE_URL}?limit=${currentLimit}&offset=${currentOffset}`;
    let response = await fetch(url);
    let data = await response.json();

    await renderPokemonList(data.results);

    currentOffset += currentLimit;
    currentLimit = 30;
  } finally {
    hideLoadingSpinner();
  }
}

async function renderPokemonList(pokemonList) {
  let cardGrid = document.querySelector(".card-grid");

  for (let i = 0; i < pokemonList.length; i++) {
    let pokemonData = await fetchPokemon(pokemonList[i].url);

    loadedPokemon.push(pokemonData);
    let index = loadedPokemon.length - 1;

    cardGrid.innerHTML += createPokemonCardHTML(pokemonData, index);
  }
}

async function fetchPokemon(url) {
  let response = await fetch(url);
  let pokemon = await response.json();

  pokemon.typeIcons = await loadIcons(pokemon.types);

  return pokemon;
}

async function ensurePokemonDetails(poke) {
  if (poke.flavorText && poke.evolutionChain) return;

  let speciesData = await fetchPokemonSpecies(poke.species.url);
  poke.flavorText = extractFlavorText(speciesData);
  poke.evolutionChain = await fetchEvolutionChain(
    speciesData.evolution_chain.url,
  );
}

function formatDecimal(value) {
  return value.toString().replace(".", ",");
}
function convertToMeters(height) {
  let meters = (height / 10).toFixed(1);
  return formatDecimal(meters);
}

function convertToKg(weight) {
  let kg = (weight / 10).toFixed(1);
  return formatDecimal(kg);
}

async function loadIcons(typesArray) {
  let typePromises = typesArray.map((typeInfo) =>
    fetchSingleType(typeInfo.type.url),
  );

  return await Promise.all(typePromises);
}

async function fetchSingleType(typeUrl) {
  let response = await fetch(typeUrl);
  let typeData = await response.json();

  return {
    name: typeData.name,
    icon: extractIconUrl(typeData),
  };
}

function extractIconUrl(typeData) {
  return (
    typeData.sprites?.["generation-ix"]?.["scarlet-violet"]?.["symbol_icon"] ||
    ""
  );
}

function renderTypeNames(typesIcons) {
  if (!typesIcons) return "";

  return typesIcons
    .map((type) => type.name.charAt(0).toUpperCase() + type.name.slice(1))
    .join(", ");
}

async function fetchPokemonSpecies(speciesUrl) {
  let response = await fetch(speciesUrl);
  return await response.json();
}

function extractFlavorText(speciesData) {
  let englishEntry = speciesData.flavor_text_entries?.find(
    (entry) => entry.language.name === "en",
  );

  let rawText = englishEntry
    ? englishEntry.flavor_text
    : "No Pokédex entry found.";
  return rawText.replace(/[\n\f]/g, " ");
}

async function loadMorePokemon() {
  let loadButton = document.getElementById("load_more_button");
  if (loadButton) {
    loadButton.disabled = true;
    loadButton.innerHTML = "Loading...";
    showLoadingSpinner();
  }

  await loadData();

  if (loadButton) {
    loadButton.disabled = false;
    loadButton.innerText = "Load More";
  }
}

async function openPokemonModal(index) {
  let dialog = document.getElementById("pokemon_dialog");
  let modalBody = document.getElementById("modal_body");
  let poke = loadedPokemon[index];

  showLoadingSpinner();
  await ensurePokemonDetails(poke);
  hideLoadingSpinner();

  modalBody.innerHTML = createPokemonDialogHTML(poke, index);
  dialog.showModal();
}

function closeModal() {
  let dialog = document.getElementById("pokemon_dialog");
  dialog.close();
}

function showDetails(index) {
  let poke = loadedPokemon[index];
  document.getElementById("dialog_detail_container").innerHTML =
    getDetailsHTML(poke);
}

function showStats(index) {
  let poke = loadedPokemon[index];
  document.getElementById("dialog_detail_container").innerHTML =
    getStatsHTML(poke);
}

function showCall(index) {
  let poke = loadedPokemon[index];
  document.getElementById("dialog_detail_container").innerHTML =
    getCallHTML(poke);
}

async function navigatePokemon(currentIndex, direction) {
  let targetId = getTargetPokemonId(currentIndex, direction);
  let targetIndex = findPokemonIndexById(targetId);

  if (targetIndex === -1) {
    targetIndex = await loadAndCachePokemon(targetId);
  }

  await openPokemonModal(targetIndex);
}

function getTargetPokemonId(currentIndex, direction) {
  let currentPoke = loadedPokemon[currentIndex];
  return Math.max(1, currentPoke.id + direction);
}

async function loadAndCachePokemon(targetId) {
  showLoadingSpinner();
  try {
    let pokemonDetails = await fetchPokemon(`${BASE_URL}${targetId}`);
    loadedPokemon.push(pokemonDetails);
    loadedPokemon.sort((pokemonA, pokemonB) => pokemonA.id - pokemonB.id);
    return findPokemonIndexById(targetId);
  } finally {
    hideLoadingSpinner();
  }
}

function showLoadingSpinner() {
  let overlay = document.getElementById("loading_popover");
  if (overlay) {
    try {
      overlay.showPopover();
    } catch (error) {}
  }
}

function hideLoadingSpinner() {
  let overlay = document.getElementById("loading_popover");
  if (overlay) {
    try {
      overlay.hidePopover();
    } catch (error) {}
  }
}

async function fetchEvolutionChain(evolutionChainUrl) {
  let response = await fetch(evolutionChainUrl);
  let chainData = await response.json();
  let evolutionList = [];

  await parseEvolutionStep(chainData.chain, evolutionList);
  return evolutionList;
}

async function parseEvolutionStep(step, evolutionList) {
  if (!step) return;
  await addEvolutionPokemon(step, evolutionList);

  let nextSteps = step.evolves_to || [];
  for (let nextStep of nextSteps) {
    await parseEvolutionStep(nextStep, evolutionList);
  }
}

async function addEvolutionPokemon(step, evolutionList) {
  let url = `${BASE_URL}${step.species.name}`;
  let response = await fetch(url);
  let details = await response.json();

  evolutionList.push({
    name: step.species.name,
    image: details.sprites.front_default,
  });
}

function findPokemonIndexByName(pokemonName) {
  return loadedPokemon.findIndex((poke) => poke.name === pokemonName);
}

async function openPokemonEvolution(pokemonName) {
  let pokemonIndex = findPokemonIndexByName(pokemonName);
  if (pokemonIndex === -1) {
    showLoadingSpinner();
    let pokemonDetails = await fetchPokemon(`${BASE_URL}${pokemonName}`);
    loadedPokemon.push(pokemonDetails);
    loadedPokemon.sort((pokemonA, pokemonB) => pokemonA.id - pokemonB.id);
    pokemonIndex = findPokemonIndexById(pokemonDetails.id);
    hideLoadingSpinner();
  }
  await openPokemonModal(pokemonIndex);
}

function findPokemonIndexById(pokemonId) {
  return loadedPokemon.findIndex((poke) => poke.id === pokemonId);
}
