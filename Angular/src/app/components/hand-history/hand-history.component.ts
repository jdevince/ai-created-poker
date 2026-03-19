import { Component, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { PlayerAction } from '../../models/game-state.model';

@Component({
  selector: 'app-hand-history',
  standalone: true,
  imports: [UpperCasePipe],
  template: `
    <div class="hand-history" [class.collapsed]="collapsed">
      <button class="toggle-btn" (click)="collapsed = !collapsed">
        {{ collapsed ? '◀ History' : '▶ Hide' }}
      </button>
      @if (!collapsed) {
        <div class="history-content">
          <h3>Hand History</h3>
          <div class="history-list">
            @for (entry of history(); track $index) {
              <div class="history-entry" [class]="'action-' + entry.action">
                <span class="entry-player">{{ entry.playerName }}</span>
                <span class="entry-action">{{ entry.action | uppercase }}</span>
                @if (entry.amount) {
                  <span class="entry-amount">{{ entry.amount }}</span>
                }
              </div>
            }
            @empty {
              <div class="no-history">No actions yet</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .hand-history {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px 0 0 12px;
      padding: 8px;
      z-index: 100;
      backdrop-filter: blur(8px);
      max-height: 60vh;
      display: flex;
      flex-direction: column;
    }

    .hand-history.collapsed {
      padding: 0;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #ccc;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .collapsed .toggle-btn {
      margin-bottom: 0;
      border-radius: 8px 0 0 8px;
    }

    .toggle-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .history-content {
      overflow-y: auto;
      padding: 0 8px;
    }

    h3 {
      color: #ffd54f;
      font-size: 14px;
      margin: 0 0 8px 0;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-entry {
      display: flex;
      gap: 8px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
    }

    .entry-player {
      color: #fff;
      font-weight: 500;
      min-width: 60px;
    }

    .entry-action {
      font-weight: 600;
      min-width: 50px;
    }

    .entry-amount {
      color: #ffd54f;
    }

    .action-fold .entry-action { color: #ef9a9a; }
    .action-check .entry-action { color: #a5d6a7; }
    .action-call .entry-action { color: #90caf9; }
    .action-raise .entry-action { color: #ffcc80; }
    .action-all-in .entry-action { color: #f44336; }

    .no-history {
      color: #777;
      font-size: 12px;
      padding: 8px;
    }
  `],
})
export class HandHistoryComponent {
  history = input.required<PlayerAction[]>();
  collapsed = true;
}
