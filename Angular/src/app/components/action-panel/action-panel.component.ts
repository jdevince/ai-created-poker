import { Component, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionType } from '../../models/game-state.model';

@Component({
  selector: 'app-action-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './action-panel.component.html',
  styleUrl: './action-panel.component.scss',
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
