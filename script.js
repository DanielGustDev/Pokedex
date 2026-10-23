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
  return await response.json();
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
