import React, { useState, useEffect, useMemo, useCallback } from 'react';

const POKE_API_BASE = 'https://pokeapi.co/api/v2';
const POKEMON_COUNT = 1025; // Total Pokémon as of Gen 9
// Base URL for default sprites, used for silhouettes
const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';


// +----------------------------------------------------------------+
// |  Root Application Component (App)                              |
// +----------------------------------------------------------------+

/**
 * Main App component. Manages navigation, global state, and data persistence.
 */
export default function App() {
  // State for navigation
  const [currentPage, setCurrentPage] = useState('search'); // 'search' or 'pokedex'
  
  // State for all caught Pokémon, loaded from localStorage
  const [caughtPokemon, setCaughtPokemon] = useState(() => {
    try {
      const saved = localStorage.getItem('caughtPokemon');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse caughtPokemon from localStorage", e);
      return {};
    }
  });

  // Persist caughtPokemon to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('caughtPokemon', JSON.stringify(caughtPokemon));
  }, [caughtPokemon]);

  /**
   * Handler for when a new Pokémon is successfully caught.
   * Now accepts ballType to store.
   */
  const handleCatch = (pokemonData, ballType) => {
    setCaughtPokemon((prev) => ({
      ...prev,
      [pokemonData.id]: {
        id: pokemonData.id,
        name: pokemonData.name,
        sprite: pokemonData.sprites.front_default || pokemonData.sprites.other['official-artwork'].front_default,
        caughtOn: Date.now(),
        ball: ballType, // Save the ball it was caught with
      },
    }));
  };

  return (
    <div className="font-vt323 bg-gray-800 text-white min-h-screen">
      {/* Import the pixel font */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          
          /* Base DS Screen Styling */
          .ds-screen {
            font-family: 'VT323', monospace;
            background-color: #f8f8f8; /* Off-white, like the DS screen */
            border: 10px solid #a0a0a0; /* Outer DS bezel */
            border-bottom-width: 20px;
            box-shadow: inset 0 0 10px #000000a0, 0 5px 15px #000000b0;
            color: #333;
            max-width: 500px;
            margin: 20px auto;
            border-radius: 12px;
          }
          
          /* Inner screen effect */
          .ds-screen-content {
            background-color: #d8f8e0; /* Classic green-ish LCD */
            border: 4px solid #333;
            border-radius: 4px;
            padding: 1rem;
            min-height: 400px;
            box-shadow: inset 0 0 8px #00000030;
          }

          /* General image rendering */
          img {
            image-rendering: pixelated;
          }

          /* Silhouette filter for uncaught Pokémon */
          .silhouette {
            filter: brightness(0) invert(0);
            opacity: 0.6;
          }

          /* Pokéball Base Styles */
          .pokeball {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 3px solid #333;
            background: linear-gradient(to bottom, #f00 0%, #f00 45%, #333 45%, #333 55%, #fff 55%, #fff 100%);
            position: relative;
            box-shadow: inset 0 -2px 0 0 #00000030, 0 2px 4px #00000040;
          }
          .pokeball::before, .pokeball::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
          .pokeball::before {
            width: 20px;
            height: 20px;
            background: #fff;
            border: 3px solid #333;
            border-radius: 50%;
            z-index: 1;
          }
          .pokeball::after {
            width: 10px;
            height: 10px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 50%;
            z-index: 2;
          }

          /* Great Ball Styles */
          .greatball {
            background: linear-gradient(to bottom, #007cfc 0%, #007cfc 45%, #333 45%, #333 55%, #fff 55%, #fff 100%);
          }
          .ball-wing {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #f00;
            border: 3px solid #333;
            border-radius: 4px;
          }
          .greatball .ball-wing.left {
            top: 5px; left: 0px; transform: rotate(-15deg);
          }
          .greatball .ball-wing.right {
            top: 5px; right: 0px; transform: rotate(15deg);
          }
          
          /* Ultra Ball Styles */
          .ultraball {
            background: linear-gradient(to bottom, #333 0%, #333 45%, #333 45%, #333 55%, #fff 55%, #fff 100%);
          }
          .ultraball::before { background: #ff0; border: 3px solid #333; }
          .ultraball::after { background: #ff0; border: 2px solid #333; }
          .ultraball .ball-wing.left {
            top: 5px; left: 0px; transform: rotate(15deg); background: #ff0;
          }
          .ultraball .ball-wing.right {
            top: 5px; right: 0px; transform: rotate(-15deg); background: #ff0;
          }
          .ultraball .ball-wing.center {
            top: 0px; left: 50%; transform: translateX(-50%) rotate(45deg); 
            background: #ff0; width: 15px; height: 15px;
          }

          /* Animations */
          @keyframes pokeball-throw {
            0% { transform: translate(0, 0) rotate(0); opacity: 1; }
            50% { transform: translate(0, -150px) rotate(-180deg); opacity: 1; }
            100% { transform: translate(0, 0) rotate(-360deg); opacity: 1; }
          }
          @keyframes pokeball-shake {
            0% { transform: rotate(0); }
            25% { transform: rotate(15deg); }
            50% { transform: rotate(-15deg); }
            75% { transform: rotate(15deg); }
            100% { transform: rotate(0); }
          }
          
          .animate-throw {
            animation: pokeball-throw 0.7s ease-out forwards;
          }
          .animate-shake {
            animation: pokeball-shake 0.5s ease-in-out 3;
          }
        `}
      </style>

      <div className="ds-screen">
        <div className="ds-screen-content">
          {/* Main App Header */}
          <header className="flex justify-between items-center pb-2 border-b-4 border-gray-400">
            <h1 className="text-3xl">Pokédex Challenge</h1>
            <nav>
              {/* Navigation Buttons */}
              <DSButton 
                onClick={() => setCurrentPage('search')} 
                disabled={currentPage === 'search'}
              >
                Search
              </DSButton>
              <DSButton 
                onClick={() => setCurrentPage('pokedex')} 
                disabled={currentPage === 'pokedex'}
                className="ml-2"
              >
                Pokédex
              </DSButton>
            </nav>
          </header>

          {/* Page Content */}
          <main className="mt-4">
            {currentPage === 'search' && (
              <SearchPage 
                onCatch={handleCatch} 
                caughtPokemon={caughtPokemon} 
                onNavigate={() => setCurrentPage('pokedex')} 
              />
            )}
            {currentPage === 'pokedex' && (
              <PokedexPage caughtPokemon={caughtPokemon} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// +----------------------------------------------------------------+
// |  Search Page Component                                         |
// +----------------------------------------------------------------+

/**
 * Page for searching and catching new Pokémon.
 */
function SearchPage({ onCatch, caughtPokemon, onNavigate }) {
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('Type a Pokémon name to begin.');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // Stores the found Pokémon
  const [catchRate, setCatchRate] = useState(null);
  
  // State for the modal
  const [modalData, setModalData] = useState(null);

  // State for catching animation
  const [animationState, setAnimationState] = useState('idle'); // idle, throwing, shaking, result
  const [currentBallType, setCurrentBallType] = useState('pokeball');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || !isNaN(query)) { // Block numeric-only searches
      setSearchMessage('Please enter a valid Pokémon name.');
      return;
    }
    
    setIsLoading(true);
    setSearchMessage(`Searching for "${query}"...`);
    setSearchResult(null);
    setAnimationState('idle');
    setModalData(null);
    setCatchRate(null); // Reset catch rate on new search

    try {
      // 1. Fetch main Pokémon data (for name, id, sprite)
      const res = await fetch(`${POKE_API_BASE}/pokemon/${query.toLowerCase()}`);
      if (!res.ok) {
        if (res.status === 404) {
          setSearchMessage(`Pokémon "${query}" not found.`);
        } else {
          throw new Error('Pokémon data fetch failed');
        }
        setIsLoading(false);
        return;
      }
      
      const pokemon = await res.json();

      // Check if already caught
      if (caughtPokemon[pokemon.id]) {
        setSearchMessage(`You've already caught ${capitalize(pokemon.name)}!`);
        setSearchResult(pokemon); // Show the caught Pokémon
        setIsLoading(false);
        return;
      }

      // 2. Fetch species data (for catch rate)
      const speciesRes = await fetch(pokemon.species.url);
      if (!speciesRes.ok) throw new Error('Species data fetch failed');
      const species = await speciesRes.json();
      
      setCatchRate(species.capture_rate); // capture_rate is 0-255
      setSearchResult(pokemon);
      setSearchMessage(`A wild ${capitalize(pokemon.name)} appeared!`);

    } catch (error) {
      console.error(error);
      setSearchMessage('An error occurred. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the click event on the search result to open the modal.
   */
  const handleResultClick = async (pokemon) => {
    if (!pokemon) return;

    // We only open the modal if the Pokémon is *not* a new encounter,
    // or if we're not in the middle of a catch animation.
    if (!caughtPokemon[pokemon.id] && animationState === 'idle' && catchRate !== null) {
      // This is a wild encounter, don't open modal, wait for catch.
      return;
    }

    setModalData({ name: 'Loading...' }); // Show loading in modal

    try {
      // Fetch species data for description
      const speciesRes = await fetch(pokemon.species.url);
      if (!speciesRes.ok) throw new Error('Species data fetch failed');
      const species = await speciesRes.json();

      const flavorTextEntry = species.flavor_text_entries.find(
        (entry) => entry.language.name === 'en'
      );
      const description = flavorTextEntry 
        ? flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ') 
        : 'No description available.';

      const sprite = caughtPokemon[pokemon.id]?.sprite || 
                     pokemon.sprites.front_default || 
                     pokemon.sprites.other['official-artwork'].front_default;
                     
      const ball = caughtPokemon[pokemon.id]?.ball; // Get the ball if caught

      const finalData = {
        name: capitalize(pokemon.name),
        id: pokemon.id,
        sprite: sprite,
        stats: pokemon.stats,
        abilities: pokemon.abilities,
        description: description,
        ball: ball, // Pass ball to modal data
      };

      setModalData(finalData);
    } catch (error) {
      console.error("Failed to fetch details for modal:", error);
      setModalData(null); // Close modal on error
    }
  };
  
  /**
   * Simulates throwing a ball and attempting to catch the Pokémon.
   */
  const handleCatchAttempt = () => {
    if (!searchResult || caughtPokemon[searchResult.id] || isLoading) return;

    // 1. Determine ball type and multiplier
    const rand = Math.random();
    let ballType, ballMultiplier;
    if (rand < 0.6) { // 60% chance
      ballType = 'pokeball';
      ballMultiplier = 1;
    } else if (rand < 0.9) { // 30% chance
      ballType = 'greatball';
      ballMultiplier = 1.5;
    } else { // 10% chance
      ballType = 'ultraball';
      ballMultiplier = 2;
    }
    setCurrentBallType(ballType);
    setSearchMessage(`You threw a ${capitalize(ballType)}!`);

    // 2. Start 'throwing' animation
    setIsLoading(true); // Disable buttons
    setAnimationState('throwing');

    // 3. Calculate catch probability
    // This is a simplified version of the real formula.
    // Max catch rate is 255. We'll map this to a % chance.
    const probability = Math.min((catchRate / 255) * ballMultiplier, 1);
    const roll = Math.random();

    // 4. After throw animation, start 'shaking'
    setTimeout(() => {
      setAnimationState('shaking');
      
      // 5. After shake animation, show result
      setTimeout(() => {
        if (roll <= probability) {
          // Success
          onCatch(searchResult, ballType); // Pass ballType to the handler
          setSearchMessage(`Gotcha! ${capitalize(searchResult.name)} was caught!`);
          setAnimationState('result_success');
        } else {
          // Failure
          setSearchMessage(`Oh no! ${capitalize(searchResult.name)} broke free!`);
          setAnimationState('result_fail');
        }
      }, 1800); // 1.8s (0.5s shake * 3 + 0.3s buffer)

    }, 700); // 0.7s (duration of throw animation)
  };
  
  /**
   * Resets the UI after a failed catch attempt to allow another throw.
   */
  const resetAfterFail = () => {
    setIsLoading(false);
    setAnimationState('idle');
    setSearchMessage(`A wild ${capitalize(searchResult.name)} appeared!`);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Pokémon name"
          className="w-full p-2 text-2xl border-4 border-gray-400 rounded bg-white text-black"
          disabled={isLoading && animationState !== 'idle'}
        />
        <DSButton
          type="submit"
          className="w-full mt-2"
          disabled={isLoading}
        >
          Search
        </DSButton>
      </form>

      <div className="mt-4 p-4 min-h-[250px] bg-gray-200 border-4 border-gray-400 rounded flex flex-col items-center justify-center">
        {/* Search Result / Encounter Area */}
        {!searchResult ? (
          <p className="text-xl">{searchMessage}</p>
        ) : (
          <div className="flex flex-col items-center">
            
            {/* Animation Container */}
            <div className="h-32 w-32 flex items-center justify-center mb-2">
              {animationState === 'idle' && (
                <img
                  src={searchResult.sprites.front_default || searchResult.sprites.other['official-artwork'].front_default}
                  alt={searchResult.name}
                  className={`w-32 h-32 ${!caughtPokemon[searchResult.id] && catchRate !== null ? '' : 'cursor-pointer hover:opacity-75'}`}
                  onClick={() => handleResultClick(searchResult)}
                />
              )}
              {animationState === 'throwing' && (
                <div className={`pokeball ${currentBallType} animate-throw`}>
                  {currentBallType !== 'pokeball' && <BallWings type={currentBallType} />}
                </div>
              )}
              {animationState === 'shaking' && (
                <div className={`pokeball ${currentBallType} animate-shake`}>
                  {currentBallType !== 'pokeball' && <BallWings type={currentBallType} />}
                </div>
              )}
              {(animationState === 'result_success' || animationState === 'result_fail') && (
                <div className={`pokeball ${currentBallType}`}>
                  {currentBallType !== 'pokeball' && <BallWings type={currentBallType} />}
                </div>
              )}
            </div>
            
            <p className="text-xl mb-2">{searchMessage}</p>

            {/* CATCH / NAVIGATE BUTTONS */}

            {/* Not caught, wild encounter */}
            {!caughtPokemon[searchResult.id] && catchRate !== null && animationState === 'idle' && (
              <DSButton onClick={handleCatchAttempt} disabled={isLoading}>
                Throw Pokéball
              </DSButton>
            )}

            {/* Catch failed, allow retry */}
            {animationState === 'result_fail' && (
              <DSButton onClick={resetAfterFail}>
                Try Again?
              </DSButton>
            )}

            {/* Catch succeeded, link to Pokédex */}
            {animationState === 'result_success' && (
              <DSButton onClick={onNavigate}>
                View in Pokédex
              </DSButton>
            )}
          </div>
        )}
      </div>
      
      {/* Search Page Modal */}
      {modalData && (
        <PokemonDetailModal 
          data={modalData} 
          onClose={() => setModalData(null)} 
        />
      )}
    </div>
  );
}

// +----------------------------------------------------------------+
// |  Pokédex Page Component                                        |
// +----------------------------------------------------------------+

const POKEMON_PER_PAGE = 30; // 6 rows * 5 cols

/**
 * Page for viewing all caught Pokémon.
 */
function PokedexPage({ caughtPokemon }) {
  const [allPokemon, setAllPokemon] = useState([]); // Stores the master list
  const [isLoading, setIsLoading] = useState(true);
  const [modalData, setModalData] = useState(null); // For the detail modal
  
  // State for filtering and sorting
  const [filterGen, setFilterGen] = useState('all'); // 'all', '1', '2', ...
  const [sortOrder, setSortOrder] = useState('dex_asc'); // 'dex_asc', 'dex_desc', 'name_asc', 'name_desc', 'caught_on'
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Generation ranges (by ID)
  const GEN_RANGES = {
    '1': [1, 151],
    '2': [152, 251],
    '3': [252, 386],
    '4': [387, 493],
    '5': [494, 649],
    '6': [650, 721],
    '7': [722, 809],
    '8': [810, 905],
    '9': [906, 1025],
  };

  // Fetch the master list of all Pokémon on mount
  useEffect(() => {
    const fetchAllPokemon = async () => {
      setIsLoading(true);
      try {
        // Check localStorage cache first
        const cache = localStorage.getItem('allPokemonList');
        if(cache) {
          setAllPokemon(JSON.parse(cache));
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${POKE_API_BASE}/pokemon?limit=${POKEMON_COUNT}`);
        const data = await res.json();
        
        const list = data.results.map((p, i) => ({
          name: p.name,
          id: i + 1,
          url: p.url,
        }));
        
        setAllPokemon(list);
        localStorage.setItem('allPokemonList', JSON.stringify(list)); // Cache it
      } catch (error) {
        console.error("Failed to fetch master Pokémon list", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPokemon();
  }, []);

  /**
   * Memoized hook to perform filtering and sorting.
   * This is the "processed" list that the UI will use.
   */
  const processedList = useMemo(() => {
    let list = allPokemon.map(p => ({
      ...p,
      caught: !!caughtPokemon[p.id],
      sprite: caughtPokemon[p.id]?.sprite || null, // Sprite if caught
      defaultSprite: `${SPRITE_BASE_URL}${p.id}.png`, // Default sprite for silhouette
      caughtOn: caughtPokemon[p.id]?.caughtOn || null,
      ball: caughtPokemon[p.id]?.ball || null,
    }));

    // 1. Filter by Generation
    if (GEN_RANGES[filterGen]) {
      const [min, max] = GEN_RANGES[filterGen];
      list = list.filter(p => p.id >= min && p.id <= max);
    }
    
    // 2. Sort the list
    switch (sortOrder) {
      case 'dex_asc':
        // Default, no change needed
        break;
      case 'dex_desc':
        list.sort((a, b) => b.id - a.id);
        break;
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'caught_on':
        // Sort by caughtOn, most recent first. Uncaught at the end.
        list.sort((a, b) => {
          if (a.caughtOn && b.caughtOn) return b.caughtOn - a.caughtOn;
          if (a.caughtOn) return -1;
          if (b.caughtOn) return 1;
          return 0; // Keep original order if both uncaught
        });
        break;
    }
    
    return list;
  }, [allPokemon, caughtPokemon, filterGen, sortOrder]);

  /**
   * Memoized hook for pagination.
   */
  const { paginatedList, totalPages } = useMemo(() => {
    const total = Math.ceil(processedList.length / POKEMON_PER_PAGE);
    const start = (currentPage - 1) * POKEMON_PER_PAGE;
    const end = start + POKEMON_PER_PAGE;
    return {
      paginatedList: processedList.slice(start, end),
      totalPages: total,
    };
  }, [processedList, currentPage]);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterGen, sortOrder]);

  /**
   * Click handler for a Pokédex entry.
   * Fetches detailed data only when clicked.
   */
  const handleEntryClick = async (pokemon) => {
    if (!pokemon.caught) return; // Can't view details if not caught
    
    setModalData({ name: 'Loading...' }); // Show loading in modal

    try {
      // 1. Fetch main Pokémon data
      const res = await fetch(`${POKE_API_BASE}/pokemon/${pokemon.id}`);
      if (!res.ok) throw new Error('Pokémon data fetch failed');
      const pokemonData = await res.json();

      // 2. Fetch species data (for description)
      const speciesRes = await fetch(pokemonData.species.url);
      if (!speciesRes.ok) throw new Error('Species data fetch failed');
      const species = await speciesRes.json();
      
      const flavorTextEntry = species.flavor_text_entries.find(
        (entry) => entry.language.name === 'en'
      );
      const description = flavorTextEntry 
        ? flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ') 
        : 'No description available.';

      // 3. Assemble modal data
      const finalData = {
        name: capitalize(pokemon.name),
        id: pokemon.id,
        sprite: pokemon.sprite, // Use sprite from the list item
        stats: pokemonData.stats,
        abilities: pokemonData.abilities,
        description: description,
        ball: pokemon.ball, // Get ball from the list item
      };

      setModalData(finalData);
    } catch (error) {
      console.error("Failed to fetch Pokémon details:", error);
      setModalData(null); // Close modal on error
    }
  };

  // Pagination Handlers
  const handleNext = () => {
    setCurrentPage(p => Math.min(p + 1, totalPages));
  };
  const handlePrev = () => {
    setCurrentPage(p => Math.max(p - 1, 1));
  };

  return (
    <div>
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Generation Filter */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="genFilter" className="block text-sm">Generation</label>
          <DSSelect id="genFilter" value={filterGen} onChange={e => setFilterGen(e.target.value)}>
            <option value="all">All</option>
            {Object.keys(GEN_RANGES).map(gen => (
              <option key={gen} value={gen}>Generation {gen}</option>
            ))}
          </DSSelect>
        </div>
        
        {/* Sort Order */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="sortOrder" className="block text-sm">Sort By</label>
          <DSSelect id="sortOrder" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="dex_asc">Dex Number (Asc)</option>
            <option value="dex_desc">Dex Number (Desc)</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="caught_on">Date Caught</option>
          </DSSelect>
        </div>
      </div>
      
      {/* Grid */}
      {isLoading ? (
        <p className="text-center text-xl">Loading Pokédex...</p>
      ) : (
        <div className="grid grid-cols-5 gap-2 min-h-[34rem] content-start">
          {paginatedList.map(pokemon => (
            <PokedexEntry 
              key={pokemon.id} 
              pokemon={pokemon} 
              onClick={() => handleEntryClick(pokemon)} 
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t-4 border-gray-400">
        <DSButton onClick={handlePrev} disabled={currentPage === 1}>
          &lt; Prev
        </DSButton>
        <span className="text-xl">
          Page {currentPage} of {totalPages}
        </span>
        <DSButton onClick={handleNext} disabled={currentPage === totalPages}>
          Next &gt;
        </DSButton>
      </div>

      {/* Detail Modal */}
      {modalData && (
        <PokemonDetailModal 
          data={modalData} 
          onClose={() => setModalData(null)} 
        />
      )}
    </div>
  );
}


// +----------------------------------------------------------------+
// |  Shared Components                                             |
// +----------------------------------------------------------------+

/**
 * A single entry in the Pokédex grid.
 */
function PokedexEntry({ pokemon, onClick }) {
  const sprite = pokemon.caught ? pokemon.sprite : pokemon.defaultSprite;
  const idString = String(pokemon.id).padStart(4, '0');
  
  return (
    <div
      className={`p-1 border-4 rounded ${
        pokemon.caught 
          ? 'border-gray-500 bg-gray-100 cursor-pointer hover:bg-white' 
          : 'border-gray-300 bg-gray-200'
      }`}
      onClick={onClick}
      title={pokemon.caught ? `View ${capitalize(pokemon.name)}` : '???'}
    >
      <div className="w-full aspect-square bg-gray-300 rounded-sm overflow-hidden flex items-center justify-center">
        <img 
          src={sprite} 
          alt={pokemon.caught ? pokemon.name : 'Unknown Pokémon'} 
          className={`w-full h-full ${pokemon.caught ? '' : 'silhouette'}`}
        />
      </div>
      <p className="text-sm text-center truncate">
        {pokemon.caught ? `${idString}: ${capitalize(pokemon.name)}` : `${idString}: ???`}
      </p>
    </div>
  );
}

/**
 * The modal component for showing Pokémon details.
 */
function PokemonDetailModal({ data, onClose }) {

  // Effect to lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!data) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="font-vt323 ds-screen"
        style={{ maxWidth: '600px', margin: 0 }}
        onClick={(e) => e.stopPropagation()} // Prevent close on modal click
      >
        <div 
          className="ds-screen-content"
          style={{ minHeight: 'auto' }} // Override default min-height
        >
          {data.name === 'Loading...' ? (
            <p className="text-2xl text-center">Loading...</p>
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b-4 border-gray-400">
                <h2 className="text-4xl">{data.name}</h2>
                <span className="text-3xl">#{String(data.id).padStart(4, '0')}</span>
              </div>
              
              {/* Main Content */}
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                
                {/* Left Side (Sprite, Abilities, Ball) */}
                <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col items-center">
                  <div className="w-32 h-32 bg-gray-700 rounded-md border-2 border-gray-600 shadow-inner">
                    <img 
                      src={data.sprite} 
                      alt={data.name} 
                      className="w-full h-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="w-full mt-2">
                    <h3 className="text-xl text-left border-b-2 border-gray-600">Abilities</h3>
                    <ul className="text-left mt-1">
                      {data.abilities.map(a => (
                        <li key={a.ability.name}>- {capitalize(a.ability.name)} {a.is_hidden && '(Hidden)'}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Show the ball it was caught with */}
                  {data.ball && (
                    <div className="w-full mt-2">
                      <h3 className="text-xl text-left border-b-2 border-gray-600">Caught With</h3>
                      <div className="flex justify-center items-center py-2">
                        <div className={`pokeball ${data.ball} relative scale-75`}>
                          <BallWings type={data.ball} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Side (Stats & Desc) */}
                <div className="flex-1">
                  {/* Stats */}
                  <div>
                    <h3 className="text-xl border-b-2 border-gray-600">Base Stats</h3>
                    <ul className="mt-1">
                      {data.stats.map(s => (
                        <li key={s.stat.name} className="grid grid-cols-3 gap-2">
                          <span className="truncate">{capitalize(s.stat.name.replace('special-', 'Sp. '))}</span>
                          <span className="text-right font-bold">{s.base_stat}</span>
                          <div className="bg-gray-400 h-4 my-1 border border-gray-500 rounded-sm">
                            <div 
                              className="bg-green-600 h-full"
                              style={{ width: `${Math.min(s.base_stat / 255 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Description */}
                  <div className="mt-4">
                    <h3 className="text-xl border-b-2 border-gray-600">Description</h3>
                    <p className="mt-1 p-2 bg-gray-200 border-2 border-gray-400 rounded">
                      {data.description}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <div className="text-right mt-4 pt-4 border-t-4 border-gray-400">
                <DSButton onClick={onClose}>Close</DSButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A styled "DS-like" button.
 */
function DSButton({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-1 text-2xl bg-gray-300 border-4 border-gray-400 rounded
                  hover:bg-gray-200 active:bg-gray-400
                  disabled:bg-gray-400 disabled:text-gray-500 disabled:opacity-70
                  ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * A styled "DS-like" select dropdown.
 */
function DSSelect({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full p-2 text-xl border-4 border-gray-400 rounded bg-white text-black
                  ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Renders the "wings" for Great and Ultra balls.
 */
function BallWings({ type }) {
  if (type === 'pokeball') return null;
  return (
    <>
      <div className="ball-wing left"></div>
      <div className="ball-wing right"></div>
      {type === 'ultraball' && <div className="ball-wing center"></div>}
    </>
  );
}

// +----------------------------------------------------------------+
// |  Utility Functions                                             |
// +----------------------------------------------------------------+

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}