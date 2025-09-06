## Overview

This is a simple web app. You can add students, see them as cards and in a table, search, edit, and delete. Your data is saved in your browser (localStorage). The code is split into small files to keep it easy to read.

## Project structure

- `index.html` — the only HTML page
- `styles/` — all CSS
	- `basestyle.css` — collects (imports) all other CSS files
	- `themes/` — light and dark theme files
	- `base/` — color variables and global rules
	- `utilities/` — small helpers (a11y, icons, text, effects)
	- `layout/` — page and container layout
	- `components/` — styles for header, search, forms, buttons, cards, table, modal, etc.
	- `responsive.css` — mobile tweaks
- `scripts/`
	- `modules/` — small JS files loaded with `<script defer>`
		- `utils.js` — tiny helpers (DOM, debounce, make IDs, escape text, etc.)
		- `storage.js` — read and save students to localStorage
		- `theme.js` — set dark/light mode
		- `render.js` — draw cards and the table, filter list
		- `controller.js` — hook up events (form, search, edit/delete, theme)
	- `main.js` — old single file (not used now)
- `storage/users.json` — example data (the app does not read this file)
- `icons/`, `images/`, `gif/` — pictures and icons

## Styling (CSS)

- Change colors in `styles/base/variables.css` or in the theme files in `styles/themes/`.
- Adding a new component? Put CSS in `styles/components/` and add an `@import` line in `styles/basestyle.css`.

## Scripts (JS)

- All modules share one object: `window.App`. Each file adds things to it.
- Scripts load in this order (already set in `index.html`): utils → storage → theme → render → controller.
- To add your own module, create `scripts/modules/your-module.js`, add to `index.html` before `controller.js`, and attach to `window.App`.

Example:

```html
<script src="scripts/modules/utils.js" defer></script>
<script src="scripts/modules/storage.js" defer></script>
<script src="scripts/modules/theme.js" defer></script>
<script src="scripts/modules/render.js" defer></script>
<script src="scripts/modules/controller.js" defer></script>
```

```js
// scripts/modules/example.js
(() => {
	const App = (window.App = window.App || {});
	App.example = { hello: () => console.log('hi') };
})();
```

## Data model

We save students in `localStorage` with the key `students`.

Each student has:

- `id` (string)
- `firstName`, `lastName`, `email`
- `programme` (string)
- `yearOfStudy` (string)
- `interests` (string)
- `photoUrl` (link that starts with http or https)
- `registrationDate` (ISO string)

We also save the theme in `localStorage` under the key `theme` with values `dark` or `light`.

## How to run

- Just open `index.html` in your browser.

PowerShell (optional):

```powershell
start .\index.html
```

## Accessibility

- The custom dropdown works with keyboard and screen readers. We keep the native `<select>` for form posts and SRs.
- The search box shows suggestions and supports arrow keys and Enter.
- Use the `.sr` class for text that should be read by screen readers but hidden visually.

## Extending

- New styles: add a file in `styles/components/` and import it in `styles/basestyle.css`.
- New logic: add a JS file in `scripts/modules/` and include it in `index.html` (before `controller.js` if it’s needed there).
- Reuse helpers from `App.utils` and storage from `App.storage`.