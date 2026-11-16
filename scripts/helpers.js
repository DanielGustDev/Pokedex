// @ts-nocheck

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 30;
let loadedPokemon = [];
const globalCache = {};
let isSearchActive = false;
let currentSearchResults = [];

// --- EVOLUTION CHAIN PARSING ---

async function fetchEvolutionChain(evolutionChainUrl) {
  let chainData = await fetchJson(evolutionChainUrl);
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
  const id = step.species.url.split("/").filter(Boolean).pop();
  let details = await getPokemon(id);
  evolutionList.push({
    name: details.name,
    image: details.sprites.front_default,
  });
}

// --- TYPE ICONS & FORMATTING HELPERS ---

async function loadIcons(typesArray) {
  return Promise.all(typesArray.map((t) => fetchSingleType(t.type.url)));
}

async function fetchSingleType(typeUrl) {
  let typeData = await fetchJson(typeUrl);
  return {
    url: typeUrl,
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
  return formatDecimal((height / 10).toFixed(1));
}

function convertToKg(weight) {
  return formatDecimal((weight / 10).toFixed(1));
}

// --- NAVIGATION & SEARCH HELPERS ---

async function navigatePokemon(currentId, direction) {
  if (isSearchActive && currentSearchResults.length > 0) {
    await navigateSearchPokemon(currentId, direction);
  } else {
    await navigateStandardPokemon(currentId, direction);
  }
}

async function navigateSearchPokemon(currentId, direction) {
  let currentIndex = findSearchIndex(currentId);
  if (currentIndex === -1) return;

  let newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < currentSearchResults.length) {
    await openPokemonModal(getSearchTargetId(newIndex));
  }
}

async function navigateStandardPokemon(currentId, direction) {
  await openPokemonModal(getTargetPokemonId(currentId, direction));
}

function findSearchIndex(currentId) {
  return currentSearchResults.findIndex((poke) => {
    let id = Number(poke.url.split("/").filter(Boolean).pop());
    return id === currentId;
  });
}

function getSearchTargetId(index) {
  return Number(
    currentSearchResults[index].url.split("/").filter(Boolean).pop(),
  );
}

function getTargetPokemonId(currentId, direction) {
  if (currentId === 1 && direction === -1) {
    return globalCache[BASE_URL + "?limit=1"]?.count || 1025;
  }
  return Math.max(1, currentId + direction);
}

async function openPokemonEvolution(pokemonName) {
  const pokemon = await getPokemon(pokemonName);
  await openPokemonModal(pokemon.id);
}

async function handleFooterButtonClick() {
  if (isSearchActive) await resetToMainView();
  else await loadMorePokemon();
}

async function resetToMainView() {
  setSearchActiveState(false, "Load More");
  document.querySelector(".pokedex-search").value = "";
  currentOffset = 0;
  clearPokemonList();
  await loadData();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateScrollVisibility() {
  const button = document.getElementById("scroll_to_top");
  if (!button) return;
  const dialogOpen = document.getElementById("pokemon_dialog")?.open;
  button.classList.toggle(
    "show",
    window.scrollY > 300 && !dialogOpen && !isSearchActive,
  );
}

// --- LOADING SPINNER CONTROLS ---

function showLoadingSpinner() {
  try {
    document.getElementById("loading_popover")?.showPopover();
  } catch (error) {}
}

function hideLoadingSpinner() {
  try {
    document.getElementById("loading_popover")?.hidePopover();
  } catch (error) {}
}

// --- EVENT LISTENER ---

function initSearchListeners() {
  let searchButton = document.querySelector(".search-button");
  let searchInput = document.querySelector(".pokedex-search");
  if (searchButton) searchButton.addEventListener("click", handleSearch);
  if (searchInput)
    searchInput.addEventListener(
      "keydown",
      (e) => e.key === "Enter" && handleSearch(),
    );
}

function initGlobalUIListeners() {
  window.addEventListener("scroll", updateScrollVisibility);
  document.addEventListener("focusin", updateScrollVisibility);
  document.addEventListener("focusout", updateScrollVisibility);
}
