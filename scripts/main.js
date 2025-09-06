(() => {
    // Keys
    const LS_KEY = 'students';
    const THEME_KEY = 'theme';

    // DOM helpers
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    // CSS.escape polyfill
    if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
        (function(){
            const cssEscape = function(value) {
                if (arguments.length === 0) {
                    throw new TypeError('`CSS.escape` requires an argument.');
                }
                var string = String(value);
                var length = string.length;
                var index = -1;
                var codeUnit;
                var result = '';
                var firstCodeUnit = string.charCodeAt(0);
                while (++index < length) {
                    codeUnit = string.charCodeAt(index);
                    // Note: there’s no need to special-case astral symbols, surrogate
                    // pairs, or lone surrogates.
                    if (codeUnit == 0x0000) {
                        result += '\uFFFD';
                        continue;
                    }
                    if (
                        (codeUnit >= 0x0001 && codeUnit <= 0x001F) ||
                        codeUnit == 0x007F ||
                        (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                        (index == 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit == 0x002D)
                    ) {
                        result += '\\' + codeUnit.toString(16) + ' ';
                        continue;
                    }
                    if (
                        codeUnit >= 0x0080 ||
                        codeUnit == 0x002D ||
                        codeUnit == 0x005F ||
                        (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                        (codeUnit >= 0x0041 && codeUnit <= 0x005A) ||
                        (codeUnit >= 0x0061 && codeUnit <= 0x007A)
                    ) {
                        result += string.charAt(index);
                        continue;
                    }
                    result += '\\' + string.charAt(index);
                }
                return result;
            };
            if (typeof window.CSS === 'undefined') window.CSS = {};
            window.CSS.escape = cssEscape;
        })();
    }

    // Small debounce utility for input smoothing
    function debounce(fn, wait = 120) {
        let t;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // ID generator safe for non-secure contexts (mobile HTTP)
    function genId() {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        } catch {}
        // Fallback: time + random
        return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    // Avatars: inline SVG fallbacks (theme-aligned)
    const phSm = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" rx="18" fill="#111a2a"/><circle cx="12" cy="14" r="5" fill="#2b4366"/><rect x="6" y="22" width="24" height="8" rx="4" fill="#2b4366"/></svg>');
    const phLg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" rx="30" fill="#f2eadf"/><circle cx="20" cy="24" r="8" fill="#a88f6c"/><rect x="10" y="36" width="40" height="12" rx="6" fill="#a88f6c"/></svg>');

    // Escape and URL guards
    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ESC[ch]);
    const safeUrl = (u) => {
        const v = String(u || '').trim();
        if (!/^https?:\/\//i.test(v)) return '';
        if (/["'<>]/.test(v)) return '';
        return v;
    };
    function wireAvatarFallbacks(root = document) {
        $$('.avatar', root).forEach(img => {
            img.onerror = () => {
                img.onerror = null;
                img.src = img.classList.contains('avatar-sm') ? phSm : phLg;
            };
        });
    }

    // Storage
    function loadStudents() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }
    function saveStudents(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

    // Simple Node API client (Mongo-backed). Falls back to local if unavailable.
    const API_URL = (window.API_BASE || '/api/students');
    async function apiLoad() {
        try {
            const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch { return null; }
    }
    async function apiUpsert(student) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upsert', payload: student })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch { return null; }
    }
    async function apiDelete(id) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', payload: { id } })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch { return null; }
    }

    // Theme
    function applyTheme(t) {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(t);
        const btn = $('#themeToggle');
        if (btn) {
            btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
            const img = btn.querySelector('img');
            if (img) img.src = t === 'dark' ? 'icons/moon.svg' : 'icons/sun.svg';
        }
    }
    function initTheme() {
        let t = localStorage.getItem(THEME_KEY);
        if (!t) t = 'dark';
        applyTheme(t);
    }

    // Validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function setError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg || ''; }
    function clearErrors() { ['firstName', 'lastName', 'email', 'programme', 'yearOfStudy', 'photoUrl'].forEach(f => setError('err-' + f, '')); }
    function validate(form, students, editingId) {
        clearErrors();
        let ok = true; const live = $('#live');
        const get = id => form.querySelector('#' + id);
        const firstName = get('firstName').value.trim();
        const lastName = get('lastName').value.trim();
        const email = get('email').value.trim();
        const programme = get('programme').value;
        const yearOfStudy = get('yearOfStudy').value;
        const photoUrl = get('photoUrl').value.trim();

        if (!firstName) { setError('err-firstName', 'First name is required.'); ok = false; }
        if (!lastName) { setError('err-lastName', 'Last name is required.'); ok = false; }
        if (!email) { setError('err-email', 'Email is required.'); ok = false; }
        else if (!emailRe.test(email)) { setError('err-email', 'Enter a valid email.'); ok = false; }
        else {
            const dup = students.some(s => s.email.toLowerCase() === email.toLowerCase() && s.id !== editingId);
            if (dup) { setError('err-email', 'Email must be unique.'); ok = false; }
        }
        if (!programme) { setError('err-programme', 'Choose a programme.'); ok = false; }
        if (!yearOfStudy) { setError('err-yearOfStudy', 'Choose a year.'); ok = false; }
        if (photoUrl && !/^https?:\/\//i.test(photoUrl)) { setError('err-photoUrl', 'Provide a valid URL starting with http(s) or leave blank.'); ok = false; }

        if (!ok) { if (live) live.textContent = 'Fix errors before submitting.'; }
        return ok;
    }

    // Rendering
    function trStudent(s) {
        const interests = esc(s.interests || '');
        const date = new Date(s.registrationDate).toLocaleDateString();
        const photo = safeUrl(s.photoUrl) || phSm;
        return `<tr data-id="${esc(s.id)}">
            <td data-label="Photo"><img class="avatar avatar-sm" src="${photo}" alt=""/></td>
            <td data-label="Name">${esc(s.firstName)} ${esc(s.lastName)}</td>
            <td data-label="Email">${esc(s.email)}</td>
            <td data-label="Programme">${esc(s.programme)}</td>
            <td data-label="Year">${esc(s.yearOfStudy)}</td>
            <td data-label="Interests">${interests}</td>
            <td data-label="Date">${esc(date)}</td>
            <td data-label="Actions">
                <button class="btn btn-secondary action-edit" type="button" aria-label="Edit">
                    <img src="icons/edit-profile.svg" class="icon" alt="" aria-hidden="true" />
                    <span class="sr">Edit</span>
                </button>
                <button class="btn btn-danger action-delete" type="button" aria-label="Delete">
                    <img src="icons/trash.svg" class="icon" alt="" aria-hidden="true" />
                    <span class="sr">Delete</span>
                </button>
            </td>
        </tr>`;
    }
    function cardStudent(s) {
        const photo = safeUrl(s.photoUrl) || phLg;
        return `<article class="card" data-id="${esc(s.id)}" aria-label="${esc(s.firstName)} ${esc(s.lastName)}">
            <div class="card-head">
                <img class="avatar" src="${photo}" alt=""/>
                <div>
                    <h3 class="title">${esc(s.firstName)} ${esc(s.lastName)}</h3>
                    <p class="muted">${esc(s.email)}</p>
                </div>
            </div>
            <div class="card-body">
                <span class="pill">${esc(s.programme)}</span>
                <span class="pill">Year ${esc(s.yearOfStudy)}</span>
            </div>
            <p class="muted">${esc(s.interests || '')}</p>
            <div class="card-actions">
                <button class="btn btn-secondary action-edit" type="button" aria-label="Edit">
                    <img src="icons/edit-profile.svg" class="icon" alt="" aria-hidden="true" />
                    <span class="sr">Edit</span>
                </button>
                <button class="btn btn-danger action-delete" type="button" aria-label="Delete">
                    <img src="icons/trash.svg" class="icon" alt="" aria-hidden="true" />
                    <span class="sr">Delete</span>
                </button>
            </div>
        </article>`;
    }
    function render(list) {
        const tbody = $('#summary tbody');
        const cards = $('#cards');
        const count = $('#studentCount');
        if (!list.length) {
            tbody.innerHTML = `<tr class="empty"><td colspan="8">
                <div class="table-empty">
                        <img class="empty-gif" src="gif/dogrunning.gif" alt="Nothing here yet" onerror="this.style.display='none'"/>
                    <div class="empty-text">No students yet. Add one above.</div>
                </div>
            </td></tr>`;
        } else {
            tbody.innerHTML = list.map(trStudent).join('');
        }
        cards.innerHTML = list.map(cardStudent).join('');
        wireAvatarFallbacks(document);
        if (count) count.textContent = String(list.length);
    }

    function upsert(students, payload) {
        const idx = students.findIndex(s => s.id === payload.id);
        if (idx >= 0) students[idx] = payload; else students.unshift(payload);
        saveStudents(students);
        return students;
    }
    function removeById(students, id) {
        const next = students.filter(s => s.id !== id);
        saveStudents(next);
        return next;
    }

    // Filter
    function applyFilter(list, q) {
        q = q.trim().toLowerCase();
        if (!q) return list;
        return list.filter(s => [s.firstName, s.lastName, s.email, s.programme, s.yearOfStudy, s.interests]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q))
        );
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        const yearNowEl = document.getElementById('yearNow');
        if (yearNowEl) yearNowEl.textContent = String(new Date().getFullYear());

        let students = loadStudents();
        let editingId = null;
        render(students);

        // Try to hydrate from server if available
        (async () => {
            const remote = await apiLoad();
            if (Array.isArray(remote)) {
                students = remote;
                saveStudents(students);
                render(applyFilter(students, document.getElementById('search')?.value || ''));
            }
        })();

    const form = document.getElementById('regForm');
        const submitBtn = document.getElementById('submitBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const success = document.getElementById('success');
        const successText = document.getElementById('successText');

    // JSON seed/sync removed.

        // Live email validation
        form.addEventListener('input', (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const id = t.id;
            if (id === 'email') {
                const v = t.value.trim();
                if (!v) setError('err-email', '');
                else if (!emailRe.test(v)) setError('err-email', 'Enter a valid email.');
                else setError('err-email', '');
            }
        });

        function formData() {
            const data = new FormData(form);
            return {
                id: editingId || genId(),
                firstName: String(data.get('firstName') || '').toString().trim(),
                lastName: String(data.get('lastName') || '').toString().trim(),
                email: String(data.get('email') || '').toString().trim(),
                programme: String(data.get('programme') || ''),
                yearOfStudy: String(data.get('yearOfStudy') || ''),
                interests: String(data.get('interests') || '').toString().trim(),
                photoUrl: String(data.get('photoUrl') || '').toString().trim(),
                registrationDate: editingId ? students.find(s => s.id === editingId)?.registrationDate || new Date().toISOString() : new Date().toISOString(),
            };
        }

        function resetForm() {
            form.reset();
            clearErrors();
            editingId = null;
            cancelEditBtn.hidden = true;
            submitBtn.querySelector('.btn-text').textContent = 'Add Student';
        }

        form.addEventListener('reset', () => {
            clearErrors();
            $('#live').textContent = '';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // If form is disabled (rare on mobile), bail and announce
            if (form.hasAttribute('disabled')) {
                const live = $('#live');
                if (live) live.textContent = 'Form is currently disabled.';
                return;
            }
            const payload = formData();
            if (!validate(form, students, editingId)) return;
            // Optimistic local update
            students = upsert(students, payload);
            // Persist best-effort to server
            const resp = await apiUpsert(payload);
            if (resp && resp.ok && resp.student) {
                students = upsert(students, resp.student);
            }
            const q = $('#search').value || '';
            render(applyFilter(students, q));
            if (success) {
                success.style.display = 'block';
                successText.textContent = editingId ? `Updated ${payload.firstName} ${payload.lastName}.` : `Added ${payload.firstName} ${payload.lastName}.`;
                setTimeout(() => success.style.display = 'none', 1600);
            }
            $('#live').textContent = editingId ? 'Student updated.' : 'Student added.';
            resetForm();
        });

        cancelEditBtn.addEventListener('click', resetForm);

        // Enhance dropdowns: convert native selects into accessible custom listboxes, while keeping the native select (screen-reader + form submission)
        function enhanceSelect(sel) {
            if (!sel || sel.dataset.enhanced) return;
            sel.dataset.enhanced = '1';
            // Wrapper
            const wrap = document.createElement('div');
            wrap.className = 'select';
            sel.parentNode.insertBefore(wrap, sel);
            wrap.appendChild(sel);
            sel.classList.add('sr'); // visually hide
            sel.setAttribute('aria-hidden', 'true');
            sel.tabIndex = -1; // remove from tab order; button becomes the control

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'select-trigger';
            btn.setAttribute('aria-haspopup', 'listbox');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = `<span class="select-text"></span>`;
            const arrow = document.createElement('span');
            arrow.className = 'select-arrow';
            arrow.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
            `;
            wrap.appendChild(btn);
            wrap.appendChild(arrow);

            const list = document.createElement('div');
            list.className = 'select-list';
            list.setAttribute('role', 'listbox');
            list.id = sel.id ? sel.id + '-list' : ('list-' + Math.random().toString(36).slice(2,8));
            list.tabIndex = -1;
            wrap.appendChild(list);
            btn.setAttribute('aria-controls', list.id);

            function buildOptions() {
                list.innerHTML = '';
                Array.from(sel.options).forEach((opt, idx) => {
                    const el = document.createElement('div');
                    el.className = 'select-option';
                    el.setAttribute('role', 'option');
                    el.setAttribute('data-value', opt.value);
                    el.tabIndex = -1;
                    if (opt.disabled) el.setAttribute('aria-disabled', 'true');
                    if (opt.selected) el.setAttribute('aria-selected', 'true');
                    el.textContent = opt.textContent;
                    list.appendChild(el);
                });
            }

            function labelFor(value) {
                const o = Array.from(sel.options).find(o => o.value === value);
                return o ? o.textContent : '';
            }

            function syncFromSelect() {
                const value = sel.value;
                const text = labelFor(value) || sel.getAttribute('data-placeholder') || sel.querySelector('option[disabled]')?.textContent || '';
                const textSpan = btn.querySelector('.select-text');
                textSpan.textContent = text;
                if (!value) textSpan.classList.add('select-placeholder'); else textSpan.classList.remove('select-placeholder');
                Array.from(list.querySelectorAll('.select-option')).forEach(el => {
                    el.setAttribute('aria-selected', el.getAttribute('data-value') === value ? 'true' : 'false');
                });
            }

        function setOpen(open) {
                wrap.classList.toggle('open', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (open) {
                    // focus selected or first
            const current = list.querySelector('.select-option[aria-selected="true"]') || list.querySelector('.select-option');
            current && current.scrollIntoView({ block: 'nearest' });
            setTimeout(() => { (current || list).focus(); }, 0);
                }
            }

            function commitValue(value) {
                if (sel.value !== value) {
                    sel.value = value;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
                syncFromSelect();
                setOpen(false);
                btn.focus();
            }

            btn.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));
            document.addEventListener('click', (e) => {
                if (!wrap.contains(e.target)) setOpen(false);
            });
            list.addEventListener('click', (e) => {
                const item = e.target.closest('.select-option');
                if (!item || item.getAttribute('aria-disabled') === 'true') return;
                commitValue(item.getAttribute('data-value'));
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setOpen(true);
                    const opts = Array.from(list.querySelectorAll('.select-option'));
                    const selIdx = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
                    const next = e.key === 'ArrowDown' ? (selIdx + 1) : (selIdx - 1);
                    const idx = (next + opts.length) % opts.length;
                    opts[idx]?.scrollIntoView({ block: 'nearest' });
                }
            });
            list.addEventListener('keydown', (e) => {
                const opts = Array.from(list.querySelectorAll('.select-option'));
                const selIdx = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const next = e.key === 'ArrowDown' ? (selIdx + 1) : (selIdx - 1);
                    const idx = (next + opts.length) % opts.length;
                    opts[idx]?.focus?.();
                    opts[idx]?.scrollIntoView({ block: 'nearest' });
                    opts.forEach(o => o.setAttribute('aria-selected', 'false'));
                    opts[idx]?.setAttribute('aria-selected', 'true');
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const cur = list.querySelector('.select-option[aria-selected="true"]');
                    if (cur) commitValue(cur.getAttribute('data-value'));
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(false); btn.focus();
                }
            });

            // Build and initial sync
            buildOptions();
            syncFromSelect();
            // Keep in sync if value set programmatically (editing)
            sel.addEventListener('change', syncFromSelect);
        }

        // Enhance the two key selects
        enhanceSelect(document.getElementById('programme'));
        enhanceSelect(document.getElementById('yearOfStudy'));

        // Ensure custom dropdowns reflect reset state
        form.addEventListener('reset', () => {
            setTimeout(() => {
                ['programme', 'yearOfStudy'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }, 0);
        });

        // Delegated actions
        async function handleAction(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const isEdit = btn.classList.contains('action-edit');
            const isDelete = btn.classList.contains('action-delete');
            if (!isEdit && !isDelete) return;
            const row = e.target.closest('[data-id]');
            if (!row) return;
            const id = row.getAttribute('data-id');
            const s = students.find(x => x.id === id);
            if (!s) return;
            if (isEdit) {
                editingId = s.id;
                $('#firstName').value = s.firstName; $('#lastName').value = s.lastName; $('#email').value = s.email;
                $('#programme').value = s.programme; $('#yearOfStudy').value = s.yearOfStudy;
                $('#interests').value = s.interests || ''; $('#photoUrl').value = s.photoUrl || '';
                cancelEditBtn.hidden = false; submitBtn.querySelector('.btn-text').textContent = 'Update Student';
                document.getElementById('regForm').scrollIntoView({ behavior: 'smooth' });
            } else if (isDelete) {
                const ok = confirm(`Delete ${s.firstName} ${s.lastName}?`);
                if (!ok) return;
                const resp = await apiDelete(id);
                if (resp && resp.ok) {
                    students = removeById(students, id);
                } else {
                    students = removeById(students, id);
                }
                const q = $('#search').value || '';
                render(applyFilter(students, q));
                $('#live').textContent = 'Student deleted.';
                if (editingId === id) resetForm();
            }
        }
        $('#cards').addEventListener('click', handleAction);
        $('#summary').addEventListener('click', handleAction);

        // Search
        const search = document.getElementById('search');
        const searchClear = document.getElementById('searchClear');
        const searchResults = document.getElementById('searchResults');

        // ARIA combobox wiring
        if (search && searchResults) {
            search.setAttribute('role', 'combobox');
            search.setAttribute('aria-autocomplete', 'list');
            search.setAttribute('aria-controls', 'searchResults');
            search.setAttribute('aria-expanded', 'false');
        }

        // Selection state
        let selIndex = -1;
        function getActionableItems() {
            return Array.from(searchResults?.querySelectorAll('.search-item[data-id]') || []);
        }
        function updateSelection(newIndex) {
            const items = getActionableItems();
            items.forEach(el => el.setAttribute('aria-selected', 'false'));
            selIndex = -1;
            if (!items.length) return;
            if (newIndex < 0) newIndex = items.length - 1;
            if (newIndex >= items.length) newIndex = 0;
            const el = items[newIndex];
            if (!el) return;
            el.setAttribute('aria-selected', 'true');
            selIndex = newIndex;
            // Associate for a11y
            if (el.id) search.setAttribute('aria-activedescendant', el.id);
            // Ensure visibility in dropdown
            el.scrollIntoView({ block: 'nearest' });
        }
        function clearSelection() {
            getActionableItems().forEach(el => el.setAttribute('aria-selected', 'false'));
            selIndex = -1;
            search.removeAttribute('aria-activedescendant');
        }

        function renderSearchResults(q) {
            if (!searchResults) return;
            q = (q || '').trim();
            if (!q) {
                searchResults.innerHTML = '';
                searchResults.hidden = true;
                search.setAttribute('aria-expanded', 'false');
                return;
            }
            const list = applyFilter(students, q).slice(0, 8);
            if (!list.length) {
                searchResults.innerHTML = '<div class="search-item subtle">No matches</div>';
                searchResults.hidden = false;
                search.setAttribute('aria-expanded', 'true');
                clearSelection();
                return;
            }
            const html = list.map(s => {
                const photo = safeUrl(s.photoUrl) || phSm;
                const optId = `sr-${esc(s.id)}`;
                return `<div class="search-item" role="option" id="${optId}" data-id="${esc(s.id)}" tabindex="0" aria-selected="false">
                    <img class="avatar" src="${photo}" alt="" />
                    <div>
                        <div class="name">${esc(s.firstName)} ${esc(s.lastName)}</div>
                        <div class="subtle">${esc(s.programme)}</div>
                    </div>
                </div>`;
            }).join('');
            searchResults.innerHTML = html;
            searchResults.hidden = false;
            search.setAttribute('aria-expanded', 'true');
            wireAvatarFallbacks(searchResults);
            clearSelection();
        }

        function focusCardById(id) {
            const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
            if (!card) return;
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('ring');
            setTimeout(() => card.classList.remove('ring'), 1000);
        }

        function onPickResult(id) {
            searchResults.hidden = true;
            focusCardById(id);
        }

        function runSearch() {
            // Keep main list filtered as before
            render(applyFilter(students, search.value || ''));
            // Show suggestions
            renderSearchResults(search.value || '');
        }
        const runSearchDebounced = debounce(runSearch, 120);
        search.addEventListener('input', runSearchDebounced);
        search.addEventListener('focus', () => renderSearchResults(search.value || ''));
        search.addEventListener('blur', () => setTimeout(() => { if (searchResults) searchResults.hidden = true; }, 120));
        search.addEventListener('keydown', (e) => {
            if (!searchResults || searchResults.hidden) return;
            const items = getActionableItems();
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateSelection(selIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateSelection(selIndex - 1);
            } else if (e.key === 'Enter') {
                if (selIndex >= 0) {
                    e.preventDefault();
                    const id = items[selIndex].getAttribute('data-id');
                    if (id) onPickResult(id);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                searchResults.hidden = true;
                search.setAttribute('aria-expanded', 'false');
                clearSelection();
            }
        });
        if (searchResults) {
            searchResults.addEventListener('click', (e) => {
                const item = e.target.closest('.search-item');
                if (!item) return;
                onPickResult(item.getAttribute('data-id'));
            });
            searchResults.addEventListener('keydown', (e) => {
                const item = e.target.closest('.search-item');
                if (!item) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPickResult(item.getAttribute('data-id'));
                }
            });
        }

        searchClear.addEventListener('click', () => { search.value = ''; runSearch(); search.focus(); });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem(THEME_KEY, next);
        });
    });
})();