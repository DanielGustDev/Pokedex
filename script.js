// @ts-nocheck

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

function init() {
  initEventListeners();
  loadData();
}

function initEventListeners() {
  initSearchListeners();
  initGlobalUIListeners();
}

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
    let index = findSearchIndex(pokemon.id);
    index === -1
      ? ((leftButton.style.display = "none"),
        (rightButton.style.display = "none"))
      : updateSearchNavButtons(pokemon, leftButton, rightButton);
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
