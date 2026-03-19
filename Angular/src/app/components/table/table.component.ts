import { Component, OnInit, computed, signal, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameEngineService } from '../../services/game-engine.service';
import { AIService } from '../../services/ai.service';
import { PlayerComponent } from '../player/player.component';
import { CardComponent } from '../card/card.component';
import { ActionPanelComponent } from '../action-panel/action-panel.component';
import { HandHistoryComponent } from '../hand-history/hand-history.component';
import { GameOverComponent } from '../game-over/game-over.component';
import { ActionType, Phase } from '../../models/game-state.model';

interface PlayerPosition {
  top: string;
  left: string;
  transform: string;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    DecimalPipe,
    PlayerComponent,
    CardComponent,
    ActionPanelComponent,
    HandHistoryComponent,
    GameOverComponent,
  ],
  template: `
    <div class="game-wrapper">
      @if (gameState().phase === 'waiting') {
        <div class="start-screen">
          <h1>Texas Hold 'Em</h1>
          <p>9-Player No-Limit Hold 'Em</p>
          <button class="btn-start" (click)="startGame()">Deal Me In</button>
        </div>
      } @else {
        <div class="table-area">
          <div class="table-felt">
            <!-- Pot -->
            <div class="pot-display">
              <span class="pot-label">POT</span>
              <span class="pot-amount">{{ gameState().pot | number }}</span>
            </div>

            <!-- Community Cards -->
            <div class="community-cards">
              @for (card of gameState().communityCards; track $index) {
                <div class="community-card-wrapper" [style.animation-delay]="$index * 150 + 'ms'">
                  <app-card [card]="card" [faceUp]="true" />
                </div>
              }
              @for (_ of emptySlots(); track $index) {
                <div class="community-card-placeholder"></div>
              }
            </div>

            <!-- Phase indicator -->
            <div class="phase-indicator">{{ phaseLabel() }}</div>
          </div>

          <!-- Players positioned around the table -->
          @for (player of gameState().players; track player.id; let i = $index) {
            <div class="player-seat" [style.top]="seatPositions[i].top"
                 [style.left]="seatPositions[i].left"
                 [style.transform]="seatPositions[i].transform">
              <app-player
                [player]="player"
                [isActive]="i === gameState().currentPlayerIndex"
                [isDealer]="i === gameState().dealerIndex"
                [isSmallBlind]="i === smallBlindIndex()"
                [isBigBlind]="i === bigBlindIndex()"
                [showCards]="showAllCards()"
                [lastAction]="getLastAction(player.id)"
              />
            </div>
          }
        </div>

        <!-- Action Panel -->
        <div class="action-panel-wrapper">
          @if (isHumanTurn()) {
            <app-action-panel
              [validActions]="validActions()"
              [visible]="true"
              [potSize]="gameState().pot"
              (actionSelected)="onPlayerAction($event)"
            />
          }

          @if (gameState().phase === 'hand-complete') {
            <div class="hand-result">
              @for (winner of gameState().winners; track winner.playerId) {
                <div class="winner-info">
                  <span class="winner-name">{{ getPlayerName(winner.playerId) }}</span>
                  wins {{ winner.amount | number }} chips
                  @if (winner.handDescription !== 'Last player standing') {
                    <span class="winner-hand">with {{ winner.handDescription }}</span>
                  }
                </div>
              }
              <button class="btn-continue" (click)="continueGame()">
                Next Hand
              </button>
            </div>
          }
        </div>

        <!-- Hand History -->
        <app-hand-history [history]="gameState().handHistory" />

        <!-- Game Over -->
        @if (gameState().phase === 'game-over') {
          <app-game-over
            [winner]="gameWinner()"
            (newGame)="startGame()"
          />
        }
      }
    </div>
  `,
  styles: [`
    .game-wrapper {
      width: 100vw;
      height: 100vh;
      background: linear-gradient(145deg, #0a0a1a, #1a1a2e);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    .start-screen {
      text-align: center;
    }

    .start-screen h1 {
      color: #ffd54f;
      font-size: 48px;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 10px rgba(255, 213, 79, 0.3);
    }

    .start-screen p {
      color: #aaa;
      font-size: 18px;
      margin: 0 0 32px 0;
    }

    .btn-start {
      padding: 16px 48px;
      background: linear-gradient(135deg, #2e7d32, #43a047);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .btn-start:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(46, 125, 50, 0.4);
    }

    .table-area {
      position: relative;
      width: 900px;
      height: 500px;
    }

    .table-felt {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 620px;
      height: 320px;
      background: radial-gradient(ellipse, #2e7d32 0%, #1b5e20 60%, #0d3b0d 100%);
      border-radius: 160px;
      border: 12px solid #4e342e;
      box-shadow:
        0 0 0 6px #3e2723,
        0 0 40px rgba(0, 0, 0, 0.5),
        inset 0 0 60px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .pot-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .pot-label {
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
    }

    .pot-amount {
      color: #ffd54f;
      font-size: 24px;
      font-weight: 700;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .community-cards {
      display: flex;
      gap: 6px;
    }

    .community-card-wrapper {
      animation: dealCard 0.4s ease forwards;
    }

    .community-card-placeholder {
      width: 50px;
      height: 72px;
      border-radius: 6px;
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }

    .phase-indicator {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .player-seat {
      position: absolute;
    }

    .action-panel-wrapper {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
    }

    .hand-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }

    .winner-info {
      color: #ffd54f;
      font-size: 16px;
      font-weight: 500;
    }

    .winner-name {
      font-weight: 700;
      color: #66bb6a;
    }

    .winner-hand {
      color: #90caf9;
      font-style: italic;
    }

    .btn-continue {
      padding: 10px 28px;
      background: #1565c0;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-continue:hover {
      background: #1976d2;
      transform: translateY(-1px);
    }

    @keyframes dealCard {
      from {
        opacity: 0;
        transform: scale(0.5) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `],
})
export class TableComponent implements OnInit {
  // 9 seat positions around the oval table
  seatPositions: PlayerPosition[] = [
    { top: '85%', left: '50%', transform: 'translate(-50%, -50%)' },   // 0: bottom center (human)
    { top: '75%', left: '15%', transform: 'translate(-50%, -50%)' },   // 1: bottom-left
    { top: '45%', left: '2%', transform: 'translate(-50%, -50%)' },    // 2: left
    { top: '12%', left: '15%', transform: 'translate(-50%, -50%)' },   // 3: top-left
    { top: '0%', left: '35%', transform: 'translate(-50%, -50%)' },    // 4: top-left-center
    { top: '0%', left: '65%', transform: 'translate(-50%, -50%)' },    // 5: top-right-center
    { top: '12%', left: '85%', transform: 'translate(-50%, -50%)' },   // 6: top-right
    { top: '45%', left: '98%', transform: 'translate(-50%, -50%)' },   // 7: right
    { top: '75%', left: '85%', transform: 'translate(-50%, -50%)' },   // 8: bottom-right
  ];

  private lastActions = signal<Map<number, string>>(new Map());

  gameState = computed(() => this.engine.gameState());
  isHumanTurn = computed(() => this.engine.isHumanTurn());
  validActions = computed(() => this.engine.getValidActions());

  smallBlindIndex = computed(() => this.engine.getSmallBlindIndex());
  bigBlindIndex = computed(() => this.engine.getBigBlindIndex());

  showAllCards = computed(() => {
    const phase = this.gameState().phase;
    return phase === 'showdown' || phase === 'hand-complete';
  });

  phaseLabel = computed(() => {
    const phase = this.gameState().phase;
    const labels: Record<string, string> = {
      'pre-flop': 'Pre-Flop',
      'flop': 'Flop',
      'turn': 'Turn',
      'river': 'River',
      'showdown': 'Showdown',
      'hand-complete': 'Hand Complete',
    };
    return labels[phase] || '';
  });

  emptySlots = computed(() => {
    const count = 5 - this.gameState().communityCards.length;
    return new Array(Math.max(0, count));
  });

  gameWinner = computed(() => {
    const players = this.gameState().players;
    const alive = players.filter((p) => !p.isEliminated);
    return alive.length === 1 ? alive[0] : null;
  });

  private aiActionEffect = effect(() => {
    const state = this.gameState();
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (
      currentPlayer &&
      !currentPlayer.isHuman &&
      !currentPlayer.isFolded &&
      !currentPlayer.isAllIn &&
      !currentPlayer.isEliminated &&
      (state.phase === 'pre-flop' || state.phase === 'flop' ||
       state.phase === 'turn' || state.phase === 'river')
    ) {
      this.scheduleAIAction();
    }
  });

  constructor(
    private engine: GameEngineService,
    private ai: AIService
  ) {}

  ngOnInit(): void {}

  startGame(): void {
    this.engine.startNewGame();
  }

  onPlayerAction(event: { action: ActionType; amount?: number }): void {
    this.updateLastAction(
      this.gameState().players[this.gameState().currentPlayerIndex].id,
      event.action
    );
    this.engine.performAction(event.action, event.amount);
  }

  continueGame(): void {
    this.lastActions.set(new Map());
    this.engine.continueToNextHand();
  }

  getPlayerName(playerId: number): string {
    return this.gameState().players.find((p) => p.id === playerId)?.name ?? '';
  }

  getLastAction(playerId: number): string | null {
    return this.lastActions().get(playerId) ?? null;
  }

  private updateLastAction(playerId: number, action: string): void {
    const map = new Map(this.lastActions());
    map.set(playerId, action);
    this.lastActions.set(map);
  }

  private aiActionPending = false;

  private scheduleAIAction(): void {
    if (this.aiActionPending) return;
    this.aiActionPending = true;

    const delay = 3000 + Math.random() * 2000; // 3-5s delay
    setTimeout(() => {
      this.aiActionPending = false;
      const state = this.engine.gameState();
      const player = state.players[state.currentPlayerIndex];

      if (
        player &&
        !player.isHuman &&
        !player.isFolded &&
        !player.isAllIn &&
        !player.isEliminated
      ) {
        const validActions = this.engine.getValidActions();
        if (validActions.length > 0) {
          const decision = this.ai.makeDecision(player, state, validActions);
          this.updateLastAction(player.id, decision.action);
          this.engine.performAction(decision.action, decision.amount);
        }
      }
    }, delay);
  }
}
