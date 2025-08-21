import { getApiUrl, API_CONFIG } from '../../config.js';

// Extend window object for global functions
declare global {
  interface Window {
    joinTournament: (tournamentId: number) => Promise<void>;
    viewTournament: (tournamentId: number) => void;
  }
}

interface Tournament {
  id: number;
  name: string;
  description?: string;
  max_participants: number;
  current_participants: number;
  status: 'registration' | 'in_progress' | 'completed';
  prize?: string;
  start_date?: string;
  created_at: string;
  creator_username?: string;
}

export function init() {
  console.log('Tournament page loaded');
  
  setupEventListeners();
  loadTournaments();
}

function setupEventListeners() {
  // Create tournament button
  const createBtn = document.getElementById('createTournamentBtn');
  createBtn?.addEventListener('click', showCreateTournamentModal);
  
  // Modal controls
  const cancelBtn = document.getElementById('cancelCreateBtn');
  cancelBtn?.addEventListener('click', hideCreateTournamentModal);
  
  // Modal overlay click to close
  const modal = document.getElementById('createTournamentModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideCreateTournamentModal();
    }
  });
  
  // Create tournament form
  const form = document.getElementById('createTournamentForm');
  form?.addEventListener('submit', handleCreateTournament);
  
  // Filter change
  const statusFilter = document.getElementById('statusFilter');
  statusFilter?.addEventListener('change', loadTournaments);
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn?.addEventListener('click', loadTournaments);
}

async function loadTournaments() {
  const grid = document.getElementById('tournamentGrid');
  const loading = document.getElementById('loadingState');
  const empty = document.getElementById('emptyState');
  
  if (!grid || !loading || !empty) return;
  
  // Show loading state
  loading.classList.remove('hidden');
  grid.innerHTML = '';
  empty.classList.add('hidden');
  
  try {
    const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
    const filterValue = statusFilter?.value || '';
    let url = getApiUrl('/api/tournaments');
    
    if (filterValue) {
      url += `?status=${filterValue}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    loading.classList.add('hidden');
    
    if (data.tournaments && data.tournaments.length > 0) {
      renderTournaments(data.tournaments);
    } else {
      empty.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Failed to load tournaments:', error);
    loading.classList.add('hidden');
    grid.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-red-600">Failed to load tournaments. Please try again.</p>
        <button onclick="window.location.reload()" class="mt-2 text-blue-600 hover:text-blue-800">Reload Page</button>
      </div>
    `;
  }
}

function renderTournaments(tournaments: Tournament[]) {
  const grid = document.getElementById('tournamentGrid');
  if (!grid) return;
  
  grid.innerHTML = tournaments.map(tournament => `
    <div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <!-- Tournament Header -->
      <div class="px-6 py-4 border-b bg-gradient-to-r ${getStatusGradient(tournament.status)}">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-white">${escapeHtml(tournament.name)}</h3>
          <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(tournament.status)}">
            ${tournament.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>
      
      <!-- Tournament Content -->
      <div class="px-6 py-4">
        ${tournament.description ? `<p class="text-gray-600 text-sm mb-3">${escapeHtml(tournament.description)}</p>` : ''}
        
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Participants:</span>
            <span class="font-medium">${tournament.current_participants}/${tournament.max_participants}</span>
          </div>
          
          ${tournament.prize ? `
            <div class="flex justify-between">
              <span class="text-gray-500">Prize:</span>
              <span class="font-medium text-yellow-600">${escapeHtml(tournament.prize)}</span>
            </div>
          ` : ''}
          
          <div class="flex justify-between">
            <span class="text-gray-500">Created:</span>
            <span class="font-medium">${formatDate(tournament.created_at)}</span>
          </div>
          
          ${tournament.creator_username ? `
            <div class="flex justify-between">
              <span class="text-gray-500">Creator:</span>
              <span class="font-medium">${escapeHtml(tournament.creator_username)}</span>
            </div>
          ` : ''}
        </div>
        
        <!-- Progress Bar -->
        <div class="mt-4">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Registration Progress</span>
            <span>${tournament.current_participants}/${tournament.max_participants}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                 style="width: ${(tournament.current_participants / tournament.max_participants) * 100}%"></div>
          </div>
        </div>
      </div>
      
      <!-- Tournament Actions -->
      <div class="px-6 py-4 bg-gray-50 border-t">
        <div class="flex space-x-2">
          ${getTournamentActions(tournament)}
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to action buttons
  addTournamentActionListeners();
}

function getTournamentActions(tournament: Tournament): string {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return `
      <button onclick="router.navigate('login')" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors">
        Login to Join
      </button>
    `;
  }
  
  let actions = `
    <button onclick="viewTournament(${tournament.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors">
      View Details
    </button>
  `;
  
  if (tournament.status === 'registration' && tournament.current_participants < tournament.max_participants) {
    actions += `
      <button onclick="joinTournament(${tournament.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm transition-colors">
        Join Tournament
      </button>
    `;
  }
  
  return actions;
}

function addTournamentActionListeners() {
  // Make join and view functions globally available
  window.joinTournament = joinTournament;
  window.viewTournament = viewTournament;
}

async function joinTournament(tournamentId: number): Promise<void> {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    alert('Please login to join tournaments');
    (window as any).router.navigate('login');
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/join`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Successfully joined tournament!');
      loadTournaments(); // Refresh the list
    } else {
      alert(result.error || 'Failed to join tournament');
    }
  } catch (error) {
    console.error('Error joining tournament:', error);
    alert('Failed to join tournament. Please try again.');
  }
}

function viewTournament(tournamentId: number): void {
  (window as any).router.navigate(`tournament-details?id=${tournamentId}`);
}

function showCreateTournamentModal() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    alert('Please login to create tournaments');
    (window as any).router.navigate('login');
    return;
  }
  
  const modal = document.getElementById('createTournamentModal');
  modal?.classList.remove('hidden');
}

function hideCreateTournamentModal() {
  const modal = document.getElementById('createTournamentModal');
  modal?.classList.add('hidden');
  
  // Reset form
  const form = document.getElementById('createTournamentForm') as HTMLFormElement;
  form?.reset();
}

async function handleCreateTournament(e: Event): Promise<void> {
  e.preventDefault();
  
  const formData = new FormData(e.target as HTMLFormElement);
  const tournamentData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    max_participants: parseInt(formData.get('max_participants') as string),
    prize: formData.get('prize') as string
  };
  
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch(getApiUrl('/api/tournaments'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tournamentData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Tournament created successfully!');
      hideCreateTournamentModal();
      loadTournaments(); // Refresh the list
    } else {
      alert(result.error || 'Failed to create tournament');
    }
  } catch (error) {
    console.error('Error creating tournament:', error);
    alert('Failed to create tournament. Please try again.');
  }
}

// Utility functions
function getStatusGradient(status: string): string {
  switch (status) {
    case 'registration': return 'from-green-500 to-green-600';
    case 'in_progress': return 'from-blue-500 to-blue-600';
    case 'completed': return 'from-gray-500 to-gray-600';
    default: return 'from-gray-500 to-gray-600';
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'registration': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}