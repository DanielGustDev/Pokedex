// @ts-nocheck

// GLOBAL VARIABLES & CONSTANTS

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 20;
let loadedPokemon = [];
let cachedAllPokemon = null;
let isSearchActive = false;

//  INITIAL LOADING & LIST RENDERING

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

//  API FETCHING & LAZY LOADING (DETAILS)

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
  poke.formsList = await fetchPokemonForms(speciesData.varieties);
}

async function fetchPokemonSpecies(speciesUrl) {
  let response = await fetch(speciesUrl);
  return await response.json();
}

async function fetchPokemonForms(varieties) {
  if (!varieties || varieties.length <= 1) return [];
  let formPromises = varieties.map(async (variety) => {
    let response = await fetch(variety.pokemon.url);
    let details = await response.json();
    return { name: variety.pokemon.name, image: details.sprites.front_default };
  });
  return await Promise.all(formPromises);
}

function showForms(index) {
  let poke = loadedPokemon[index];
  document.getElementById("dialog_detail_container").innerHTML =
    getFormsHTML(poke);
}

//  EVOLUTION CHAIN PARSING

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

//  TYPE ICONS & FORMATTING HELPERS

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

function extractFlavorText(speciesData) {
  let englishEntry = speciesData.flavor_text_entries?.find(
    (entry) => entry.language.name === "en",
  );

  let rawText = englishEntry
    ? englishEntry.flavor_text
    : "No Pokédex entry found.";
  return rawText.replace(/[\n\f]/g, " ");
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

//  MODAL & UI INTERACTION

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

//  NAVIGATION, CACHING & SEARCH HELPERS

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

function findPokemonIndexByName(pokemonName) {
  return loadedPokemon.findIndex((poke) => poke.name === pokemonName);
}

//  LOADING SPINNER CONTROLS

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

async function handleFooterButtonClick() {
  if (isSearchActive) {
    await resetToMainView();
  } else {
    await loadMorePokemon();
  }
}

async function resetToMainView() {
  isSearchActive = false;
  document.querySelector(".pokedex-search").value = "";
  document.getElementById("load_more_button").innerText = "Load More";

  let cardGrid = document.querySelector(".card-grid");
  cardGrid.innerHTML = "";
  loadedPokemon = [];
  currentOffset = 0;
  currentLimit = 20;
  await loadData();
}

//  SEARCH FUNCTIONALITY

async function handleSearch() {
  let query = getSearchQuery();
  if (query.length < 3) return;

  showLoadingSpinner();
  try {
    let allPokemon = await fetchAllPokemonNames();
    let matches = allPokemon.filter((poke) => poke.name.includes(query));
    await renderSearchResults(matches);
  } finally {
    hideLoadingSpinner();
  }
}

function getSearchQuery() {
  let inputField = document.querySelector(".pokedex-search");
  return inputField ? inputField.value.trim().toLowerCase() : "";
}

async function fetchAllPokemonNames() {
  if (cachedAllPokemon) return cachedAllPokemon;

  let initialResponse = await fetch(`${BASE_URL}?limit=1`);
  let initialData = await initialResponse.json();
  let totalCount = initialData.count;

  let response = await fetch(`${BASE_URL}?limit=${totalCount}`);
  let data = await response.json();

  cachedAllPokemon = data.results;
  return cachedAllPokemon;
}

async function renderSearchResults(matches) {
  isSearchActive = true;
  document.getElementById("load_more_button").innerText = "Back";
  let cardGrid = document.querySelector(".card-grid");
  cardGrid.innerHTML = "";
  loadedPokemon = [];

  if (matches.length === 0) {
    cardGrid.innerHTML = `<p class="no-results">No Pokèmon found.</p>`;
    return;
  }
  for (let match of matches) {
    await processAndRenderPokemon(match, cardGrid);
  }
}

async function processAndRenderPokemon(match, cardGrid) {
  let pokemonData = await fetchPokemon(match.url);
  loadedPokemon.push(pokemonData);
  loadedPokemon.sort((pokemonA, pokemonB) => pokemonA.id - pokemonB.id);
  let index = findPokemonIndexById(pokemonData.id);
  cardGrid.innerHTML += createPokemonCardHTML(pokemonData, index);
}

//  EVENT LISTENER

document.addEventListener("DOMContentLoaded", () => {
  let searchButton = document.querySelector(".search-button");
  let searchInput = document.querySelector(".pokedex-search");

  if (searchButton) {
    searchButton.addEventListener("click", handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleSearch();
    });
  }
});
