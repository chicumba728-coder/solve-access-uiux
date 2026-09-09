/**
 * Solve Acess — Main Application Entrypoint
 * Boots up UI listeners, Icons and Hash Router
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize UI components (Modals, Drawers, Dropdowns, Sidebar Toggles)
  UI.init();

  // 2. Initialize Hash-based Router
  Router.init();

  console.log('Solve Acess frontend initialized with pure HTML5, CSS3, and Vanilla JavaScript.');
});
