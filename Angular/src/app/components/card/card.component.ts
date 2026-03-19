import { Component, input, computed } from '@angular/core';
import { Card, SUIT_SYMBOLS, RANK_LABELS, isRedSuit } from '../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  card = input.required<Card>();
  faceUp = input<boolean>(true);
  highlight = input<boolean>(false);

  rankLabel = computed(() => RANK_LABELS[this.card().rank]);
  suitSymbol = computed(() => SUIT_SYMBOLS[this.card().suit]);
  isRed = computed(() => isRedSuit(this.card().suit));
}
