import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  protected auth = inject(AuthService);
  protected isLoggedIn$ = this.auth.isLoggedIn;
}
