import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './game-over.component.html',
  styleUrl: './game-over.component.scss',
})
export class GameOverComponent {
  winner = input<Player | null>(null);
  newGame = output<void>();
}
