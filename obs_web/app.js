// Supabase Configuration
const SUPABASE_URL = "https://vctxtgacwuprmivvgclw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg";

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// DOM Elements
const waitingScreen = document.getElementById('waiting-screen');
const matchScreen = document.getElementById('match-screen');
const mapNameEl = document.getElementById('map-name');
const mapBgEl = document.getElementById('map-bg');
const survivorsList = document.getElementById('survivors-list');
const infectedList = document.getElementById('infected-list');
const survivorAvgMmrEl = document.getElementById('survivor-avg-mmr');
const infectedAvgMmrEl = document.getElementById('infected-avg-mmr');
const connectionStatus = document.getElementById('connection-status');
const playerTemplate = document.getElementById('player-template');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Utility to calculate average MMR
function getAverageMmr(players) {
  if (!players || players.length === 0) return 0;
  const sum = players.reduce((acc, p) => acc + (p.mmr || 0), 0);
  return Math.round(sum / players.length);
}

// Render a team list
function renderTeam(players, containerEl, avgMmrEl) {
  containerEl.innerHTML = ''; // Clear current list
  avgMmrEl.textContent = `AVG: ${getAverageMmr(players)}`;

  players.forEach((player, index) => {
    // Clone template
    const clone = playerTemplate.content.cloneNode(true);
    
    // Fill data
    const avatar = clone.querySelector('.player-avatar');
    const name = clone.querySelector('.player-name');
    const mmr = clone.querySelector('.player-mmr');
    const badge = clone.querySelector('.player-badge');
    
    avatar.src = player.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';
    name.textContent = player.playerName || 'Unknown';
    mmr.textContent = player.mmr || '0';

    // Badge logic
    const m = Number(player.mmr) || 0;
    let badgeNum = 1;
    if (m >= 9000) badgeNum = 9;
    else if (m >= 2000) badgeNum = Math.floor(m / 1000);
    badge.src = `https://l4d2center.com/images/badges/${badgeNum}.svg`;

    // Staggered animation
    const card = clone.querySelector('.player-card');
    card.classList.add('animate-slide-in');
    card.style.animationDelay = `${index * 0.1}s`;

    containerEl.appendChild(clone);
  });
}

function updateMatchState(data) {
  if (!data || data.state === 'waiting') {
    waitingScreen.style.display = 'flex';
    matchScreen.style.display = 'none';
    return;
  }

  if (data.state === 'ingame') {
    waitingScreen.style.display = 'none';
    matchScreen.style.display = 'flex';

    // Update Map
    mapNameEl.textContent = data.mapName || "Desconocido";
    if (data.mapImageSrc) {
      mapBgEl.style.backgroundImage = `url('${data.mapImageSrc}')`;
    }

    // Render Teams
    renderTeam(data.survivors || [], survivorsList, survivorAvgMmrEl);
    renderTeam(data.infected || [], infectedList, infectedAvgMmrEl);
  }
}

// Main logic
if (!token) {
  connectionStatus.textContent = "Error: Faltan parámetros en la URL (?token=...)";
  connectionStatus.className = "mt-4 text-xs font-bold text-red-400";
} else {
  connectionStatus.textContent = "Conectando a Supabase Realtime...";
  
  const channel = supabaseClient.channel(`obs_${token}`);
  
  channel.on('broadcast', { event: 'match_update' }, ({ payload }) => {
    console.log("Match update received:", payload);
    updateMatchState(payload);
  });

  channel.subscribe((status, err) => {
    console.log("Supabase Status:", status, err);
    if (status === 'SUBSCRIBED') {
      connectionStatus.textContent = "Conectado. Esperando datos...";
      connectionStatus.className = "mt-4 text-xs font-bold text-green-400";
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      connectionStatus.textContent = "Desconectado. Intentando reconectar...";
      connectionStatus.className = "mt-4 text-xs font-bold text-yellow-400";
    }
  });

  // For testing styling via console or URL params
  if (urlParams.get('test') === '1') {
    document.body.classList.add('test-mode');
    setTimeout(() => {
      updateMatchState({
        state: 'ingame',
        mapName: 'Dead Center',
        mapImageSrc: 'https://l4d2center.com/images/maps/Dead%20Center%202025.avif',
        survivors: [
          { playerName: 'Ellis Fan', mmr: 1850, avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg' },
          { playerName: 'ProGamer', mmr: 2100, avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg' }
        ],
        infected: [
          { playerName: 'Hunter Main', mmr: 1950, avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg' },
          { playerName: 'Tank Destroyer', mmr: 2050, avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg' }
        ]
      });
    }, 1000);
  }
}
