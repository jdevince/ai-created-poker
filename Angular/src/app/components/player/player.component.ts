import { Component, input, computed } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { Player } from '../../models/player.model';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CardComponent, DecimalPipe, UpperCasePipe],
  template: `
    <div class="player-container" [class.active]="isActive()" [class.folded]="player().isFolded"
         [class.eliminated]="player().isEliminated" [class.is-dealer]="isDealer()">
      @if (isDealer()) {
        <div class="dealer-button">D</div>
      }
      @if (isSmallBlind()) {
        <div class="blind-marker sb">SB</div>
      }
      @if (isBigBlind()) {
        <div class="blind-marker bb">BB</div>
      }

      <div class="cards">
        @for (card of player().holeCards; track $index) {
          <app-card [card]="card" [faceUp]="player().isHuman || showCards()" />
        }
        @if (player().holeCards.length === 0 && !player().isEliminated) {
          <div class="card-placeholder"></div>
          <div class="card-placeholder"></div>
        }
      </div>

      <div class="player-info">
        <span class="player-name">{{ player().name }}</span>
        <span class="player-chips">{{ player().chips | number }} chips</span>
      </div>

      @if (player().currentBet > 0) {
        <div class="player-bet">
          <span class="bet-amount">{{ player().currentBet }}</span>
        </div>
      }

      @if (player().isAllIn) {
        <div class="all-in-badge">ALL IN</div>
      }

      @if (lastAction()) {
        <div class="last-action" [class]="'action-' + lastAction()">
          {{ lastAction()! | uppercase }}
        </div>
      }
    </div>
  `,
  styles: [`
    .player-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.35);
      position: relative;
      transition: all 0.3s ease;
      min-width: 120px;
    }

    .player-container.active {
      box-shadow: 0 0 15px 4px rgba(255, 215, 0, 0.6);
      background: rgba(0, 0, 0, 0.5);
    }

    .player-container.folded {
      opacity: 0.45;
    }

    .player-container.eliminated {
      opacity: 0.2;
      pointer-events: none;
    }

    .cards {
      display: flex;
      gap: 4px;
    }

    .card-placeholder {
      width: 50px;
      height: 72px;
      border-radius: 6px;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
    }

    .player-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .player-name {
      color: white;
      font-weight: 600;
      font-size: 13px;
    }

    .player-chips {
      color: #ffd54f;
      font-size: 12px;
      font-weight: 500;
    }

    .player-bet {
      position: absolute;
      bottom: -20px;
      background: rgba(255, 255, 255, 0.9);
      color: #333;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    .bet-amount::before {
      content: '🪙 ';
    }

    .dealer-button {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      background: white;
      color: #333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      border: 2px solid #333;
      z-index: 2;
    }

    .blind-marker {
      position: absolute;
      top: -8px;
      left: -8px;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      z-index: 2;
    }

    .blind-marker.sb {
      background: #42a5f5;
      color: white;
    }

    .blind-marker.bb {
      background: #ef5350;
      color: white;
    }

    .all-in-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f44336;
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      z-index: 3;
    }

    .last-action {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      animation: fadeInUp 0.3s ease;
    }

    .action-fold { color: #ef9a9a; }
    .action-check { color: #a5d6a7; }
    .action-call { color: #90caf9; }
    .action-raise { color: #ffcc80; }
    .action-all-in { color: #f44336; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class PlayerComponent {
  player = input.required<Player>();
  isActive = input<boolean>(false);
  isDealer = input<boolean>(false);
  isSmallBlind = input<boolean>(false);
  isBigBlind = input<boolean>(false);
  showCards = input<boolean>(false);
  lastAction = input<string | null>(null);
}
