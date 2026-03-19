import { Component, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { PlayerAction } from '../../models/game-state.model';

@Component({
  selector: 'app-hand-history',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './hand-history.component.html',
  styleUrl: './hand-history.component.scss',
})
export class HandHistoryComponent {
  history = input.required<PlayerAction[]>();
  collapsed = true;
}
