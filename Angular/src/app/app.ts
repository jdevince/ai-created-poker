import { Component } from '@angular/core';
import { TableComponent } from './components/table/table.component';

@Component({
  selector: 'app-root',
  imports: [TableComponent],
  template: '<app-table />',
  styles: [`:host { display: block; }`],
})
export class App {}
