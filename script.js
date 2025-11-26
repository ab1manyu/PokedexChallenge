const POKE_API = 'https://pokeapi.co/api/v2';
const MAX_DEX_ID = 1025;

// Game State
let state = {
    caught: JSON.parse(localStorage.getItem('nos_caught')) || {},
    buddy: JSON.parse(localStorage.getItem('nos_buddy')) || null,
    theme: localStorage.getItem('nos_theme') || 'theme-clear',
    activePokemon: null,
    currentView: 'menu', // 'menu', 'battle', 'pokedex', 'help', 'settings', 'welcome'
    activeTab: 'national', // 'owned', 'national'
    selectedIndex: 0,
    currentList: [],
    inputEnabled: true,
    menuIndex: 0,
    menuOptions: ['POKEDEX', 'BATTLE', 'SETTINGS', 'HELP'],
    settingsIndex: 0,
    settingsOptions: ['THEME', 'RESET'],
    confirmIndex: 0, // 0: NO, 1: YES
    pokedexSubMenu: false,
    pokedexSubMenuIndex: 0
};

// 3D Drag State
let drag = {
    active: false,
    startX: 0,
    startY: 0,
    baseRotateX: 0,
    baseRotateY: 0
};

// --- Initialization ---

window.onload = () => {
    document.addEventListener('keydown', handleKeyDown);

    const caseEl = document.querySelector('.gb-case');

    // Drag to Rotate Logic
    caseEl.addEventListener('mousedown', (e) => {
        // Prevent drag if clicking interactive elements
        if (e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'INPUT' ||
            e.target.closest('.dpad-btn') ||
            e.target.closest('.gb-btn-round') ||
            e.target.closest('.menu-item') ||
            e.target.closest('#dex-right div')) return;

        drag.active = true;
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        caseEl.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!drag.active) return;
        e.preventDefault();

        const deltaX = (e.clientX - drag.startX) * 0.5;
        const deltaY = (e.clientY - drag.startY) * 0.5;

        let newRotateY = drag.baseRotateY + deltaX;
        let newRotateX = drag.baseRotateX - deltaY;

        // Clamp rotation
        newRotateX = Math.max(-30, Math.min(30, newRotateX));
        newRotateY = Math.max(-30, Math.min(30, newRotateY));

        caseEl.style.transform = `perspective(1000px) rotateY(${newRotateY}deg) rotateX(${newRotateX}deg)`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!drag.active) return;
        drag.active = false;
        caseEl.style.cursor = 'default';

        // Update base rotation based on current transform
        const deltaX = (e.clientX - drag.startX) * 0.5;
        const deltaY = (e.clientY - drag.startY) * 0.5;

        drag.baseRotateY += deltaX;
        drag.baseRotateX -= deltaY;

        // Clamp base
        drag.baseRotateX = Math.max(-30, Math.min(30, drag.baseRotateX));
        drag.baseRotateY = Math.max(-30, Math.min(30, drag.baseRotateY));
    });

    applyTheme(state.theme);

    // Check starter or load menu
    if (Object.keys(state.caught).length === 0) {
        checkStarter();
    } else {
        updateView();
    }
};

// Expose for click handlers
window.updateSelection = updateSelection;
window.handleInput = handleInput;
window.handleSearch = handleSearch;
window.switchTab = switchTab;

function applyTheme(theme) {
    const caseEl = document.querySelector('.gb-case');
    // Keep existing classes but update theme
    caseEl.className = `gb-case ${theme}`;
    state.theme = theme;
    localStorage.setItem('nos_theme', theme);

    const themeValue = document.getElementById('theme-value');
    if (themeValue) {
        themeValue.innerText = theme.replace('theme-', '').toUpperCase();
    }
}

async function checkStarter() {
    state.inputEnabled = false;
    const randomId = Math.floor(Math.random() * 151) + 1;

    try {
        const res = await fetch(`${POKE_API}/pokemon/${randomId}`);
        const data = await res.json();

        const starter = {
            id: data.id,
            name: data.name,
            sprite: data.sprites.front_default,
            stats: data.stats
        };

        state.caught[starter.id] = starter;
        state.buddy = { id: starter.id, name: starter.name };

        localStorage.setItem('nos_caught', JSON.stringify(state.caught));
        localStorage.setItem('nos_buddy', JSON.stringify(state.buddy));

        // Render Welcome Screen
        const welcomeScreen = document.getElementById('welcome-screen');
        welcomeScreen.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-4 text-center">
                <div class="text-[#0f380f] font-dot text-xl mb-4">WELCOME TO SEARCHDEX</div>
                <div class="w-24 h-24 mb-4">
                    <img src="${starter.sprite}" class="w-full h-full object-contain pixelated animate-float">
                </div>
                <div class="text-[#0f380f] font-mono text-xs mb-2">
                    You received a <span class="uppercase font-bold">${starter.name}</span>!
                </div>
                <div class="text-[#306230] font-mono text-[10px] animate-pulse">PRESS A TO START</div>
            </div>
        `;

        state.inputEnabled = true;
        switchView('welcome');

    } catch (err) {
        console.error("Failed to fetch starter", err);
        state.inputEnabled = true;
        switchView('menu');
    }
}

// --- Input Handling ---

function handleKeyDown(e) {
    if (!state.inputEnabled) return;

    switch (e.key) {
        case 'ArrowUp': handleInput('UP'); break;
        case 'ArrowDown': handleInput('DOWN'); break;
        case 'ArrowLeft': handleInput('LEFT'); break;
        case 'ArrowRight': handleInput('RIGHT'); break;
        case 'Enter': handleInput('START'); break;
        case 'z': case 'Z': handleInput('A'); break;
        case 'x': case 'X': handleInput('B'); break;
        case 'Shift': handleInput('SELECT'); break;
    }
}

function handleInput(key) {
    if (!state.inputEnabled) return;

    // Haptic feedback
    const btn = getButtonElement(key);
    if (btn) {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 100);
    }

    // Global SELECT Handler
    if (key === 'SELECT') {
        // If in a sub-menu or dialog, close it first? Or just hard reset to menu?
        // User request: "select button will always go back to the menu"
        // Let's make it a hard reset to menu view.
        if (state.currentView !== 'menu' && state.currentView !== 'welcome') {
            switchView('menu');
            return;
        }
    }

    if (state.currentView === 'welcome') {
        if (key === 'A' || key === 'START') {
            switchView('menu');
        }
    } else if (state.currentView === 'menu') {
        handleMenuInput(key);
    } else if (state.currentView === 'battle') {
        handleBattleInput(key);
    } else if (state.currentView === 'pokedex') {
        handlePokedexInput(key);
    } else if (state.currentView === 'settings') {
        handleSettingsInput(key);
    } else if (state.currentView === 'help') {
        if (key === 'B') switchView('menu');
    }
}

function getButtonElement(key) {
    switch (key) {
        case 'UP': return document.querySelector('.dpad-up');
        case 'DOWN': return document.querySelector('.dpad-down');
        case 'LEFT': return document.querySelector('.dpad-left');
        case 'RIGHT': return document.querySelector('.dpad-right');
        case 'A': return document.querySelector('.btn-a');
        case 'B': return document.querySelector('.btn-b');
        case 'START': return document.querySelector('.gb-start-select > div:nth-child(2) button');
        case 'SELECT': return document.querySelector('.gb-start-select > div:nth-child(1) button');
    }
    return null;
}

// --- Menu Logic ---

function handleMenuInput(key) {
    switch (key) {
        case 'UP':
            state.menuIndex = (state.menuIndex - 1 + state.menuOptions.length) % state.menuOptions.length;
            updateMenuSelection();
            break;
        case 'DOWN':
            state.menuIndex = (state.menuIndex + 1) % state.menuOptions.length;
            updateMenuSelection();
            break;
        case 'A':
        case 'START':
            selectMenuOption();
            break;
    }
}

function updateMenuSelection() {
    const options = document.querySelectorAll('#menu-screen .menu-item');
    options.forEach((opt, idx) => {
        if (idx === state.menuIndex) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

function selectMenuOption() {
    const option = state.menuOptions[state.menuIndex];
    switch (option) {
        case 'POKEDEX':
            switchView('pokedex');
            break;
        case 'BATTLE':
            switchView('battle');
            break;
        case 'SETTINGS':
            switchView('settings');
            break;
        case 'HELP':
            switchView('help');
            break;
    }
}

// --- Settings Logic ---

function handleSettingsInput(key) {
    const confirmDialog = document.getElementById('confirm-dialog');
    const isConfirming = !confirmDialog.classList.contains('hidden');

    if (isConfirming) {
        handleConfirmInput(key);
        return;
    }

    switch (key) {
        case 'UP':
            state.settingsIndex = (state.settingsIndex - 1 + state.settingsOptions.length) % state.settingsOptions.length;
            updateSettingsSelection();
            break;
        case 'DOWN':
            state.settingsIndex = (state.settingsIndex + 1) % state.settingsOptions.length;
            updateSettingsSelection();
            break;
        case 'A':
            const option = state.settingsOptions[state.settingsIndex];
            if (option === 'THEME') {
                const themes = ['theme-clear', 'theme-purple', 'theme-blue'];
                const currentIdx = themes.indexOf(state.theme);
                const nextTheme = themes[(currentIdx + 1) % themes.length];
                applyTheme(nextTheme);
            } else if (option === 'RESET') {
                // Show confirm dialog
                confirmDialog.classList.remove('hidden');
                state.confirmIndex = 0; // Default to NO
                updateConfirmSelection();
            }
            break;
        case 'B':
            switchView('menu');
            break;
    }
}

function handleConfirmInput(key) {
    const confirmDialog = document.getElementById('confirm-dialog');

    switch (key) {
        case 'UP':
        case 'DOWN':
            state.confirmIndex = state.confirmIndex === 0 ? 1 : 0;
            updateConfirmSelection();
            break;
        case 'A':
            if (state.confirmIndex === 1) { // YES
                localStorage.removeItem('nos_caught');
                localStorage.removeItem('nos_buddy');
                location.reload();
            } else { // NO
                confirmDialog.classList.add('hidden');
            }
            break;
        case 'B':
            confirmDialog.classList.add('hidden');
            break;
    }
}

function updateConfirmSelection() {
    const noBtn = document.getElementById('confirm-no');
    const yesBtn = document.getElementById('confirm-yes');

    if (state.confirmIndex === 0) {
        noBtn.classList.add('active');
        yesBtn.classList.remove('active');
    } else {
        noBtn.classList.remove('active');
        yesBtn.classList.add('active');
    }
}

function updateSettingsSelection() {
    const options = document.querySelectorAll('#settings-screen > .flex-1 > .menu-item');
    options.forEach((opt, idx) => {
        if (idx === state.settingsIndex) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

// --- View Management ---

function switchView(viewName) {
    state.currentView = viewName;
    updateView();
}

function updateView() {
    const menuScreen = document.getElementById('menu-screen');
    const battleScreen = document.getElementById('battle-screen');
    const pokedexScreen = document.getElementById('pokedex-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const mainView = document.getElementById('main-view');

    // Reset visibility
    menuScreen.classList.add('hidden');
    battleScreen.classList.add('hidden');
    pokedexScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    welcomeScreen.classList.add('hidden');
    searchContainer.classList.add('hidden');

    // Remove help screen if exists
    const helpScreen = document.getElementById('help-screen');
    if (helpScreen) helpScreen.remove();

    switch (state.currentView) {
        case 'welcome':
            welcomeScreen.classList.remove('hidden');
            break;
        case 'menu':
            menuScreen.classList.remove('hidden');
            break;
        case 'battle':
            battleScreen.classList.remove('hidden');
            if (!state.activePokemon) {
                searchContainer.classList.remove('hidden');
                searchInput.focus();
            }
            break;
        case 'pokedex':
            pokedexScreen.classList.remove('hidden');
            renderPokedexList(true);
            break;
        case 'settings':
            settingsScreen.classList.remove('hidden');
            updateSettingsSelection();
            const themeValue = document.getElementById('theme-value');
            if (themeValue) themeValue.innerText = state.theme.replace('theme-', '').toUpperCase();
            break;
        case 'help':
            const helpDiv = document.createElement('div');
            helpDiv.id = 'help-screen';
            helpDiv.className = 'absolute inset-0 bg-[#8bac0f] z-50 p-4 flex flex-col';
            helpDiv.innerHTML = `
                <div class="text-[#0f380f] font-dot text-xl font-bold mb-2 border-b border-[#0f380f]">HOW TO PLAY</div>
                <div class="text-[#0f380f] font-mono text-[10px] space-y-2 overflow-y-auto custom-scrollbar flex-1">
                    <p>1. <span class="font-bold">BATTLE</span>: Search for any Pokémon by name to start a battle.</p>
                    <p>2. <span class="font-bold">CATCH</span>: Press 'A' to throw a ball. Weakening isn't needed yet!</p>
                    <p>3. <span class="font-bold">POKEDEX</span>: View your collection. Toggle between OWNED and ALL with Left/Right.</p>
                    <p>4. <span class="font-bold">BUDDY</span>: In Pokedex, press 'A' on a caught Pokémon to set as buddy or release.</p>
                    <p>5. <span class="font-bold">SETTINGS</span>: Change theme or reset data.</p>
                </div>
                <div class="mt-2 text-center text-[#306230] font-mono text-[10px]">PRESS B TO BACK</div>
            `;
            mainView.appendChild(helpDiv);
            break;
    }
}

// --- Battle Logic ---

function handleBattleInput(key) {
    const searchInput = document.getElementById('search-input');

    switch (key) {
        case 'A':
            if (document.activeElement === searchInput) {
                handleSearch(new Event('submit'));
            } else if (state.activePokemon) {
                attemptCatch();
            } else {
                searchInput.focus();
            }
            break;
        case 'B':
            if (state.activePokemon) {
                clearBattle();
            } else {
                switchView('menu');
            }
            break;
        case 'START':
            searchInput.focus();
            break;
    }
}

// --- Pokedex Logic ---

function handlePokedexInput(key) {
    if (state.pokedexSubMenu) {
        handlePokedexSubMenu(key);
        return;
    }

    switch (key) {
        case 'UP':
            updateSelection(state.selectedIndex - 1);
            break;
        case 'DOWN':
            updateSelection(state.selectedIndex + 1);
            break;
        case 'LEFT':
        case 'RIGHT':
            switchTab(state.activeTab === 'owned' ? 'national' : 'owned');
            break;
        case 'A':
            openPokedexSubMenu();
            break;
        case 'B':
            switchView('menu');
            break;
    }
}

function openPokedexSubMenu() {
    const pokemon = state.currentList[state.selectedIndex];
    if (!pokemon || !pokemon.caught) return;

    state.pokedexSubMenu = true;
    state.pokedexSubMenuIndex = 0;
    renderPokedexSubMenu();
}

function closePokedexSubMenu() {
    state.pokedexSubMenu = false;
    const menu = document.getElementById('dex-submenu');
    if (menu) menu.remove();
}

function renderPokedexSubMenu() {
    const container = document.getElementById('pokedex-screen');
    let menu = document.getElementById('dex-submenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'dex-submenu';
        menu.className = 'absolute bottom-2 right-2 w-32 bg-white border-2 border-black shadow-lg z-50 p-1';
        container.appendChild(menu);
    }

    const options = ['SET BUDDY', 'RELEASE', 'CANCEL'];
    let html = '';
    options.forEach((opt, idx) => {
        const active = idx === state.pokedexSubMenuIndex ? 'bg-black text-white' : 'text-black';
        const cursor = idx === state.pokedexSubMenuIndex ? '►' : '&nbsp;';
        html += `<div class="${active} font-mono text-[10px] px-1 py-0.5 cursor-pointer flex"><span class="mr-1">${cursor}</span>${opt}</div>`;
    });
    menu.innerHTML = html;
}

function handlePokedexSubMenu(key) {
    const options = ['SET BUDDY', 'RELEASE', 'CANCEL'];
    switch (key) {
        case 'UP':
            state.pokedexSubMenuIndex = (state.pokedexSubMenuIndex - 1 + options.length) % options.length;
            renderPokedexSubMenu();
            break;
        case 'DOWN':
            state.pokedexSubMenuIndex = (state.pokedexSubMenuIndex + 1) % options.length;
            renderPokedexSubMenu();
            break;
        case 'A':
            const action = options[state.pokedexSubMenuIndex];
            const pokemon = state.currentList[state.selectedIndex];

            if (action === 'SET BUDDY') {
                state.buddy = { id: pokemon.id, name: pokemon.name };
                localStorage.setItem('nos_buddy', JSON.stringify(state.buddy));
                renderLeftPanel(pokemon);
            } else if (action === 'RELEASE') {
                if (confirm(`Release ${pokemon.name}?`)) {
                    delete state.caught[pokemon.id];
                    localStorage.setItem('nos_caught', JSON.stringify(state.caught));

                    // If buddy was released, clear buddy
                    if (state.buddy && state.buddy.id === pokemon.id) {
                        state.buddy = null;
                        localStorage.removeItem('nos_buddy');
                    }

                    renderPokedexList(false); // Refresh list
                    closePokedexSubMenu();

                    // Check if dex is empty to trigger starter
                    if (Object.keys(state.caught).length === 0) {
                        checkStarter();
                    }
                    return;
                }
            }
            closePokedexSubMenu();
            break;
        case 'B':
            closePokedexSubMenu();
            break;
    }
}

function switchTab(tab) {
    if (state.activeTab === tab) return;
    state.activeTab = tab;

    const tabOwned = document.getElementById('tab-owned');
    const tabNational = document.getElementById('tab-national');

    if (tab === 'owned') {
        tabOwned.style.opacity = '1';
        tabNational.style.opacity = '0.5';
    } else {
        tabOwned.style.opacity = '0.5';
        tabNational.style.opacity = '1';
    }

    renderPokedexList(true);
}

function renderPokedexList(reset = false) {
    const listContainer = document.getElementById('dex-right');

    if (reset || state.currentList.length === 0) {
        state.currentList = [];
        if (state.activeTab === 'owned') {
            const caughtArray = Object.values(state.caught).sort((a, b) => a.id - b.id);
            state.currentList = caughtArray.map(p => ({
                id: p.id,
                name: p.name,
                caught: true,
                sprite: p.sprite,
                stats: p.stats
            }));
        } else {
            // Generate first 151
            for (let i = 1; i <= 151; i++) {
                const isCaught = state.caught[i];
                state.currentList.push({
                    id: i,
                    name: isCaught ? isCaught.name : '??????',
                    caught: !!isCaught,
                    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
                    stats: isCaught ? isCaught.stats : null
                });
            }
        }
    }

    if (reset) state.selectedIndex = 0;
    // Safety check if list became empty (e.g. released last pokemon)
    if (state.selectedIndex >= state.currentList.length) state.selectedIndex = Math.max(0, state.currentList.length - 1);

    let html = '';
    if (state.currentList.length === 0) {
        html = '<div class="text-center text-[10px] font-mono mt-4">NO DATA</div>';
    } else {
        state.currentList.forEach((p, index) => {
            const isSelected = index === state.selectedIndex;
            const bgClass = isSelected ? 'bg-[#306230] text-[#9bbc0f]' : 'text-[#0f380f]';

            // Added onclick for mouse selection
            html += `
                <div id="row-${index}" onclick="updateSelection(${index})" class="flex items-center px-1 mb-1 font-mono text-[10px] cursor-pointer ${bgClass}">
                    <span class="w-6 mr-1">${p.caught ? '★' : ' '}</span>
                    <span class="mr-2">No.${String(p.id).padStart(3, '0')}</span>
                    <span class="uppercase">${p.name}</span>
                </div>
            `;
        });
    }

    listContainer.innerHTML = html;

    const activeRow = document.getElementById(`row-${state.selectedIndex}`);
    if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });

    if (state.currentList.length > 0) {
        renderLeftPanel(state.currentList[state.selectedIndex]);
    } else {
        document.getElementById('dex-left').innerHTML = '<div class="text-center text-[10px]">EMPTY</div>';
    }
}

function updateSelection(index) {
    if (state.currentList.length === 0) return;
    if (index < 0) index = 0;
    if (index >= state.currentList.length) index = state.currentList.length - 1;

    state.selectedIndex = index;
    renderPokedexList(false);
}

function renderLeftPanel(pokemon) {
    const container = document.getElementById('dex-left');
    if (!pokemon) return;

    const sprite = pokemon.caught
        ? pokemon.sprite
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;

    const filter = pokemon.caught ? '' : 'filter: brightness(0) opacity(0.5);';
    const isBuddy = state.buddy && state.buddy.id === pokemon.id;

    let content = `
        <div class="w-20 h-20 mb-1 relative">
            <img src="${sprite}" class="w-full h-full object-contain pixelated" style="${filter}">
        </div>
        <div class="font-dot text-xs uppercase text-center mb-1 leading-tight">
            ${pokemon.name}
        </div>
        <div class="w-full bg-[#306230] h-px mb-1"></div>
    `;

    if (pokemon.caught && pokemon.stats) {
        content += `<div class="stats-grid mb-1">`;
        pokemon.stats.forEach(stat => {
            const nameMap = {
                'hp': 'HP', 'attack': 'ATK', 'defense': 'DEF',
                'special-attack': 'SPA', 'special-defense': 'SPD', 'speed': 'SPE'
            };
            const name = nameMap[stat.stat.name];
            if (name) {
                const percent = Math.min((stat.base_stat / 150) * 100, 100);
                content += `
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-mono w-4 text-right leading-none">${name}</span>
                        <div class="flex-1 h-1 bg-[#0f380f]/30">
                            <div class="h-full bg-[#0f380f]" style="width: ${percent}%"></div>
                        </div>
                    </div>
                 `;
            }
        });
        content += `</div>`;

        if (isBuddy) {
            content += `<div class="text-[8px] font-bold text-[#0f380f] bg-[#9bbc0f] px-2 py-0.5 rounded border border-[#0f380f] text-center">ACTIVE BUDDY</div>`;
        } else {
            content += `<div class="text-[8px] font-mono text-[#0f380f] text-center">PRESS A FOR OPTIONS</div>`;
        }

    } else {
        content += `
            <div class="text-[8px] font-mono w-full text-center mt-4">
                UNKNOWN DATA
            </div>
        `;
    }

    container.innerHTML = content;
}

// --- Battle & Search ---

async function handleSearch(e) {
    e.preventDefault();
    const input = document.getElementById('search-input');
    const query = input.value.toLowerCase().trim();
    if (!query) return;

    input.blur(); // Remove focus so A button works for battle

    const emptyState = document.getElementById('empty-state');
    const battleContent = document.getElementById('battle-content');

    emptyState.innerHTML = `<div class="font-dot text-[#0f380f] animate-pulse">CONNECTING...</div>`;

    try {
        const res = await fetch(`${POKE_API}/pokemon/${query}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        startBattle(data);
        input.value = '';
    } catch (err) {
        emptyState.innerHTML = `<div class="font-dot text-[#0f380f]">MISSINGNO.</div>`;
        setTimeout(() => {
            emptyState.innerHTML = `
                <div class="text-[#8bac0f] font-dot text-2xl mb-2">NINTENDO</div>
                <div class="text-[#306230] font-mono text-[10px]">PRESS A TO START</div>
            `;
        }, 2000);
    }
}

function startBattle(pokemon) {
    state.activePokemon = pokemon;
    const emptyState = document.getElementById('empty-state');
    const battleContent = document.getElementById('battle-content');
    const searchContainer = document.getElementById('search-container');

    emptyState.classList.add('hidden');
    battleContent.classList.remove('hidden');
    searchContainer.classList.add('hidden');

    const sprite = pokemon.sprites.front_default;
    const playerSprite = state.buddy
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${state.buddy.id}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png`; // Fallback

    // Render Battle Scene
    battleContent.innerHTML = `
        <!-- Background -->
        <div class="absolute inset-0 bg-[#f8f8f8]"></div>
        
        <!-- Enemy Platform -->
        <div class="absolute top-16 right-4 w-24 h-8 bg-[#d0d0d8] rounded-[50%] border-2 border-[#a0a0a8] z-0"></div>
        
        <!-- Enemy Sprite -->
        <div id="enemy-sprite" class="absolute top-6 right-6 w-20 h-20 z-10">
            <img src="${sprite}" class="w-full h-full object-contain pixelated animate-float">
        </div>
        
        <!-- Enemy HUD -->
        <div class="absolute top-2 left-2 bg-white border-2 border-black p-1 rounded z-20 shadow-md">
            <div class="font-dot text-[10px] uppercase font-bold leading-none mb-1">${pokemon.name}</div>
            <div class="w-20 h-1.5 bg-gray-200 border border-black rounded-full overflow-hidden">
                <div class="h-full bg-green-500 w-full"></div>
            </div>
        </div>

        <!-- Player Platform -->
        <div class="absolute bottom-8 left-4 w-32 h-10 bg-[#d0d0d8] rounded-[50%] border-2 border-[#a0a0a8] z-0"></div>

        <!-- Player Sprite -->
        <div class="absolute bottom-8 left-8 w-24 h-24 z-10">
            <img src="${playerSprite}" class="w-full h-full object-contain pixelated">
        </div>

        <!-- Player HUD -->
        <div class="absolute bottom-12 right-2 bg-white border-2 border-black p-1 rounded z-20 shadow-md">
            <div class="font-dot text-[10px] uppercase font-bold leading-none mb-1">${state.buddy ? state.buddy.name : 'PLAYER'}</div>
            <div class="w-20 h-1.5 bg-gray-200 border border-black rounded-full overflow-hidden">
                <div class="h-full bg-green-500 w-full"></div>
            </div>
            <div class="text-[8px] font-mono text-right mt-0.5">25/25</div>
        </div>

        <!-- Text Box -->
        <div class="absolute bottom-0 left-0 right-0 h-12 bg-white border-t-2 border-black p-2 font-dot text-[10px] leading-tight z-30">
            Wild <span class="uppercase font-bold">${pokemon.name}</span> appeared!
            <div class="mt-1 text-[8px] font-mono text-right">A: CATCH | B: RUN</div>
        </div>
    `;
}

function clearBattle() {
    state.activePokemon = null;
    document.getElementById('battle-content').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('search-container').classList.remove('hidden');
    document.getElementById('search-input').focus();
}

// --- Animation & Catch Logic ---

function attemptCatch() {
    if (!state.activePokemon || !state.inputEnabled) return;
    if (state.caught[state.activePokemon.id]) {
        showMessage("You already caught this!");
        return;
    }

    state.inputEnabled = false;
    const battleContent = document.getElementById('battle-content');
    const enemySprite = document.getElementById('enemy-sprite');

    const ball = document.createElement('div');
    ball.className = 'absolute bottom-10 left-10 w-4 h-4 z-50 rounded-full border border-black bg-white overflow-hidden shadow-md';
    ball.innerHTML = `
        <div class="w-full h-1/2 bg-red-600 border-b border-black"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-black rounded-full z-10"></div>
    `;
    battleContent.appendChild(ball);

    ball.classList.add('anim-throw');
    showMessage("Go! Pokéball!");

    setTimeout(() => {
        enemySprite.classList.add('anim-poof');
        ball.style.transform = 'translate(300px, 20px) scale(0.4)';
        ball.classList.remove('anim-throw');

        setTimeout(() => {
            ball.classList.add('anim-shake');

            setTimeout(() => {
                const caught = Math.random() > 0.3;

                if (caught) {
                    ball.classList.remove('anim-shake');
                    ball.style.filter = 'brightness(0.5)';

                    const sparkles = document.createElement('div');
                    sparkles.className = 'absolute top-10 right-10 text-yellow-400 font-bold text-xl animate-pulse z-50';
                    sparkles.innerText = '✨';
                    battleContent.appendChild(sparkles);

                    showMessage(`Gotcha! ${state.activePokemon.name} was caught!`);

                    state.caught[state.activePokemon.id] = {
                        id: state.activePokemon.id,
                        name: state.activePokemon.name,
                        sprite: state.activePokemon.sprites.front_default,
                        stats: state.activePokemon.stats
                    };
                    localStorage.setItem('nos_caught', JSON.stringify(state.caught));

                    setTimeout(() => {
                        state.inputEnabled = true;
                        clearBattle();
                    }, 2000);

                } else {
                    ball.classList.remove('anim-shake');
                    ball.style.display = 'none';

                    enemySprite.classList.remove('anim-poof');
                    enemySprite.classList.add('anim-breakout');

                    showMessage(`Darn! The Pokémon broke free!`);

                    setTimeout(() => {
                        enemySprite.classList.remove('anim-breakout');
                        state.inputEnabled = true;
                    }, 1500);
                }
            }, 1000);
        }, 500);
    }, 800);
}

function showMessage(text) {
    const box = document.querySelector('#battle-content .absolute.bottom-0');
    if (box) {
        box.innerHTML = `${text}<div class="absolute bottom-1 right-2 animate-bounce">▼</div>`;
    }
}