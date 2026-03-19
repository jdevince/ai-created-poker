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
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
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
  private previousPhase: string = 'waiting';

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

  private phaseResetEffect = effect(() => {
    const phase = this.gameState().phase;
    if (phase !== this.previousPhase) {
      this.previousPhase = phase;
      this.lastActions.set(new Map());
    }
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

    const delay = 1000; //1 second
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
