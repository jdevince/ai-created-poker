import { GameEngineService } from './game-engine.service';
import { DeckService } from './deck.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { Player, createPlayer } from '../models/player.model';
import { Rank, Suit, Card } from '../models/card.model';

describe('GameEngineService', () => {
  let service: GameEngineService;

  beforeEach(() => {
    service = new GameEngineService(new DeckService(), new HandEvaluatorService());
  });

  describe('startNewGame', () => {
    it('should create 9 players (1 human + 8 AI)', () => {
      service.startNewGame();
      const state = service.gameState();
      expect(state.players.length).toBe(9);
      expect(state.players.filter((p) => p.isHuman).length).toBe(1);
      expect(state.players.filter((p) => !p.isHuman).length).toBe(8);
    });

    it('should deal 2 hole cards to each player', () => {
      service.startNewGame();
      const state = service.gameState();
      for (const player of state.players) {
        expect(player.holeCards.length).toBe(2);
      }
    });

    it('should post blinds', () => {
      service.startNewGame();
      const state = service.gameState();
      expect(state.pot).toBe(30); // 10 + 20
      expect(state.currentBet).toBe(20);
    });

    it('should set phase to pre-flop', () => {
      service.startNewGame();
      expect(service.gameState().phase).toBe('pre-flop');
    });

    it('should give each player 1000 chips minus blinds', () => {
      service.startNewGame();
      const state = service.gameState();
      const totalChips = state.players.reduce((sum, p) => sum + p.chips + p.currentBet, 0);
      expect(totalChips).toBe(9000);
    });
  });

  describe('getValidActions', () => {
    it('should include fold, call, raise, all-in when facing a bet', () => {
      service.startNewGame();
      const state = service.gameState();
      const player = state.players[state.currentPlayerIndex];

      // If the current player hasn't posted a blind, they face a bet
      if (player.currentBet < state.currentBet) {
        const actions = service.getValidActions();
        const actionTypes = actions.map((a) => a.action);
        expect(actionTypes).toContain('fold');
        expect(actionTypes).toContain('call');
        expect(actionTypes).toContain('all-in');
      }
    });
  });

  describe('performAction', () => {
    it('should handle fold correctly', () => {
      service.startNewGame();
      const state = service.gameState();
      const playerIdx = state.currentPlayerIndex;

      service.performAction('fold');

      const newState = service.gameState();
      expect(newState.players[playerIdx].isFolded).toBe(true);
    });

    it('should handle call correctly', () => {
      service.startNewGame();
      const state = service.gameState();
      const playerIdx = state.currentPlayerIndex;
      const player = state.players[playerIdx];
      const toCall = state.currentBet - player.currentBet;
      const oldPot = state.pot;

      service.performAction('call');

      const newState = service.gameState();
      expect(newState.pot).toBe(oldPot + toCall);
    });
  });

  describe('calculateSidePots', () => {
    it('should create no side pots when all players bet equally', () => {
      const players: Player[] = [
        { ...createPlayer(0, 'P1', 500, true), totalBetThisHand: 100, isFolded: false },
        { ...createPlayer(1, 'P2', 500, false), totalBetThisHand: 100, isFolded: false },
        { ...createPlayer(2, 'P3', 500, false), totalBetThisHand: 100, isFolded: false },
      ];

      const pots = service.calculateSidePots(players);
      expect(pots.length).toBe(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligiblePlayerIds.length).toBe(3);
    });

    it('should create side pots when a player is all-in for less', () => {
      const players: Player[] = [
        { ...createPlayer(0, 'P1', 0, true), totalBetThisHand: 50, isFolded: false, isAllIn: true },
        { ...createPlayer(1, 'P2', 450, false), totalBetThisHand: 100, isFolded: false, isAllIn: false },
        { ...createPlayer(2, 'P3', 450, false), totalBetThisHand: 100, isFolded: false, isAllIn: false },
      ];

      const pots = service.calculateSidePots(players);
      expect(pots.length).toBe(2);

      // Main pot: 50 * 3 = 150, eligible: all 3
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePlayerIds.length).toBe(3);

      // Side pot: 50 * 2 = 100, eligible: P2 and P3 only
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePlayerIds.length).toBe(2);
      expect(pots[1].eligiblePlayerIds).not.toContain(0);
    });

    it('should handle folded players contributing to pot but not eligible', () => {
      const players: Player[] = [
        { ...createPlayer(0, 'P1', 900, true), totalBetThisHand: 100, isFolded: true, isAllIn: false },
        { ...createPlayer(1, 'P2', 900, false), totalBetThisHand: 100, isFolded: false, isAllIn: false },
        { ...createPlayer(2, 'P3', 900, false), totalBetThisHand: 100, isFolded: false, isAllIn: false },
      ];

      const pots = service.calculateSidePots(players);
      expect(pots.length).toBe(1);
      expect(pots[0].amount).toBe(300);
      // Folded player should NOT be eligible
      expect(pots[0].eligiblePlayerIds).not.toContain(0);
      expect(pots[0].eligiblePlayerIds.length).toBe(2);
    });

    it('should handle multiple all-in levels', () => {
      const players: Player[] = [
        { ...createPlayer(0, 'P1', 0, true), totalBetThisHand: 30, isFolded: false, isAllIn: true },
        { ...createPlayer(1, 'P2', 0, false), totalBetThisHand: 70, isFolded: false, isAllIn: true },
        { ...createPlayer(2, 'P3', 400, false), totalBetThisHand: 100, isFolded: false, isAllIn: false },
      ];

      const pots = service.calculateSidePots(players);
      expect(pots.length).toBe(3);

      // Main pot: 30 * 3 = 90
      expect(pots[0].amount).toBe(90);
      expect(pots[0].eligiblePlayerIds.length).toBe(3);

      // Side pot 1: 40 * 2 = 80
      expect(pots[1].amount).toBe(80);
      expect(pots[1].eligiblePlayerIds.length).toBe(2);

      // Side pot 2: 30 * 1 = 30
      expect(pots[2].amount).toBe(30);
      expect(pots[2].eligiblePlayerIds.length).toBe(1);
    });
  });
});
