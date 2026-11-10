# Pokémon Pokédex

An interactive Pokémon Pokédex built with HTML, CSS and Vanilla JavaScript, using the [PokéAPI](https://pokeapi.co/) to retrieve and display Pokémon data.

## About the Project

This project was built to deepen my understanding of JavaScript and gain practical experience working with external APIs, asynchronous operations and advanced DOM manipulation.

The Pokédex allows users to browse Pokémon, search for specific Pokémon, explore detailed information, view evolution chains and navigate between Pokémon in an interactive modal.

## Project Structure

```text
.
Quiz-App/
├── assets/
│   ├── fonts/         # Custom typography webfonts
│   └── icons/         # Custom SVG vector icons
├── scripts/
│   └── templates.js   # Reusable HTML template literal functions
├── styles/
│   ├── assets.css     # asset styling definitions
│   ├── fonts.css      # @font-face declarations
│   ├── standards.css  # CSS Reset, base tags, utility classes
│   └── variables.css  # Root color palette, spacing, typography variables
├── index.html         # Main application landing page
├── script.js          # Core app controller, DOM manipulation, API logic
└── style.css          # Main stylesheet
```

## Features

- **Pokémon Overview:** Browse Pokémon with dynamically generated cards.
- **REST API Integration:** Fetch Pokémon data and additional information directly from the PokéAPI.
- **Search Functionality:** Search for Pokémon by name.
- **Dynamic Modal:** Display detailed Pokémon information without leaving the page.
- **Evolution Chains:** Explore Pokémon evolutions.
- **Detailed Information:** View Pokémon types, height, weight, base stats, cries and alternative forms.
- **Navigation:** Navigate between Pokémon directly within the modal.
- **Load More:** Dynamically load additional Pokémon.
- **Caching:** Store previously fetched Pokémon data to reduce unnecessary API requests.
- **Loading Indicators:** Provide visual feedback during asynchronous operations.
- **Scroll to Top:** Convenient navigation through longer lists.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- REST API – PokéAPI

## Key Learning Outcomes

One of the main goals of this project was to improve my JavaScript skills beyond basic DOM manipulation.

### API Integration & Asynchronous JavaScript

- Working with external REST APIs using the Fetch API.
- Processing JSON responses and handling API data.
- Understanding and implementing `async` / `await` and Promises.
- Using `Promise.all()` to handle multiple asynchronous requests.
- Implementing caching to avoid unnecessary API calls.
- Managing loading states and asynchronous rendering.

### Advanced DOM Manipulation

- Dynamically generating HTML elements using JavaScript template literals.
- Rendering and updating complex UI components.
- Manipulating DOM elements using methods such as `innerHTML`, `insertAdjacentHTML()` and `classList`.
- Managing interactive modals and dynamically generated navigation tabs.
- Implementing event listeners for user interactions.
- Preloading and decoding images to improve the user experience and reduce visual flickering.

### Code Structure & Problem Solving

- Breaking down functionality into reusable functions.
- Separating data fetching, data processing and UI rendering.
- Working with arrays, objects, callbacks and higher-order functions.
- Implementing conditional rendering and application state management.

## What I Learned

Building this project gave me valuable hands-on experience with JavaScript in a practical application.

In particular, I gained a much better understanding of how external APIs work, how asynchronous data flows through an application and how JavaScript can be used to dynamically create and manage complex user interfaces.

The project also helped me improve my ability to structure code into smaller, reusable functions and understand how different parts of an application work together.

## API Reference

Data provided by [PokéAPI](https://pokeapi.co/).

## Author

Built as a personal learning project to strengthen my skills in JavaScript, API integration and advanced DOM manipulation.
