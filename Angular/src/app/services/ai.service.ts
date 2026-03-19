import { Injectable } from '@angular/core';
import { Card, Rank, Suit } from '../models/card.model';
import { GameState, ActionType, HandRank } from '../models/game-state.model';
import { Player } from '../models/player.model';
import { HandEvaluatorService } from './hand-evaluator.service';

interface AIDecision {
  action: ActionType;
  amount?: number;
}

@Injectable({ providedIn: 'root' })
export class AIService {
  constructor(private handEvaluator: HandEvaluatorService) {}

  makeDecision(
    player: Player,
    state: GameState,
    validActions: { action: ActionType; minAmount?: number; maxAmount?: number }[]
  ): AIDecision {
    const toCall = state.currentBet - player.currentBet;
    const potSize = state.pot;
    const handStrength = this.evaluateHandStrength(player, state);
    const position = this.getPositionScore(player, state);
    const potOdds = toCall > 0 ? toCall / (potSize + toCall) : 0;

    // Combine factors into an action score
    let aggressiveness = handStrength + position * 0.1 + (Math.random() * 0.2 - 0.1);

    // Pre-flop: use starting hand strength
    if (state.phase === 'pre-flop') {
      const startingHandStrength = this.getStartingHandStrength(player.holeCards);
      aggressiveness = startingHandStrength + position * 0.1 + (Math.random() * 0.15 - 0.075);
    }

    const hasCheck = validActions.some((a) => a.action === 'check');
    const hasCall = validActions.some((a) => a.action === 'call');
    const hasRaise = validActions.some((a) => a.action === 'raise');
    const raiseAction = validActions.find((a) => a.action === 'raise');

    // Strong hand: raise or call
    if (aggressiveness > 0.75) {
      if (hasRaise && raiseAction && Math.random() > 0.3) {
        const raiseSize = this.calculateRaiseSize(
          raiseAction.minAmount!,
          raiseAction.maxAmount!,
          potSize,
          aggressiveness
        );
        return { action: 'raise', amount: raiseSize };
      }
      if (hasCall) return { action: 'call' };
      if (hasCheck) return { action: 'check' };
    }

    // Medium hand: call or check, sometimes raise
    if (aggressiveness > 0.45) {
      if (hasCheck) return { action: 'check' };
      if (hasCall && potOdds < aggressiveness) return { action: 'call' };
      if (hasRaise && raiseAction && Math.random() > 0.75) {
        return { action: 'raise', amount: raiseAction.minAmount! };
      }
      if (hasCall) return { action: 'call' };
    }

    // Marginal hand: check or fold
    if (aggressiveness > 0.25) {
      if (hasCheck) return { action: 'check' };
      if (hasCall && toCall <= state.blinds.big * 2 && Math.random() > 0.4) {
        return { action: 'call' };
      }
      // Occasional bluff
      if (hasRaise && raiseAction && Math.random() > 0.9) {
        return { action: 'raise', amount: raiseAction.minAmount! };
      }
      return { action: 'fold' };
    }

    // Weak hand: usually fold
    if (hasCheck) return { action: 'check' };
    if (hasCall && toCall <= state.blinds.big && Math.random() > 0.6) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }

  private evaluateHandStrength(player: Player, state: GameState): number {
    if (state.communityCards.length === 0) {
      return this.getStartingHandStrength(player.holeCards);
    }

    const allCards = [...player.holeCards, ...state.communityCards];
    const handResult = this.handEvaluator.evaluateBestHand(allCards);

    // Normalize hand rank to 0-1 scale
    const rankScore = handResult.rank / HandRank.RoyalFlush;

    // Additional value for higher cards
    const highCardBonus = handResult.value / 14 * 0.1;

    return Math.min(rankScore + highCardBonus + 0.15, 1.0);
  }

  private getStartingHandStrength(cards: Card[]): number {
    if (cards.length < 2) return 0.3;

    const [c1, c2] = cards;
    const high = Math.max(c1.rank, c2.rank);
    const low = Math.min(c1.rank, c2.rank);
    const suited = c1.suit === c2.suit;
    const paired = c1.rank === c2.rank;

    if (paired) {
      if (high >= Rank.Jack) return 0.9;
      if (high >= Rank.Eight) return 0.7;
      return 0.6;
    }

    let strength = (high + low) / 28;

    if (suited) strength += 0.06;
    if (high - low <= 2) strength += 0.04; // connectors

    // Premium hands
    if (high === Rank.Ace) {
      if (low >= Rank.Ten) return suited ? 0.85 : 0.75;
      if (suited) return 0.55;
      return 0.45;
    }

    if (high === Rank.King && low >= Rank.Ten) {
      return suited ? 0.7 : 0.6;
    }

    return Math.min(Math.max(strength, 0.15), 0.9);
  }

  private getPositionScore(player: Player, state: GameState): number {
    const totalPlayers = state.players.filter(
      (p) => !p.isFolded && !p.isEliminated
    ).length;
    const dealerIdx = state.dealerIndex;
    const playerIdx = state.players.indexOf(
      state.players.find((p) => p.id === player.id)!
    );

    // Distance from dealer (later position = better)
    let distance = playerIdx - dealerIdx;
    if (distance < 0) distance += state.players.length;

    return distance / totalPlayers;
  }

  private calculateRaiseSize(
    min: number,
    max: number,
    potSize: number,
    strength: number
  ): number {
    // Value-based sizing
    let targetSize: number;

    if (strength > 0.85) {
      // Very strong: pot-sized raise
      targetSize = Math.max(min, Math.min(potSize, max));
    } else if (strength > 0.7) {
      // Strong: 2/3 pot
      targetSize = Math.max(min, Math.min(Math.floor(potSize * 0.66), max));
    } else {
      // Bluff or semi-bluff: min raise
      targetSize = min;
    }

    // Add some randomness
    const variance = Math.floor(targetSize * 0.15 * (Math.random() * 2 - 1));
    targetSize = Math.max(min, Math.min(targetSize + variance, max));

    return targetSize;
  }
}
