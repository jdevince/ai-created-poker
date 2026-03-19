import { HandEvaluatorService } from './hand-evaluator.service';
import { Card, Rank, Suit } from '../models/card.model';
import { HandRank } from '../models/game-state.model';

describe('HandEvaluatorService', () => {
  let service: HandEvaluatorService;

  beforeEach(() => {
    service = new HandEvaluatorService();
  });

  function c(rank: Rank, suit: Suit): Card {
    return { rank, suit };
  }

  describe('evaluateHand (5-card)', () => {
    it('should detect Royal Flush', () => {
      const hand = [
        c(Rank.Ace, Suit.Spades),
        c(Rank.King, Suit.Spades),
        c(Rank.Queen, Suit.Spades),
        c(Rank.Jack, Suit.Spades),
        c(Rank.Ten, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.RoyalFlush);
    });

    it('should detect Straight Flush', () => {
      const hand = [
        c(Rank.Nine, Suit.Hearts),
        c(Rank.Eight, Suit.Hearts),
        c(Rank.Seven, Suit.Hearts),
        c(Rank.Six, Suit.Hearts),
        c(Rank.Five, Suit.Hearts),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.StraightFlush);
      expect(result.value).toBe(9);
    });

    it('should detect Ace-low Straight Flush (wheel)', () => {
      const hand = [
        c(Rank.Ace, Suit.Diamonds),
        c(Rank.Two, Suit.Diamonds),
        c(Rank.Three, Suit.Diamonds),
        c(Rank.Four, Suit.Diamonds),
        c(Rank.Five, Suit.Diamonds),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.StraightFlush);
      expect(result.value).toBe(5);
    });

    it('should detect Four of a Kind', () => {
      const hand = [
        c(Rank.King, Suit.Spades),
        c(Rank.King, Suit.Hearts),
        c(Rank.King, Suit.Diamonds),
        c(Rank.King, Suit.Clubs),
        c(Rank.Two, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.FourOfAKind);
      expect(result.value).toBe(Rank.King);
    });

    it('should detect Full House', () => {
      const hand = [
        c(Rank.Jack, Suit.Spades),
        c(Rank.Jack, Suit.Hearts),
        c(Rank.Jack, Suit.Diamonds),
        c(Rank.Three, Suit.Clubs),
        c(Rank.Three, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.FullHouse);
      expect(result.description).toContain('Js full of 3s');
    });

    it('should detect Flush', () => {
      const hand = [
        c(Rank.Ace, Suit.Clubs),
        c(Rank.Ten, Suit.Clubs),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Four, Suit.Clubs),
        c(Rank.Two, Suit.Clubs),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.Flush);
    });

    it('should detect Straight', () => {
      const hand = [
        c(Rank.Ten, Suit.Spades),
        c(Rank.Nine, Suit.Hearts),
        c(Rank.Eight, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Six, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.value).toBe(10);
    });

    it('should detect Ace-low Straight (wheel)', () => {
      const hand = [
        c(Rank.Ace, Suit.Spades),
        c(Rank.Two, Suit.Hearts),
        c(Rank.Three, Suit.Diamonds),
        c(Rank.Four, Suit.Clubs),
        c(Rank.Five, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.value).toBe(5);
    });

    it('should detect Three of a Kind', () => {
      const hand = [
        c(Rank.Seven, Suit.Spades),
        c(Rank.Seven, Suit.Hearts),
        c(Rank.Seven, Suit.Diamonds),
        c(Rank.King, Suit.Clubs),
        c(Rank.Two, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.ThreeOfAKind);
    });

    it('should detect Two Pair', () => {
      const hand = [
        c(Rank.Ace, Suit.Spades),
        c(Rank.Ace, Suit.Hearts),
        c(Rank.Eight, Suit.Diamonds),
        c(Rank.Eight, Suit.Clubs),
        c(Rank.Three, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.TwoPair);
    });

    it('should detect One Pair', () => {
      const hand = [
        c(Rank.Queen, Suit.Spades),
        c(Rank.Queen, Suit.Hearts),
        c(Rank.Nine, Suit.Diamonds),
        c(Rank.Five, Suit.Clubs),
        c(Rank.Two, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.OnePair);
    });

    it('should detect High Card', () => {
      const hand = [
        c(Rank.Ace, Suit.Spades),
        c(Rank.King, Suit.Hearts),
        c(Rank.Nine, Suit.Diamonds),
        c(Rank.Five, Suit.Clubs),
        c(Rank.Two, Suit.Spades),
      ];
      const result = service.evaluateHand(hand);
      expect(result.rank).toBe(HandRank.HighCard);
    });
  });

  describe('compareHands', () => {
    it('should rank Flush above Straight', () => {
      const flush = service.evaluateHand([
        c(Rank.Ace, Suit.Clubs),
        c(Rank.Ten, Suit.Clubs),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Four, Suit.Clubs),
        c(Rank.Two, Suit.Clubs),
      ]);
      const straight = service.evaluateHand([
        c(Rank.Ten, Suit.Spades),
        c(Rank.Nine, Suit.Hearts),
        c(Rank.Eight, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Six, Suit.Spades),
      ]);
      expect(service.compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it('should use kickers to break ties for One Pair', () => {
      const pairWithAceKicker = service.evaluateHand([
        c(Rank.King, Suit.Spades),
        c(Rank.King, Suit.Hearts),
        c(Rank.Ace, Suit.Diamonds),
        c(Rank.Five, Suit.Clubs),
        c(Rank.Two, Suit.Spades),
      ]);
      const pairWithQueenKicker = service.evaluateHand([
        c(Rank.King, Suit.Diamonds),
        c(Rank.King, Suit.Clubs),
        c(Rank.Queen, Suit.Spades),
        c(Rank.Five, Suit.Hearts),
        c(Rank.Two, Suit.Diamonds),
      ]);
      expect(service.compareHands(pairWithAceKicker, pairWithQueenKicker)).toBeGreaterThan(0);
    });

    it('should return 0 for identical hands', () => {
      const hand1 = service.evaluateHand([
        c(Rank.Ace, Suit.Spades),
        c(Rank.King, Suit.Hearts),
        c(Rank.Queen, Suit.Diamonds),
        c(Rank.Jack, Suit.Clubs),
        c(Rank.Nine, Suit.Spades),
      ]);
      const hand2 = service.evaluateHand([
        c(Rank.Ace, Suit.Hearts),
        c(Rank.King, Suit.Diamonds),
        c(Rank.Queen, Suit.Clubs),
        c(Rank.Jack, Suit.Spades),
        c(Rank.Nine, Suit.Hearts),
      ]);
      expect(service.compareHands(hand1, hand2)).toBe(0);
    });

    it('should break Two Pair ties with second pair then kicker', () => {
      const acesAndKings = service.evaluateHand([
        c(Rank.Ace, Suit.Spades),
        c(Rank.Ace, Suit.Hearts),
        c(Rank.King, Suit.Diamonds),
        c(Rank.King, Suit.Clubs),
        c(Rank.Three, Suit.Spades),
      ]);
      const acesAndQueens = service.evaluateHand([
        c(Rank.Ace, Suit.Diamonds),
        c(Rank.Ace, Suit.Clubs),
        c(Rank.Queen, Suit.Spades),
        c(Rank.Queen, Suit.Hearts),
        c(Rank.Three, Suit.Diamonds),
      ]);
      expect(service.compareHands(acesAndKings, acesAndQueens)).toBeGreaterThan(0);
    });
  });

  describe('evaluateBestHand (7 cards)', () => {
    it('should find the best hand from 7 cards', () => {
      const cards = [
        c(Rank.Ace, Suit.Spades),
        c(Rank.King, Suit.Spades),
        c(Rank.Queen, Suit.Spades),
        c(Rank.Jack, Suit.Spades),
        c(Rank.Ten, Suit.Spades),
        c(Rank.Two, Suit.Hearts),
        c(Rank.Three, Suit.Diamonds),
      ];
      const result = service.evaluateBestHand(cards);
      expect(result.rank).toBe(HandRank.RoyalFlush);
    });

    it('should find Full House from 7 cards with two pairs and trips', () => {
      const cards = [
        c(Rank.King, Suit.Spades),
        c(Rank.King, Suit.Hearts),
        c(Rank.King, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Seven, Suit.Spades),
        c(Rank.Three, Suit.Hearts),
        c(Rank.Three, Suit.Diamonds),
      ];
      const result = service.evaluateBestHand(cards);
      expect(result.rank).toBe(HandRank.FullHouse);
      expect(result.description).toContain('Ks full of 7s');
    });

    it('should pick higher straight when both exist', () => {
      const cards = [
        c(Rank.Ten, Suit.Spades),
        c(Rank.Nine, Suit.Hearts),
        c(Rank.Eight, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
        c(Rank.Six, Suit.Spades),
        c(Rank.Five, Suit.Hearts),
        c(Rank.Two, Suit.Diamonds),
      ];
      const result = service.evaluateBestHand(cards);
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.value).toBe(10);
    });
  });

  describe('getCombinations', () => {
    it('should return 21 combinations for 7 choose 5', () => {
      const cards = Array.from({ length: 7 }, (_, i) =>
        c(((i % 13) + 2) as Rank, Suit.Spades)
      );
      const combos = service.getCombinations(cards, 5);
      expect(combos.length).toBe(21);
    });
  });
});
