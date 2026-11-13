// @ts-nocheck

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 30;
let loadedPokemon = [];
const globalCache = {};
let isSearchActive = false;
let currentSearchResults = [];

// --- UNIVERSAL FETCH & CACHE ---

async function fetchJson(url) {
  if (globalCache[url]) return await globalCache[url];
  globalCache[url] = fetchJsonRaw(url);
  return await globalCache[url];
}

async function fetchJsonRaw(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Fetch failed:", url, error);
    throw error;
  }
}

// --- INITIAL LOADING & LIST RENDERING ---

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
  if (loadButton) setLoadButtonState(loadButton, true);
  try {
    await loadData();
  } finally {
    if (loadButton) setLoadButtonState(loadButton, false);
  }
}

function setLoadButtonState(loadButton, loading) {
  loadButton.disabled = loading;
  loadButton.innerText = loading ? "Loading..." : "Load More";
}

function changeLimit(newLimit) {
  currentLimit = Number(newLimit);
}

// --- API FETCHING & LAZY LOADING (DETAILS) ---

async function fetchPokemon(url) {
  const pokemon = await fetchJson(url);
  pokemon.typeIcons = await loadIcons(pokemon.types);
  return pokemon;
}

async function getPokemon(identifier) {
  const pokemon = loadedPokemon.find(
    (existingPokemon) =>
      existingPokemon.id === Number(identifier) ||
      existingPokemon.name === String(identifier).toLowerCase(),
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

async function fetchPokemonForm(variety) {
  const pokemon = await getPokemon(variety.pokemon.name);
  return {
    name: variety.pokemon.name,
    image: pokemon.sprites.front_default,
  };
}

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

// --- MODAL & UI INTERACTION ---

async function openPokemonModal(pokemonId) {
  const dialog = document.getElementById("pokemon_dialog");
  showLoadingSpinner();
  try {
    const pokemon = await getPokemon(pokemonId);
    await ensurePokemonDetails(pokemon);

    const imageUrl = getPokemonImage(pokemon);
    if (imageUrl) await preloadImage(imageUrl);

    renderPokemonModal(pokemon, dialog);
  } finally {
    hideLoadingSpinner();
  }
}

function renderPokemonModal(pokemon, dialog) {
  const modalBody = document.getElementById("pokemon_dialog");
  const preparedData = preparePokemonDialogData(pokemon);
  modalBody.innerHTML = createPokemonDialogHTML(preparedData);
  updateModalNavigationButtons(pokemon, modalBody);
  if (!dialog.open) dialog.showModal();
}

function updateModalNavigationButtons(pokemon, modalBody) {
  const leftButton = modalBody.querySelector(".left-button");
  const rightButton = modalBody.querySelector(".right-button");
  if (isSearchActive && currentSearchResults.length > 0) {
    updateSearchNavButtons(pokemon, leftButton, rightButton);
  } else {
    updateStandardNavButtons(pokemon, leftButton, rightButton);
  }
}

function updateSearchNavButtons(pokemon, leftButton, rightButton) {
  let index = findSearchIndex(pokemon.id);

  if (leftButton) leftButton.disabled = index <= 0;
  if (rightButton)
    rightButton.disabled = index >= currentSearchResults.length - 1;
}

function updateStandardNavButtons(pokemon, leftButton, rightButton) {
  if (leftButton) leftButton.disabled = pokemon.id <= 1;
  if (rightButton) rightButton.disabled = false;
}

function getPokemonImage(poke) {
  return (
    poke.sprites?.other?.["home"]?.front_default ||
    poke.sprites?.front_default ||
    "path/to/placeholder.png"
  );
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
  document.getElementById("pokemon_dialog").close();
}

function showDetails(pokemonId, buttonElement) {
  setActiveTab(buttonElement);
  let poke = loadedPokemon.find(
    (existingPokemon) => existingPokemon.id === pokemonId,
  );
  document.getElementById("dialog_detail_container").innerHTML = getDetailsHTML(
    {
      typeNames: renderTypeNames(poke.typeIcons),
      height: convertToMeters(poke.height),
      weight: convertToKg(poke.weight),
    },
  );
}

function showStats(pokemonId, buttonElement) {
  setActiveTab(buttonElement);
  let poke = loadedPokemon.find(
    (existingPokemon) => existingPokemon.id === pokemonId,
  );
  document.getElementById("dialog_detail_container").innerHTML =
    buildStatsHTML(poke);
}

function showCall(pokemonId, buttonElement) {
  setActiveTab(buttonElement);
  let poke = loadedPokemon.find(
    (existingPokemon) => existingPokemon.id === pokemonId,
  );
  document.getElementById("dialog_detail_container").innerHTML =
    buildCallHTML(poke);
}

function showForms(pokemonId, buttonElement) {
  setActiveTab(buttonElement);
  let poke = loadedPokemon.find(
    (existingPokemon) => existingPokemon.id === pokemonId,
  );
  document.getElementById("dialog_detail_container").innerHTML =
    buildFormsHTML(poke);
}

function setActiveTab(buttonElement) {
  document
    .querySelectorAll(".dialog-navbar button")
    .forEach((b) => b.classList.remove("active"));
  buttonElement.classList.add("active");
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

// --- SEARCH FUNCTIONALITY ---

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
    currentSearchResults = allPokemon.filter((poke) =>
      poke.name.includes(query),
    );
    await renderSearchResults(currentSearchResults);
  } finally {
    hideLoadingSpinner();
  }
}

function getSearchQuery() {
  let input = document.querySelector(".pokedex-search");
  return input ? input.value.trim().toLowerCase() : "";
}

async function fetchAllPokemonNames() {
  const { count } = await fetchJson(`${BASE_URL}?limit=1`);
  const { results } = await fetchJson(`${BASE_URL}?limit=${count}`);
  return results;
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
  if (matches.length === 0) return renderNoSearchResults();
  displaySearchPokemon(await fetchSearchPokemon(matches));
}

function renderNoSearchResults() {
  document.querySelector(".card-grid").innerHTML =
    `<p class="no-results" data-id="not-found">No Pokémon found.</p>`;
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
  document.querySelector(".card-grid").innerHTML =
    `<p class="no-results">Please enter at least 3 characters.</p>`;
}

// --- LOGIC & BUILDER FOR TEMPLATES ---

function renderTypeIcons(typeIcons) {
  if (!typeIcons) return "";
  return typeIcons.map((type) => createTypeIconHTML(type)).join("");
}

function renderEvolutionChain(evolutionChain) {
  if (!evolutionChain || evolutionChain.length <= 1) return "";
  let buttonsHTML = evolutionChain
    .map((evo) => renderEvoButtonHTML(evo))
    .join("");
  return renderEvolutionChainHTML(buttonsHTML);
}

function preparePokemonDialogData(poke) {
  return {
    ...poke,
    primaryType: poke.types[0].type.name,
    image: getPokemonImage(poke),
    evolutionHTML: renderEvolutionChain(poke.evolutionChain),
    detailsHTML: getDetailsHTML({
      typeNames: renderTypeNames(poke.typeIcons),
      height: convertToMeters(poke.height),
      weight: convertToKg(poke.weight),
    }),
  };
}

function buildStatsHTML(poke) {
  let statsRows = poke.stats
    .map(
      (stat) =>
        `<tr><th>${stat.stat.name.toUpperCase()}:</th><td>${stat.base_stat}</td></tr>`,
    )
    .join("");
  return getStatsHTML(statsRows);
}

function buildCallHTML(poke) {
  let cryUrl = poke.cries?.latest || "";
  let audioHTML = cryUrl
    ? `<audio controls src="${cryUrl}"></audio>`
    : "<p>No Call known</p>";
  return getCallHTML(audioHTML);
}

function buildFormsHTML(poke) {
  if (!poke.formsList || poke.formsList.length <= 1) {
    return `<div class="dialog-details no-forms"><p>No alternative forms known.</p></div>`;
  }
  let buttonsHTML = poke.formsList
    .map((form) => renderEvoButtonHTML(form))
    .join("");
  return getFormsHTML(buttonsHTML);
}

// --- EVENT LISTENER & INITIALIZATION ---

init();

function init() {
  initEventListeners();
  loadData();
}

function initEventListeners() {
  initSearchListeners();
  initGlobalUIListeners();
}

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
