import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="game-over-overlay">
      <div class="game-over-modal">
        <h1>Game Over</h1>
        @if (winner()?.isHuman) {
          <p class="win-message">Congratulations! You won!</p>
        } @else {
          <p class="lose-message">{{ winner()?.name }} wins the game!</p>
        }
        @if (winner()) {
          <p class="chips-info">Final chips: {{ winner()!.chips | number }}</p>
        }
        <button class="btn-new-game" (click)="newGame.emit()">New Game</button>
      </div>
    </div>
  `,
  styles: [`
    .game-over-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.5s ease;
    }

    .game-over-modal {
      background: linear-gradient(145deg, #1a1a2e, #16213e);
      border: 2px solid #ffd54f;
      border-radius: 20px;
      padding: 40px 60px;
      text-align: center;
      box-shadow: 0 0 40px rgba(255, 213, 79, 0.3);
    }

    h1 {
      color: #ffd54f;
      font-size: 36px;
      margin: 0 0 16px 0;
    }

    .win-message {
      color: #66bb6a;
      font-size: 22px;
      margin: 0 0 8px 0;
    }

    .lose-message {
      color: #ef5350;
      font-size: 22px;
      margin: 0 0 8px 0;
    }

    .chips-info {
      color: #aaa;
      font-size: 16px;
      margin: 0 0 24px 0;
    }

    .btn-new-game {
      padding: 14px 40px;
      background: linear-gradient(135deg, #2e7d32, #43a047);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .btn-new-game:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(46, 125, 50, 0.4);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class GameOverComponent {
  winner = input<Player | null>(null);
  newGame = output<void>();
}
