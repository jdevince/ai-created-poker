import { Injectable, signal, computed } from '@angular/core';
import { Card } from '../models/card.model';
import {
  GameState,
  Phase,
  ActionType,
  PlayerAction,
  SidePot,
  HandResult,
} from '../models/game-state.model';
import { Player, createPlayer } from '../models/player.model';
import { DeckService } from './deck.service';
import { HandEvaluatorService } from './hand-evaluator.service';

const AI_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana',
  'Eddie', 'Fiona', 'George', 'Hannah',
];

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private readonly state = signal<GameState>(this.createInitialState());

  readonly gameState = this.state.asReadonly();

  readonly currentPlayer = computed(() => {
    const s = this.state();
    if (s.currentPlayerIndex < 0 || s.currentPlayerIndex >= s.players.length) return null;
    return s.players[s.currentPlayerIndex];
  });

  readonly isHumanTurn = computed(() => {
    const player = this.currentPlayer();
    return player?.isHuman && !player.isFolded && !player.isAllIn &&
      (this.state().phase === 'pre-flop' || this.state().phase === 'flop' ||
       this.state().phase === 'turn' || this.state().phase === 'river');
  });

  readonly activePlayers = computed(() =>
    this.state().players.filter((p) => !p.isFolded && !p.isEliminated)
  );

  readonly activeNonAllInPlayers = computed(() =>
    this.state().players.filter((p) => !p.isFolded && !p.isEliminated && !p.isAllIn)
  );

  constructor(
    private deck: DeckService,
    private handEvaluator: HandEvaluatorService
  ) {}

  private createInitialState(): GameState {
    return {
      players: [],
      communityCards: [],
      pot: 0,
      sidePots: [],
      dealerIndex: 0,
      currentPlayerIndex: -1,
      phase: 'waiting',
      currentBet: 0,
      minRaise: 20,
      blinds: { small: 10, big: 20 },
      handHistory: [],
      deck: [],
      handNumber: 0,
      winners: [],
    };
  }

  startNewGame(): void {
    const players: Player[] = [
      createPlayer(0, 'You', 1000, true),
      ...AI_NAMES.map((name, i) => createPlayer(i + 1, name, 1000, false)),
    ];

    this.state.set({
      ...this.createInitialState(),
      players,
      dealerIndex: Math.floor(Math.random() * players.length),
    });

    this.startNewHand();
  }

  startNewHand(): void {
    const s = this.state();
    const activePlayers = s.players.filter((p) => !p.isEliminated);

    if (activePlayers.length <= 1) {
      this.state.update((st) => ({ ...st, phase: 'game-over' as Phase }));
      return;
    }

    const humanPlayer = s.players.find((p) => p.isHuman);
    if (humanPlayer?.isEliminated) {
      this.state.update((st) => ({ ...st, phase: 'game-over' as Phase }));
      return;
    }

    let newDeck = this.deck.shuffle(this.deck.createDeck());

    const resetPlayers: Player[] = s.players.map((p) => ({
      ...p,
      holeCards: [] as Card[],
      currentBet: 0,
      totalBetThisHand: 0,
      isFolded: p.isEliminated,
      isAllIn: false,
    }));

    // Deal hole cards
    for (const player of resetPlayers) {
      if (!player.isEliminated) {
        const { dealt, remaining } = this.deck.deal(newDeck, 2);
        player.holeCards = dealt;
        newDeck = remaining;
      }
    }

    // Advance dealer
    let dealerIndex = s.dealerIndex;
    do {
      dealerIndex = (dealerIndex + 1) % resetPlayers.length;
    } while (resetPlayers[dealerIndex].isEliminated);

    // Post blinds
    const sbIndex = this.nextActivePlayer(dealerIndex, resetPlayers);
    const bbIndex = this.nextActivePlayer(sbIndex, resetPlayers);

    const sbPlayer = resetPlayers[sbIndex];
    const bbPlayer = resetPlayers[bbIndex];

    const sbAmount = Math.min(s.blinds.small, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalBetThisHand = sbAmount;
    if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

    const bbAmount = Math.min(s.blinds.big, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalBetThisHand = bbAmount;
    if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

    const pot = sbAmount + bbAmount;

    // First to act pre-flop is left of BB
    const firstToAct = this.nextActivePlayer(bbIndex, resetPlayers);

    this.state.set({
      players: resetPlayers,
      communityCards: [],
      pot,
      sidePots: [],
      dealerIndex,
      currentPlayerIndex: firstToAct,
      phase: 'pre-flop',
      currentBet: s.blinds.big,
      minRaise: s.blinds.big,
      blinds: s.blinds,
      handHistory: [],
      deck: newDeck,
      handNumber: s.handNumber + 1,
      winners: [],
    });
  }

  getValidActions(): { action: ActionType; minAmount?: number; maxAmount?: number }[] {
    const s = this.state();
    const player = s.players[s.currentPlayerIndex];
    if (!player || player.isFolded || player.isAllIn) return [];

    const actions: { action: ActionType; minAmount?: number; maxAmount?: number }[] = [];
    const toCall = s.currentBet - player.currentBet;

    actions.push({ action: 'fold' });

    if (toCall === 0) {
      actions.push({ action: 'check' });
    } else if (toCall > 0 && player.chips > toCall) {
      actions.push({ action: 'call', minAmount: toCall, maxAmount: toCall });
    }

    // Raise
    const minRaiseTotal = s.currentBet + s.minRaise;
    const maxRaiseTotal = player.currentBet + player.chips;
    if (maxRaiseTotal > s.currentBet && player.chips > toCall) {
      const minRaiseAmount = Math.min(minRaiseTotal - player.currentBet, player.chips);
      actions.push({
        action: 'raise',
        minAmount: minRaiseAmount,
        maxAmount: player.chips,
      });
    }

    // All-in is always available
    if (player.chips > 0) {
      actions.push({ action: 'all-in', minAmount: player.chips, maxAmount: player.chips });
    }

    return actions;
  }

  performAction(action: ActionType, amount?: number): void {
    const s = this.state();
    const playerIndex = s.currentPlayerIndex;
    const player = { ...s.players[playerIndex] };
    const players = [...s.players];

    const historyEntry: PlayerAction = {
      playerId: player.id,
      playerName: player.name,
      action,
      amount,
      phase: s.phase,
    };

    let newPot = s.pot;
    let newCurrentBet = s.currentBet;
    let newMinRaise = s.minRaise;

    switch (action) {
      case 'fold':
        player.isFolded = true;
        break;

      case 'check':
        break;

      case 'call': {
        const toCall = Math.min(s.currentBet - player.currentBet, player.chips);
        player.chips -= toCall;
        player.currentBet += toCall;
        player.totalBetThisHand += toCall;
        newPot += toCall;
        historyEntry.amount = toCall;
        if (player.chips === 0) player.isAllIn = true;
        break;
      }

      case 'raise': {
        const raiseAmount = amount!;
        player.chips -= raiseAmount;
        const oldBet = player.currentBet;
        player.currentBet += raiseAmount;
        player.totalBetThisHand += raiseAmount;
        newPot += raiseAmount;
        const raiseOverPrevious = player.currentBet - newCurrentBet;
        if (raiseOverPrevious > newMinRaise) {
          newMinRaise = raiseOverPrevious;
        }
        newCurrentBet = player.currentBet;
        historyEntry.amount = raiseAmount;
        if (player.chips === 0) player.isAllIn = true;
        break;
      }

      case 'all-in': {
        const allInAmount = player.chips;
        player.currentBet += allInAmount;
        player.totalBetThisHand += allInAmount;
        newPot += allInAmount;
        player.chips = 0;
        player.isAllIn = true;
        if (player.currentBet > newCurrentBet) {
          const raiseOverPrevious = player.currentBet - newCurrentBet;
          if (raiseOverPrevious >= newMinRaise) {
            newMinRaise = raiseOverPrevious;
          }
          newCurrentBet = player.currentBet;
        }
        historyEntry.amount = allInAmount;
        break;
      }
    }

    players[playerIndex] = player;

    this.state.update((st) => ({
      ...st,
      players,
      pot: newPot,
      currentBet: newCurrentBet,
      minRaise: newMinRaise,
      handHistory: [...st.handHistory, historyEntry],
    }));

    this.advanceAction();
  }

  private advanceAction(): void {
    const s = this.state();

    // Check if only one player remains
    const nonFolded = s.players.filter((p) => !p.isFolded && !p.isEliminated);
    if (nonFolded.length === 1) {
      this.awardPotToLastPlayer(nonFolded[0]);
      return;
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advancePhase();
      return;
    }

    // Move to next active player
    const nextIdx = this.findNextPlayerToAct();
    if (nextIdx === -1) {
      this.advancePhase();
      return;
    }

    this.state.update((st) => ({
      ...st,
      currentPlayerIndex: nextIdx,
    }));
  }

  private isBettingRoundComplete(): boolean {
    const s = this.state();
    const activePlayers = s.players.filter(
      (p) => !p.isFolded && !p.isEliminated && !p.isAllIn
    );

    if (activePlayers.length === 0) return true;
    if (activePlayers.length === 1 && s.currentBet === activePlayers[0].currentBet) return true;

    // All active players must have matched the current bet
    return activePlayers.every((p) => p.currentBet === s.currentBet) &&
      this.allPlayersHaveActed();
  }

  private allPlayersHaveActed(): boolean {
    const s = this.state();
    const actionsThisPhase = s.handHistory.filter((a) => a.phase === s.phase);
    const activePlayers = s.players.filter(
      (p) => !p.isFolded && !p.isEliminated && !p.isAllIn
    );

    // Each active player must have acted at least once this phase
    for (const player of activePlayers) {
      if (!actionsThisPhase.some((a) => a.playerId === player.id)) {
        return false;
      }
    }
    return true;
  }

  private findNextPlayerToAct(): number {
    const s = this.state();
    let idx = s.currentPlayerIndex;
    const startIdx = idx;

    do {
      idx = (idx + 1) % s.players.length;
      const player = s.players[idx];
      if (!player.isFolded && !player.isEliminated && !player.isAllIn) {
        // Check if this player still needs to act
        if (player.currentBet < s.currentBet || !this.hasPlayerActedThisPhase(player.id)) {
          return idx;
        }
      }
      if (idx === startIdx) break;
    } while (true);

    return -1;
  }

  private hasPlayerActedThisPhase(playerId: number): boolean {
    const s = this.state();
    return s.handHistory.some((a) => a.playerId === playerId && a.phase === s.phase);
  }

  private advancePhase(): void {
    const s = this.state();

    // Reset current bets for the new round
    const players = s.players.map((p) => ({ ...p, currentBet: 0 }));

    let newPhase: Phase;
    let newCommunityCards = [...s.communityCards];
    let newDeck = [...s.deck];

    switch (s.phase) {
      case 'pre-flop':
        newPhase = 'flop';
        break;
      case 'flop':
        newPhase = 'turn';
        break;
      case 'turn':
        newPhase = 'river';
        break;
      case 'river':
        newPhase = 'showdown';
        break;
      default:
        return;
    }

    // Deal community cards
    if (newPhase === 'flop') {
      // Burn one, deal three
      newDeck = newDeck.slice(1);
      const { dealt, remaining } = this.deck.deal(newDeck, 3);
      newCommunityCards = dealt;
      newDeck = remaining;
    } else if (newPhase === 'turn' || newPhase === 'river') {
      // Burn one, deal one
      newDeck = newDeck.slice(1);
      const { dealt, remaining } = this.deck.deal(newDeck, 1);
      newCommunityCards = [...newCommunityCards, ...dealt];
      newDeck = remaining;
    }

    if (newPhase === 'showdown') {
      this.state.update((st) => ({
        ...st,
        players,
        phase: newPhase,
        currentBet: 0,
        communityCards: newCommunityCards,
        deck: newDeck,
      }));
      this.resolveShowdown();
      return;
    }

    // Check if we need to skip to showdown (all players all-in or only one can act)
    const canAct = players.filter((p) => !p.isFolded && !p.isEliminated && !p.isAllIn);

    if (canAct.length <= 1) {
      // Still deal the remaining community cards, but skip betting
      this.state.update((st) => ({
        ...st,
        players,
        phase: newPhase,
        currentBet: 0,
        communityCards: newCommunityCards,
        deck: newDeck,
        currentPlayerIndex: -1,
      }));

      // Auto-advance to next phase
      setTimeout(() => this.advancePhase(), 800);
      return;
    }

    // Find first to act (left of dealer)
    const firstToAct = this.nextActivePlayerNotAllIn(s.dealerIndex, players);

    this.state.update((st) => ({
      ...st,
      players,
      phase: newPhase,
      currentBet: 0,
      minRaise: s.blinds.big,
      communityCards: newCommunityCards,
      deck: newDeck,
      currentPlayerIndex: firstToAct,
    }));
  }

  private resolveShowdown(): void {
    const s = this.state();
    const nonFolded = s.players.filter((p) => !p.isFolded && !p.isEliminated);

    // Evaluate hands
    const playerHands = nonFolded.map((p) => ({
      player: p,
      hand: this.handEvaluator.evaluateBestHand([...p.holeCards, ...s.communityCards]),
    }));

    // Calculate side pots
    const pots = this.calculateSidePots(s.players);

    const winners: { playerId: number; amount: number; handDescription: string }[] = [];
    const players = s.players.map((p) => ({ ...p }));

    for (const pot of pots) {
      const eligible = playerHands.filter((ph) =>
        pot.eligiblePlayerIds.includes(ph.player.id)
      );

      if (eligible.length === 0) continue;

      // Sort by hand strength (descending)
      eligible.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));

      // Find all winners (ties)
      const bestHand = eligible[0].hand;
      const potWinners = eligible.filter(
        (e) => this.handEvaluator.compareHands(e.hand, bestHand) === 0
      );

      const share = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount % potWinners.length;

      potWinners.forEach((pw, i) => {
        const winAmount = share + (i === 0 ? remainder : 0);
        const existing = winners.find((w) => w.playerId === pw.player.id);
        if (existing) {
          existing.amount += winAmount;
        } else {
          winners.push({
            playerId: pw.player.id,
            amount: winAmount,
            handDescription: pw.hand.description,
          });
        }
        const playerToUpdate = players.find((p) => p.id === pw.player.id)!;
        playerToUpdate.chips += winAmount;
      });
    }

    this.state.update((st) => ({
      ...st,
      players,
      winners,
      phase: 'hand-complete' as Phase,
    }));
  }

  calculateSidePots(players: Player[]): SidePot[] {
    const contributors = players
      .filter((p) => !p.isEliminated && p.totalBetThisHand > 0)
      .sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);

    if (contributors.length === 0) return [];

    const pots: SidePot[] = [];
    let processedAmount = 0;

    const allInAmounts = [...new Set(
      contributors.filter((p) => p.isAllIn).map((p) => p.totalBetThisHand)
    )].sort((a, b) => a - b);

    // Add the max bet if not already covered
    const maxBet = Math.max(...contributors.map((p) => p.totalBetThisHand));
    if (!allInAmounts.includes(maxBet)) {
      allInAmounts.push(maxBet);
    }

    if (allInAmounts.length === 0) {
      allInAmounts.push(maxBet);
    }

    for (const threshold of allInAmounts) {
      if (threshold <= processedAmount) continue;

      const levelContribution = threshold - processedAmount;
      let potAmount = 0;
      const eligible: number[] = [];

      for (const p of contributors) {
        const contribution = Math.min(p.totalBetThisHand - processedAmount, levelContribution);
        if (contribution > 0) {
          potAmount += contribution;
        }
        if (!p.isFolded && p.totalBetThisHand >= threshold) {
          eligible.push(p.id);
        }
      }

      if (potAmount > 0) {
        pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
      }

      processedAmount = threshold;
    }

    return pots;
  }

  private awardPotToLastPlayer(winner: Player): void {
    const s = this.state();
    const players = s.players.map((p) => {
      if (p.id === winner.id) {
        return { ...p, chips: p.chips + s.pot };
      }
      return { ...p };
    });

    this.state.update((st) => ({
      ...st,
      players,
      winners: [{ playerId: winner.id, amount: s.pot, handDescription: 'Last player standing' }],
      phase: 'hand-complete' as Phase,
      pot: 0,
    }));
  }

  continueToNextHand(): void {
    // Eliminate players with 0 chips
    const s = this.state();
    const players = s.players.map((p) => ({
      ...p,
      isEliminated: p.isEliminated || p.chips <= 0,
    }));

    this.state.update((st) => ({ ...st, players }));
    this.startNewHand();
  }

  private nextActivePlayer(fromIndex: number, players: Player[]): number {
    let idx = fromIndex;
    do {
      idx = (idx + 1) % players.length;
    } while (players[idx].isEliminated || players[idx].isFolded);
    return idx;
  }

  private nextActivePlayerNotAllIn(fromIndex: number, players: Player[]): number {
    let idx = fromIndex;
    const start = idx;
    do {
      idx = (idx + 1) % players.length;
      if (!players[idx].isEliminated && !players[idx].isFolded && !players[idx].isAllIn) {
        return idx;
      }
    } while (idx !== start);
    return -1;
  }

  getSmallBlindIndex(): number {
    const s = this.state();
    return this.nextActivePlayer(s.dealerIndex, s.players);
  }

  getBigBlindIndex(): number {
    const sbIndex = this.getSmallBlindIndex();
    return this.nextActivePlayer(sbIndex, this.state().players);
  }
}
