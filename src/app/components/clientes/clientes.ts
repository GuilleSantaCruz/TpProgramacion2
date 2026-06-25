import { Component } from '@angular/core';

@Component({
  selector: 'app-clientes',
  imports: [],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class ClientesComponent {
  
 public clients:any=[];
 ngOnInit(): void {
   this.clients= [{Nombre: "Juan",Apel:"Rodriguez",Activo:true},
{Nombre: "Jose",Apel:"Perez",Activo:true},
{Nombre: "Pedro",Apel:"Gutierrez",Activo:false},
{Nombre: "Maria",Apel:"Tossi",Activo:true},
{Nombre: "Juana",Apel:"Fernandez",Activo:true},
{Nombre: "Marcelo",Apel:"Diaz",Activo:false},
{Nombre: "Kevin",Apel:"Motomel",Activo:true},
{Nombre: "Ricardo",Apel:"Tercero",Activo:true},
{Nombre: "Juliana",Apel:"Awada",Activo:false}
 ];  
 }
}
