Checklist
## Tasks

## Note: 
All functionality must be implemented in a single HTML file (`index.html`). CSS should not be embedded in the html file, instead it should be placed in a separate `basestyle.css` file. Theme should be light `themes\lightstyle.css` and dark `themes\darkstyle.css`, with a button using JavaScript `main.js` to toggle between them. Most of the functionality will rely on JavaScript for dynamic behavior, and some base code for each file has been provided, however the css basestyle has incorrect naming for classes in the html file, so correct the css class naming to reflect the HTML structure. Consider the rubric when making changes and implement the core requirements.

### Core Requirements
- [] **Write documentation** - Inline "How to use" in `index.html` (details/summary). This is a single-file app; just open `index.html`.
- [] **Create a registration form** (HTML/CSS) - First/Last Name, Email, Programme, Year, Interests, Photo URL included with labels and a11y.
- [] **Implement form validation** (JavaScript) - Required checks, email format + unique, year/programme selection, URL check, inline errors via aria-live.
- [] **Set up database schema** (Database/Backend) - Using browser localStorage due to single-file constraint: key `students` stores an array of objects with fields { id, firstName, lastName, email, programme, yearOfStudy, interests, photoUrl, registrationDate }.
- [] **Store user data in a database** (Backend/JavaScript) - Persisted to localStorage; auto-seeded sample data on first load.
- [] **On submit, display a confirmation message** (JavaScript) - Success banner with personalized message; creates/updates profile card and table row.
- [] **Create a profile card** (HTML/CSS/JavaScript) - Card grid with avatar, programme/year pills, interests and Edit/Delete.
- [] **Create a summary table** (HTML/CSS/JavaScript) - Full table with sticky header and action buttons.
- [] **Implement edit and delete functionality** (JavaScript) - Edit fills form and toggles button to Update; delete confirms and syncs card/table/storage.
- [] **Style the form, profile card, and summary table** (CSS) - Responsive, dark theme, focus rings, hover states, sticky header.
- [] **Test the entire workflow** (JavaScript/HTML) - Basic manual test paths implemented; sample data provided to explore UI quickly.
- [] **Review and optimize code** (HTML/CSS/JavaScript) - Clean, commented, semantic markup; no external libs.
- [ ] **Deploy the application** (HTML/CSS/JavaScript) - Optional: host on GitHub Pages or similar.

### Optional Enhancements
- [ ] **Persist data across sessions** - Uses localStorage.
- [ ] **Implement search and filter functionality** - Header search filters both cards and table.
- [ ] **Add pagination to the summary table** - Not implemented.

### Grading Rubric

| Criterion | Marks | Requirements |
|-----------|-------|-------------|
| **Form completeness + accessibility** | 6 | Labels, correct input types, responsive design, accessibility checks |
| **Validation & error handling** | 6 | Inline messages, prevents invalid submits, aria-live regions |
| **Profile card creation** | 8 | Dynamic DOM generation, includes remove button functionality |
| **Summary table integration** | 6 | Accurate updates synchronized with form submissions and removals |
| **Code quality** | 4 | Semantic HTML, clean CSS, readable JavaScript, comprehensive comments |

**Total:** 30 marks