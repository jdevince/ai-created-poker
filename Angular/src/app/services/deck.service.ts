import { Injectable } from '@angular/core';
import { Card, Rank, Suit } from '../models';

@Injectable({ providedIn: 'root' })
export class DeckService {
  createDeck(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
    const ranks = [
      Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six,
      Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten,
      Rank.Jack, Rank.Queen, Rank.King, Rank.Ace,
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  deal(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
    return {
      dealt: deck.slice(0, count),
      remaining: deck.slice(count),
    };
  }
}
