import { Card } from './card.model';

export interface Player {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBetThisHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  isHuman: boolean;
  isEliminated: boolean;
}

export function createPlayer(
  id: number,
  name: string,
  chips: number,
  isHuman: boolean
): Player {
  return {
    id,
    name,
    chips,
    holeCards: [],
    currentBet: 0,
    totalBetThisHand: 0,
    isFolded: false,
    isAllIn: false,
    isHuman,
    isEliminated: false,
  };
}
