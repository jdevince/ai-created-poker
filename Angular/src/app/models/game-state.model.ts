import { Card } from './card.model';
import { Player } from './player.model';

export type Phase =
  | 'waiting'
  | 'pre-flop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand-complete'
  | 'game-over';

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PlayerAction {
  playerId: number;
  playerName: string;
  action: ActionType;
  amount?: number;
  phase: Phase;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: number[];
}

export interface HandResult {
  rank: HandRank;
  cards: Card[];
  description: string;
  value: number;
  kickers: number[];
}

export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: 'High Card',
  [HandRank.OnePair]: 'One Pair',
  [HandRank.TwoPair]: 'Two Pair',
  [HandRank.ThreeOfAKind]: 'Three of a Kind',
  [HandRank.Straight]: 'Straight',
  [HandRank.Flush]: 'Flush',
  [HandRank.FullHouse]: 'Full House',
  [HandRank.FourOfAKind]: 'Four of a Kind',
  [HandRank.StraightFlush]: 'Straight Flush',
  [HandRank.RoyalFlush]: 'Royal Flush',
};

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  dealerIndex: number;
  currentPlayerIndex: number;
  phase: Phase;
  currentBet: number;
  minRaise: number;
  blinds: { small: number; big: number };
  handHistory: PlayerAction[];
  deck: Card[];
  handNumber: number;
  winners: { playerId: number; amount: number; handDescription: string }[];
}
