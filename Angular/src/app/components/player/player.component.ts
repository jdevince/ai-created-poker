import { Component, input } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { Player } from '../../models/player.model';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CardComponent, DecimalPipe, UpperCasePipe],
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss',
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
