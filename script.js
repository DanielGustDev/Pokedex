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
    const url = `${BASE_URL}?limit=${currentLimit}&offset=${currentOffset}`;
    const data = await fetchJson(url);

    await renderPokemonList(data.results);

    currentOffset += data.results.length;
  } finally {
    hideLoadingSpinner();
  }
}

async function renderPokemonList(pokemonList) {
  const pokemonData = await Promise.all(
    pokemonList.map((pokemon) => fetchPokemon(pokemon.url)),
  );

  displayPokemonCards(pokemonData, true);
}

function displayPokemonCards(pokemonData, append = false) {
  loadedPokemon.push(...pokemonData);

  const cardGrid = document.querySelector(".card-grid");
  const html = pokemonData.map(createPokemonCardHTML).join("");

  if (append) {
    cardGrid.insertAdjacentHTML("beforeend", html);
  } else {
    cardGrid.innerHTML = html;
  }
}

async function loadMorePokemon() {
  const loadButton = document.getElementById("load_more_button");
  if (loadButton) {
    setLoadButtonState(loadButton, true);
  }

  try {
    await loadData();
  } finally {
  }
  if (loadButton) {
    setLoadButtonState(loadButton, false);
  }
}

function setLoadButtonState(loadButton, loading) {
  loadButton.disabled = loading;
  loadButton.innerText = loading ? "Loading..." : "Load More";
}

function changeLimit(newLimit) {
  currentLimit = Number(newLimit);
  currentOffset = 0;
}

//  API FETCHING & LAZY LOADING (DETAILS)

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Pokemon: ${response.status}`);
  }

  return await response.json();
}

async function fetchPokemon(url) {
  const pokemon = await fetchJson(url);

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
  return fetchJson(speciesUrl);
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

  return (
    englishEntry?.flavor_text?.replace(/[\n\f]/g, " ") ??
    "No Pokédex entry found."
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

//  MODAL & UI INTERACTION

async function openPokemonModal(pokemonId) {
  let index = findPokemonIndexById(pokemonId);
  if (index === -1) {
    index = await loadAndCachePokemon(pokemonId);
  }

  let poke = loadedPokemon[index];
  showLoadingSpinner();
  try {
    await ensurePokemonDetails(poke);
  } finally {
    hideLoadingSpinner();
  }

  document.getElementById("modal_body").innerHTML =
    createPokemonDialogHTML(poke);
  document.getElementById("pokemon_dialog").showModal();
}

function closeModal() {
  let dialog = document.getElementById("pokemon_dialog");
  dialog.close();
}

function setActiveTab(clickedButton) {
  document.querySelectorAll(".dialog-navbar button").forEach((button) => {
    button.classList.remove("active");
  });
  if (clickedButton) clickedButton.classList.add("active");
}

function showDetails(pokemonId, clickedButton) {
  setActiveTab(clickedButton);
  let poke = loadedPokemon[findPokemonIndexById(pokemonId)];
  document.getElementById("dialog_detail_container").innerHTML =
    getDetailsHTML(poke);
}

function showStats(pokemonId, clickedButton) {
  setActiveTab(clickedButton);
  let poke = loadedPokemon[findPokemonIndexById(pokemonId)];
  document.getElementById("dialog_detail_container").innerHTML =
    getStatsHTML(poke);
}

function showCall(pokemonId, clickedButton) {
  setActiveTab(clickedButton);
  let poke = loadedPokemon[findPokemonIndexById(pokemonId)];
  document.getElementById("dialog_detail_container").innerHTML =
    getCallHTML(poke);
}

function showForms(pokemonId, clickedButton) {
  setActiveTab(clickedButton);
  let poke = loadedPokemon[findPokemonIndexById(pokemonId)];
  document.getElementById("dialog_detail_container").innerHTML =
    getFormsHTML(poke);
}

//  NAVIGATION, CACHING & SEARCH HELPERS

async function navigatePokemon(currentId, direction) {
  let targetId = getTargetPokemonId(currentId, direction);
  await openPokemonModal(targetId);
}

function getTargetPokemonId(currentId, direction) {
  return Math.max(1, currentId + direction);
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
  if (pokemonIndex !== -1) {
    return await openPokemonModal(loadedPokemon[pokemonIndex].id);
  }

  showLoadingSpinner();
  let pokemonDetails = await fetchPokemon(`${BASE_URL}${pokemonName}`);
  loadedPokemon.push(pokemonDetails);
  loadedPokemon.sort((pokemonA, pokemonB) => pokemonA.id - pokemonB.id);
  hideLoadingSpinner();
  await openPokemonModal(pokemonDetails.id);
}

function findPokemonIndexById(pokemonId) {
  return loadedPokemon.findIndex((poke) => poke.id === pokemonId);
}

function findPokemonIndexByName(pokemonName) {
  return loadedPokemon.findIndex((poke) => poke.name === pokemonName);
}

async function handleFooterButtonClick() {
  if (isSearchActive) {
    await resetToMainView();
  } else {
    await loadMorePokemon();
  }
}

async function resetToMainView() {
  setSearchActiveState(false, "Load More");
  document.querySelector(".pokedex-search").value = "";

  currentOffset = 0;
  clearPokemonList();
  await loadData();
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

  const { count } = await fetchJson(`${BASE_URL}?limit=1`);
  const { results } = await fetchJson(`${BASE_URL}?limit=${count}`);

  cachedAllPokemon = results;
  return cachedAllPokemon;
}

function setSearchActiveState(active, buttonText) {
  isSearchActive = active;
  document.getElementById("load_more_button").innerText = buttonText;

  let limitSelector = document.getElementById("limit_selector");
  if (limitSelector)
    limitSelector.style.display = active ? "none" : "inline-block";
}

async function renderSearchResults(matches) {
  prepareSearchView();

  if (matches.length === 0) {
    renderNoSearchResults();
    return;
  }

  const pokemonData = await fetchSearchPokemon(matches);
  displaySearchPokemon(pokemonData);
}

function renderNoSearchResults() {
  const cardGrid = document.querySelector(".card-grid");

  cardGrid.innerHTML = `<p class="no-results">No Pokémon found.</p>`;
}

function prepareSearchView() {
  setSearchActiveState(true, "Back");
  clearPokemonList();
}

function clearPokemonList() {
  const cardGrid = document.querySelector(".card-grid");
  cardGrid.innerHTML = "";
  loadedPokemon = [];
}

async function fetchSearchPokemon(matches) {
  return Promise.all(matches.map((match) => fetchPokemon(match.url)));
}

function displaySearchPokemon(pokemonData) {
  displayPokemonCards(pokemonData);
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
