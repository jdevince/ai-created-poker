import { Injectable } from '@angular/core';
import { Card, Rank, Suit, RANK_LABELS } from '../models/card.model';
import { HandRank, HandResult, HAND_RANK_NAMES } from '../models/game-state.model';

@Injectable({ providedIn: 'root' })
export class HandEvaluatorService {
  /**
   * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community).
   */
  evaluateBestHand(cards: Card[]): HandResult {
    const combos = this.getCombinations(cards, 5);
    let best: HandResult | null = null;

    for (const combo of combos) {
      const result = this.evaluateHand(combo);
      if (!best || this.compareHands(result, best) > 0) {
        best = result;
      }
    }

    return best!;
  }

  /**
   * Compare two HandResults. Returns positive if a > b, negative if a < b, 0 if equal.
   */
  compareHands(a: HandResult, b: HandResult): number {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.value !== b.value) return a.value - b.value;
    for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
      if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
    }
    return 0;
  }

  /**
   * Evaluate a specific 5-card hand.
   */
  evaluateHand(cards: Card[]): HandResult {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const ranks = sorted.map((c) => c.rank);
    const suits = sorted.map((c) => c.suit);

    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = this.checkStraight(ranks);
    const isAceLowStraight = this.checkAceLowStraight(ranks);
    const straightHigh = isAceLowStraight ? 5 : ranks[0];

    const groups = this.getGroups(ranks);

    if (isFlush && isStraight && ranks[0] === Rank.Ace && ranks[1] === Rank.King) {
      return {
        rank: HandRank.RoyalFlush,
        cards: sorted,
        description: 'Royal Flush',
        value: Rank.Ace,
        kickers: [],
      };
    }

    if (isFlush && (isStraight || isAceLowStraight)) {
      return {
        rank: HandRank.StraightFlush,
        cards: sorted,
        description: `Straight Flush, ${RANK_LABELS[straightHigh as Rank]} high`,
        value: straightHigh,
        kickers: [],
      };
    }

    if (groups[0].count === 4) {
      const kicker = groups.find((g) => g.count !== 4)!;
      return {
        rank: HandRank.FourOfAKind,
        cards: sorted,
        description: `Four of a Kind, ${RANK_LABELS[groups[0].rank]}s`,
        value: groups[0].rank,
        kickers: [kicker.rank],
      };
    }

    if (groups[0].count === 3 && groups[1].count === 2) {
      return {
        rank: HandRank.FullHouse,
        cards: sorted,
        description: `Full House, ${RANK_LABELS[groups[0].rank]}s full of ${RANK_LABELS[groups[1].rank]}s`,
        value: groups[0].rank,
        kickers: [groups[1].rank],
      };
    }

    if (isFlush) {
      return {
        rank: HandRank.Flush,
        cards: sorted,
        description: `Flush, ${RANK_LABELS[ranks[0] as Rank]} high`,
        value: ranks[0],
        kickers: ranks.slice(1),
      };
    }

    if (isStraight || isAceLowStraight) {
      return {
        rank: HandRank.Straight,
        cards: sorted,
        description: `Straight, ${RANK_LABELS[straightHigh as Rank]} high`,
        value: straightHigh,
        kickers: [],
      };
    }

    if (groups[0].count === 3) {
      const kickers = groups.filter((g) => g.count === 1).map((g) => g.rank);
      return {
        rank: HandRank.ThreeOfAKind,
        cards: sorted,
        description: `Three of a Kind, ${RANK_LABELS[groups[0].rank]}s`,
        value: groups[0].rank,
        kickers,
      };
    }

    if (groups[0].count === 2 && groups[1].count === 2) {
      const kicker = groups.find((g) => g.count === 1)!;
      return {
        rank: HandRank.TwoPair,
        cards: sorted,
        description: `Two Pair, ${RANK_LABELS[groups[0].rank]}s and ${RANK_LABELS[groups[1].rank]}s`,
        value: groups[0].rank,
        kickers: [groups[1].rank, kicker.rank],
      };
    }

    if (groups[0].count === 2) {
      const kickers = groups.filter((g) => g.count === 1).map((g) => g.rank);
      return {
        rank: HandRank.OnePair,
        cards: sorted,
        description: `Pair of ${RANK_LABELS[groups[0].rank]}s`,
        value: groups[0].rank,
        kickers,
      };
    }

    return {
      rank: HandRank.HighCard,
      cards: sorted,
      description: `High Card, ${RANK_LABELS[ranks[0] as Rank]}`,
      value: ranks[0],
      kickers: ranks.slice(1),
    };
  }

  private checkStraight(ranks: number[]): boolean {
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i] - ranks[i + 1] !== 1) return false;
    }
    return true;
  }

  private checkAceLowStraight(ranks: number[]): boolean {
    const aceLow = [Rank.Ace, Rank.Five, Rank.Four, Rank.Three, Rank.Two];
    return ranks.length === 5 && ranks.every((r, i) => r === aceLow[i]);
  }

  private getGroups(ranks: number[]): { rank: Rank; count: number }[] {
    const countMap = new Map<number, number>();
    for (const r of ranks) {
      countMap.set(r, (countMap.get(r) || 0) + 1);
    }
    return Array.from(countMap.entries())
      .map(([rank, count]) => ({ rank: rank as Rank, count }))
      .sort((a, b) => b.count - a.count || b.rank - a.rank);
  }

  getCombinations(cards: Card[], k: number): Card[][] {
    const result: Card[][] = [];
    const combo: Card[] = [];

    const backtrack = (start: number) => {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < cards.length; i++) {
        combo.push(cards[i]);
        backtrack(i + 1);
        combo.pop();
      }
    };

    backtrack(0);
    return result;
  }
}
