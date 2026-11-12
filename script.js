// @ts-nocheck

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 30;
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
  } catch (error) {
    console.error("Error loading Pokemon:", error);
  } finally {
    hideLoadingSpinner();
  }
}

async function renderPokemonList(pokemonList) {
  const pokemonData = await Promise.all(
    pokemonList.map((pokemon) => getPokemon(pokemon.name)),
  );

  displayPokemonCards(pokemonData, true);
}

function getPokemonData(poke) {
  return {
    id: poke.id,
    name: poke.name,
    image: poke.sprites.front_default,
    primaryType: poke.types[0].type.name,
    typeIconsHTML: renderTypeIcons(poke.typeIcons),
  };
}

function displayPokemonCards(pokemonData, append = false) {
  const cardGrid = document.querySelector(".card-grid");
  const html = pokemonData
    .map((poke) => createPokemonCardHTML(getPokemonData(poke)))
    .join("");

  if (append) {
    cardGrid.insertAdjacentHTML("beforeend", html);
    return;
  }

  cardGrid.innerHTML = html;
}

async function loadMorePokemon() {
  const loadButton = document.getElementById("load_more_button");
  if (loadButton) {
    setLoadButtonState(loadButton, true);
  }

  try {
    await loadData();
  } finally {
    if (loadButton) {
      setLoadButtonState(loadButton, false);
    }
  }
}

function setLoadButtonState(loadButton, loading) {
  loadButton.disabled = loading;
  loadButton.innerText = loading ? "Loading..." : "Load More";
}

function changeLimit(newLimit) {
  currentLimit = Number(newLimit);
}

//  API FETCHING & LAZY LOADING (DETAILS)

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Fetch failed:", url, error);
    throw error;
  }
}

async function fetchPokemon(url) {
  const pokemon = await fetchJson(url);

  pokemon.typeIcons = await loadIcons(pokemon.types);

  return pokemon;
}

async function getPokemon(identifier) {
  const pokemon = loadedPokemon.find(
    (poke) =>
      poke.id === Number(identifier) ||
      poke.name === String(identifier).toLowerCase(),
  );

  if (pokemon) return pokemon;

  const newPokemon = await fetchPokemon(`${BASE_URL}${identifier}`);

  loadedPokemon.push(newPokemon);
  loadedPokemon.sort((pokemonA, pokemonB) => pokemonA.id - pokemonB.id);

  return newPokemon;
}

async function ensurePokemonDetails(pokemon) {
  if (pokemon.detailLoaded) return;

  const speciesData = await fetchJson(pokemon.species.url);

  pokemon.flavorText = extractFlavorText(speciesData);
  pokemon.evolutionChain = await fetchEvolutionChain(
    speciesData.evolution_chain.url,
  );
  pokemon.formsList = await fetchPokemonForms(speciesData.varieties);

  pokemon.detailLoaded = true;
}

async function fetchPokemonForms(varieties) {
  if (!varieties || varieties.length <= 1) return [];
  return Promise.all(varieties.map(fetchPokemonForm));
}

async function fetchPokemonForm(varietiy) {
  const pokemon = await getPokemon(varietiy.pokemon.name);

  return {
    name: varietiy.pokemon.name,
    image: pokemon.sprites.front_default,
  };
}

//  EVOLUTION CHAIN PARSING

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
  const pokemon = await getPokemon(step.species.name);

  evolutionList.push({
    name: pokemon.name,
    image: pokemon.sprites.front_default,
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
  let typeData = await fetchJson(typeUrl);

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
  const dialog = document.getElementById("pokemon_dialog");
  showLoadingSpinner();

  try {
    const pokemon = await getPokemon(pokemonId);
    await ensurePokemonDetails(pokemon);
    await preloadImage(pokemon.sprites.other.home.front_default);
    renderPokemonModal(pokemon, dialog);
  } catch (error) {
    console.error("Error loading Pokemon:", error);
  } finally {
    hideLoadingSpinner();
  }
}

function renderPokemonModal(pokemon, dialog) {
  const modalBody = document.getElementById("pokemon_dialog");
  const newHTML = createPokemonDialogHTML(pokemon);

  modalBody.innerHTML = newHTML;

  if (!dialog.open) dialog.showModal();
}

async function preloadImage(url) {
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
  } catch (error) {
    console.warn("Image preload failed:", url, error);
  }
}

function closeModal() {
  let dialog = document.getElementById("pokemon_dialog");
  dialog.close();
}

async function renderDetailTab(pokemonId, clickedButton, template) {
  const pokemon = await getPokemon(pokemonId);
  setActiveTab(clickedButton);

  const html = template(pokemon);
  document.getElementById("dialog_detail_container").innerHTML = html;
}

function setActiveTab(clickedButton) {
  const tabButtons = document.querySelectorAll(".dialog-navbar button");

  tabButtons.forEach((button) => {
    button.classList.remove("active");
    button.setAttribute("aria-selected", "false");
  });

  if (clickedButton) {
    clickedButton.classList.add("active");
    clickedButton.setAttribute("aria-selected", "true");
  }
}

async function showDetails(pokemonId, clickedButton) {
  await renderDetailTab(pokemonId, clickedButton, getDetailsHTML);
}

async function showStats(pokemonId, clickedButton) {
  await renderDetailTab(pokemonId, clickedButton, getStatsHTML);
}

async function showCall(pokemonId, clickedButton) {
  await renderDetailTab(pokemonId, clickedButton, getCallHTML);
}

async function showForms(pokemonId, clickedButton) {
  const pokemon = await getPokemon(pokemonId);
  await ensurePokemonDetails(pokemon);

  setActiveTab(clickedButton);

  document.getElementById("dialog_detail_container").innerHTML =
    getFormsHTML(pokemon);
}

//  NAVIGATION, CACHING & SEARCH HELPERS

async function navigatePokemon(currentId, direction) {
  let targetId = getTargetPokemonId(currentId, direction);
  await openPokemonModal(targetId);
}

function getTargetPokemonId(currentId, direction) {
  return Math.max(1, currentId + direction);
}

async function openPokemonEvolution(pokemonName) {
  const pokemon = await getPokemon(pokemonName);
  await openPokemonModal(pokemon.id);
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

async function handleSearch(event) {
  if (event) event.preventDefault();
  let query = getSearchQuery();
  if (query.length < 3) return showSearchError();
  await executeSearch(query);
}

async function executeSearch(query) {
  showLoadingSpinner();
  try {
    let allPokemon = await fetchAllPokemonNames();
    let matches = allPokemon.filter((poke) => poke.name.includes(query));
    await renderSearchResults(matches);
  } catch (error) {
    console.error("Search failed", error);
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

  cardGrid.innerHTML = `<p class="no-results" data-id="not-found">No Pokémon found.</p>`;
}

function prepareSearchView() {
  setSearchActiveState(true, "Back");
  clearPokemonList();
}

function clearPokemonList() {
  document.querySelector(".card-grid").innerHTML = "";
}

async function fetchSearchPokemon(matches) {
  return Promise.all(matches.map((match) => getPokemon(match.name)));
}

function displaySearchPokemon(pokemonData) {
  displayPokemonCards(pokemonData);
}

function showSearchError() {
  const cardGrid = document.querySelector(".card-grid");

  cardGrid.innerHTML = `<p class="no-results">Please enter at least 3 characters.</p>`;
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

window.addEventListener("scroll", updateScrollVisibility);
document.addEventListener("focusin", updateScrollVisibility);
document.addEventListener("focusout", updateScrollVisibility);
