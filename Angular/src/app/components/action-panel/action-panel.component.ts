import { Component, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionType } from '../../models/game-state.model';

@Component({
  selector: 'app-action-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible()) {
      <div class="action-panel">
        <div class="action-buttons">
          @for (action of validActions(); track action.action) {
            @if (action.action === 'fold') {
              <button class="btn btn-fold" (click)="onAction('fold')">Fold</button>
            }
            @if (action.action === 'check') {
              <button class="btn btn-check" (click)="onAction('check')">Check</button>
            }
            @if (action.action === 'call') {
              <button class="btn btn-call" (click)="onAction('call')">
                Call {{ action.minAmount }}
              </button>
            }
            @if (action.action === 'raise') {
              <button class="btn btn-raise" (click)="onAction('raise', raiseAmount())">
                Raise to {{ raiseAmount() }}
              </button>
            }
            @if (action.action === 'all-in') {
              <button class="btn btn-allin" (click)="onAction('all-in')">
                All In ({{ action.minAmount }})
              </button>
            }
          }
        </div>

        @if (raiseAction()) {
          <div class="raise-controls">
            <input type="range"
                   [min]="raiseAction()!.minAmount!"
                   [max]="raiseAction()!.maxAmount!"
                   [ngModel]="raiseAmount()"
                   (ngModelChange)="raiseAmount.set($event)"
                   class="raise-slider" />
            <input type="number"
                   [min]="raiseAction()!.minAmount!"
                   [max]="raiseAction()!.maxAmount!"
                   [ngModel]="raiseAmount()"
                   (ngModelChange)="raiseAmount.set($event)"
                   class="raise-input" />
            <div class="preset-buttons">
              <button class="btn-preset" (click)="setRaisePreset(0.5)">½ Pot</button>
              <button class="btn-preset" (click)="setRaisePreset(0.75)">¾ Pot</button>
              <button class="btn-preset" (click)="setRaisePreset(1)">Pot</button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .action-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }

    .action-buttons {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 10px 22px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-fold {
      background: #c62828;
      color: white;
    }

    .btn-check {
      background: #2e7d32;
      color: white;
    }

    .btn-call {
      background: #1565c0;
      color: white;
    }

    .btn-raise {
      background: #e65100;
      color: white;
    }

    .btn-allin {
      background: linear-gradient(135deg, #b71c1c, #d50000);
      color: white;
      font-weight: 700;
    }

    .raise-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .raise-slider {
      width: 180px;
      accent-color: #e65100;
    }

    .raise-input {
      width: 70px;
      padding: 6px 8px;
      border: 1px solid #555;
      border-radius: 6px;
      background: #333;
      color: white;
      font-size: 14px;
      text-align: center;
    }

    .preset-buttons {
      display: flex;
      gap: 6px;
    }

    .btn-preset {
      padding: 6px 12px;
      border: 1px solid #666;
      border-radius: 6px;
      background: #444;
      color: #ddd;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-preset:hover {
      background: #666;
    }
  `],
})
export class ActionPanelComponent {
  validActions = input.required<{ action: ActionType; minAmount?: number; maxAmount?: number }[]>();
  visible = input<boolean>(true);
  potSize = input<number>(0);

  actionSelected = output<{ action: ActionType; amount?: number }>();

  raiseAmount = signal(0);

  raiseAction = computed(() => {
    return this.validActions().find((a) => a.action === 'raise') ?? null;
  });

  constructor() {
    effect(() => {
      const raise = this.raiseAction();
      if (raise && this.raiseAmount() < raise.minAmount!) {
        this.raiseAmount.set(raise.minAmount!);
      }
    });
  }

  onAction(action: ActionType, amount?: number): void {
    this.actionSelected.emit({ action, amount });
  }

  setRaisePreset(fraction: number): void {
    const raise = this.raiseAction();
    if (!raise) return;
    const target = Math.floor(this.potSize() * fraction);
    const clamped = Math.max(raise.minAmount!, Math.min(target, raise.maxAmount!));
    this.raiseAmount.set(clamped);
  }
}
