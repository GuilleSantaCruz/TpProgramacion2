import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private detector = inject(ChangeDetectorRef);
  enviando = false;
  error = '';
  form = this.fb.nonNullable.group({
    userName: ['', [Validators.required, Validators.pattern(/^(?:[0-9]|10|11)$/)]],
    password: ['', [Validators.required, Validators.pattern(/\S/)]]
  });

  onSubmit(): void {
    this.error = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando) return;
    this.enviando = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.enviando = false;
        void this.router.navigate(['/']);
      },
      error: error => {
        this.enviando = false;
        this.error = error.error?.error ?? 'No se pudo iniciar sesión. Comprobá que PHP esté funcionando.';
        this.detector.markForCheck();
      }
    });
  }
}
