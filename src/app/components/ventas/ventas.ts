import { Component } from '@angular/core';

@Component({
  selector: 'app-ventas',
  imports: [],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class VentasComponent {
  suc = ["Mes", "Santa Fe", "Paraná", "Santo Tomé", "Rafaela", "Rosario"];
  mes = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  datos: any = [];

  ngOnInit(): void {
    this.datos = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (let f = 0; f < 12; f++) this.datos[f] = ["a", "a", "a", "a", "a"];

    for (let f = 0; f < 12; f++) {
      for (let c = 0; c < 5; c++)
        this.datos[f][c] = Math.round(50 + Math.random() * 50);
    }
  }
}
