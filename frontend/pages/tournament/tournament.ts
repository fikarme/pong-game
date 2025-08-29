import { Component } from '../../core/Component.js';

interface TournamentMatch {
    id: string;
    player1: string;
    player2: string;
    score1: number | null;
    score2: number | null;
    status: 'pending' | 'active' | 'completed';
    winner?: string;
}

interface TournamentData {
    id: string;
    name: string;
    participants: string[];
    matches: TournamentMatch[];
    currentRound: number;
    status: 'active' | 'completed' | 'scheduled';
    prizePool: number;
    startTime: Date;
    endTime?: Date;
}

export class TournamentPage extends Component {
    private tournamentData: TournamentData;
    private animationInterval: number | null = null;
    private countdownInterval: number | null = null;

    constructor() {
        super();
        this.tournamentData = this.getMockTournamentData();
    }

    async render(): Promise<string> {
        // The HTML is loaded separately, this component handles the dynamic behavior
        return '';
    }

    async mount(): Promise<void> {
        await this.initializeAnimations();
        this.startCountdown();
        this.addEventListeners();
        this.updateTournamentDisplay();
    }

    async unmount(): Promise<void> {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    private getMockTournamentData(): TournamentData {
        return {
            id: '2025-TRN-001',
            name: 'Neon Championship',
            participants: [
                'CYBER_KNIGHT',
                'NEON_GHOST',
                'PIXEL_WARRIOR',
                'MATRIX_BLADE',
                'SYNTHWAVE_ACE',
                'RETRO_FURY',
                'ELECTRIC_STORM',
                'NEON_VIPER'
            ],
            matches: [
                {
                    id: 'match-1',
                    player1: 'CYBER_KNIGHT',
                    player2: 'NEON_GHOST',
                    score1: 15,
                    score2: 12,
                    status: 'completed',
                    winner: 'CYBER_KNIGHT'
                },
                {
                    id: 'match-2',
                    player1: 'PIXEL_WARRIOR',
                    player2: 'MATRIX_BLADE',
                    score1: 15,
                    score2: 9,
                    status: 'completed',
                    winner: 'PIXEL_WARRIOR'
                },
                {
                    id: 'match-3',
                    player1: 'SYNTHWAVE_ACE',
                    player2: 'RETRO_FURY',
                    score1: null,
                    score2: null,
                    status: 'active'
                },
                {
                    id: 'match-4',
                    player1: 'ELECTRIC_STORM',
                    player2: 'NEON_VIPER',
                    score1: null,
                    score2: null,
                    status: 'pending'
                }
            ],
            currentRound: 1,
            status: 'active',
            prizePool: 1000,
            startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
        };
    }

    private async initializeAnimations(): Promise<void> {
        // Animate the bracket entrance
        this.animateBracketEntrance();

        // Start scan line animation
        this.startScanlineAnimation();

        // Animate glow orbs
        this.animateGlowOrbs();

        // Add typing animation to terminal
        this.animateTerminal();
    }

    private animateBracketEntrance(): void {
        const rounds = document.querySelectorAll('.bracket-round');
        rounds.forEach((round, index) => {
            const roundElement = round as HTMLElement;
            roundElement.style.opacity = '0';
            roundElement.style.transform = 'translateX(-50px)';

            setTimeout(() => {
                roundElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                roundElement.style.opacity = '1';
                roundElement.style.transform = 'translateX(0)';
            }, index * 200);
        });

        // Animate connectors
        const connectors = document.querySelectorAll('.bracket-connectors');
        connectors.forEach((connector, index) => {
            const connectorElement = connector as HTMLElement;
            connectorElement.style.opacity = '0';

            setTimeout(() => {
                connectorElement.style.transition = 'opacity 0.6s ease-in-out';
                connectorElement.style.opacity = '1';
            }, (rounds.length * 200) + (index * 150));
        });
    }

    private startScanlineAnimation(): void {
        const scanLines = document.querySelector('.scan-lines') as HTMLElement;
        if (scanLines) {
            let position = 0;
            this.animationInterval = setInterval(() => {
                position = (position + 2) % window.innerHeight;
                scanLines.style.transform = `translateY(${position}px)`;
            }, 50);
        }
    }

    private animateGlowOrbs(): void {
        const orbs = document.querySelectorAll('.glow-orb');
        orbs.forEach((orb, index) => {
            const orbElement = orb as HTMLElement;
            const baseDelay = index * 2000;

            setInterval(() => {
                orbElement.style.animation = 'none';
                setTimeout(() => {
                    orbElement.style.animation = `glow-pulse 3s ease-in-out infinite`;
                }, 10);
            }, 8000 + baseDelay);
        });
    }

    private animateTerminal(): void {
        const cursor = document.querySelector('.cursor') as HTMLElement;
        if (cursor) {
            setInterval(() => {
                cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
            }, 800);
        }
    }

    private startCountdown(): void {
        const countdownElement = document.querySelector('.countdown') as HTMLElement;
        if (!countdownElement) return;

        // Set tournament end time (24 hours from start)
        const endTime = new Date(this.tournamentData.startTime.getTime() + 24 * 60 * 60 * 1000);

        this.countdownInterval = setInterval(() => {
            const now = new Date();
            const timeLeft = endTime.getTime() - now.getTime();

            if (timeLeft <= 0) {
                countdownElement.textContent = '00:00:00';
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                }
                return;
            }

            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            countdownElement.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    private updateTournamentDisplay(): void {
        // Update match statuses with live data
        this.tournamentData.matches.forEach(match => {
            const matchElement = document.querySelector(`[data-match="${match.id.split('-')[1]}"]`);
            if (matchElement) {
                this.updateMatchDisplay(matchElement as HTMLElement, match);
            }
        });

        // Add pulsing effect to active matches
        this.addActiveMatchEffects();
    }

    private updateMatchDisplay(element: HTMLElement, match: TournamentMatch): void {
        const player1Score = element.querySelector('.player-1 .player-score') as HTMLElement;
        const player2Score = element.querySelector('.player-2 .player-score') as HTMLElement;
        const matchStatus = element.querySelector('.match-status') as HTMLElement;

        if (player1Score) {
            player1Score.textContent = match.score1?.toString() || '--';
        }
        if (player2Score) {
            player2Score.textContent = match.score2?.toString() || '--';
        }
        if (matchStatus) {
            matchStatus.textContent = match.status.toUpperCase();
            matchStatus.className = `match-status ${match.status}`;
        }

        // Highlight winner
        if (match.winner) {
            const winnerElement = match.winner === match.player1 ?
                element.querySelector('.player-1') :
                element.querySelector('.player-2');
            winnerElement?.classList.add('winner');
        }
    }

    private addActiveMatchEffects(): void {
        const activeMatches = document.querySelectorAll('.match-status.active');
        activeMatches.forEach(status => {
            const matchElement = status.closest('.match') as HTMLElement;
            if (matchElement) {
                matchElement.classList.add('active-match');

                // Add periodic glow effect
                setInterval(() => {
                    matchElement.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
                    setTimeout(() => {
                        matchElement.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)';
                    }, 1000);
                }, 3000);
            }
        });
    }

    private addEventListeners(): void {
        // Add click handlers for matches
        const matches = document.querySelectorAll('.match');
        matches.forEach(match => {
            match.addEventListener('click', (e) => {
                this.handleMatchClick(e.currentTarget as HTMLElement);
            });
        });

        // Add hover effects
        matches.forEach(match => {
            match.addEventListener('mouseenter', (e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'scale(1.02)';
                target.style.transition = 'transform 0.2s ease-out';
            });

            match.addEventListener('mouseleave', (e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'scale(1)';
            });
        });
    }

    private handleMatchClick(matchElement: HTMLElement): void {
        const matchId = matchElement.getAttribute('data-match');
        console.log(`Match ${matchId} clicked`);

        // Add click effect
        matchElement.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            matchElement.style.filter = 'brightness(1)';
        }, 200);

        // Here you could navigate to match details or trigger match actions
        this.showMatchDetails(matchId);
    }

    private showMatchDetails(matchId: string | null): void {
        if (!matchId) return;

        // Create a terminal-style popup
        const popup = document.createElement('div');
        popup.className = 'match-details-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <span>[MATCH_DETAILS]</span>
                    <button class="close-btn">X</button>
                </div>
                <div class="popup-body">
                    <p>MATCH_ID: ${matchId}</p>
                    <p>STATUS: LOADING...</p>
                    <p>SPECTATE: AVAILABLE</p>
                    <p>REPLAY: PENDING</p>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Add close functionality
        const closeBtn = popup.querySelector('.close-btn');
        closeBtn?.addEventListener('click', () => {
            popup.remove();
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 3000);
    }
}

// Export init function for the router
export function init() {
    const tournamentPage = new TournamentPage();
    tournamentPage.mount();
}

// Initialize the tournament page (fallback for direct loading)
document.addEventListener('DOMContentLoaded', () => {
    const tournamentPage = new TournamentPage();
    tournamentPage.mount();
});
