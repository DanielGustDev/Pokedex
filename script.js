// @ts-nocheck

const BASE_URL = "https://pokeapi.co/api/v2/pokemon/";
let currentOffset = 0;
let currentLimit = 20;

async function loadData() {
  let url = `${BASE_URL}?limit=${currentLimit}&offset=${currentOffset}`;
  let response = await fetch(url);
  let data = await response.json();

  await renderPokemonList(data.results);

  currentOffset += currentLimit;
  currentLimit = 10;
}

async function renderPokemonList(pokemonList) {
  let cardGrid = document.querySelector(".card-grid");

  for (let i = 0; i < pokemonList.length; i++) {
    let pokemonData = await fetchPokemonDetails(pokemonList[i].url);
    cardGrid.innerHTML += createPokemonCardHTML(pokemonData);
  }
}

async function fetchPokemonDetails(url) {
  let response = await fetch(url);
  let pokemon = await response.json();

  pokemon.typeIcons = await loadIcons(pokemon.types);

  let speciesData = await fetchPokemonSpecies(pokemon.species.url);
  pokemon.flavorText = extractFlavorText(speciesData);

  return pokemon;
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

async function fetchPokemonSpecies(speciesUrl) {
  let response = await fetch(speciesUrl);
  return await response.json();
}

function extractFlavorText(speciesData) {
  let rawText =
    speciesData.flavor_text_entries?.[0]?.flavor_text ||
    "No Pokedédex entry found.";
  return rawText.replace(/[\n\f]/g, " ");
}

function loadMorePokemon() {
  loadData();
}

function openPokemonModal(poke) {
  let dialog = document.getElementById("pokemon_dialog");
  let modalBody = document.getElementById("modal_body");

  modalBody.innerHTML = createPokemonDetailHTML(poke);

  dialog.showModal();
}

function closeModal() {
  let dialog = document.getElementById("pokemon_dialog");
  dialog.close();
}
