import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppStorage } from '../../../core/utilities/app-storage';
import { common } from '../../../core/constants/common';
import { swalHelper } from '../../../core/constants/swal-helper';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  isPassword: boolean = true;
  isNewPassword: boolean = true;
  isLoading: boolean = false;
  showForgotPassword: boolean = false;
  showResetFields: boolean = false;
  currentYear = new Date().getFullYear();

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    role: new FormControl(''),
    chapter: new FormControl(''),
  });

  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    code: new FormControl(''),
    password: new FormControl(''),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private storage: AppStorage
  ) {
    document.body.style.backgroundColor = '#3949AB';
  }

  ngOnInit(): void {
    if (this.storage.get(common.TOKEN)) {
      const userData = this.storage.get('user');
      if (userData && userData.role === 'LT') {
        this.router.navigate(['/LTPoints']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  togglePassword(): void {
    this.isPassword = !this.isPassword;
  }

  toggleNewPassword(): void {
    this.isNewPassword = !this.isNewPassword;
  }

  toggleForgotPassword(): void {
    this.showForgotPassword = !this.showForgotPassword;
    this.showResetFields = false;
    this.forgotPasswordForm.reset();
    
    this.forgotPasswordForm.get('code')?.clearValidators();
    this.forgotPasswordForm.get('password')?.clearValidators();
    this.forgotPasswordForm.get('code')?.updateValueAndValidity();
    this.forgotPasswordForm.get('password')?.updateValueAndValidity();
  }

  isCurrentStepValid(): boolean {
    if (!this.showResetFields) {
      return this.forgotPasswordForm.get('email')?.valid || false;
    } else {
      return (this.forgotPasswordForm.get('email')?.valid && 
              this.forgotPasswordForm.get('code')?.valid && 
              this.forgotPasswordForm.get('password')?.valid) || false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach((key) => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    try {
      const credentials = {
        email: this.loginForm.value.email as string,
        password: this.loginForm.value.password as string,
        role: this.loginForm.value.role as string,
        chapter: this.loginForm.value.chapter as string,
      };

      const response = await this.authService.adminLogin(credentials);

      if (response && response.data && response.data.token) {
        this.storage.set(common.TOKEN, response.data.token);
        this.storage.set('user', response.data.admin);
        
        swalHelper.showToast('Login successful', 'success');
        
        const userRole = response.data.admin.role;
        if (userRole === 'LT') {
          this.router.navigate(['/LTPoints']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      swalHelper.showToast(error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async onForgotPasswordSubmit(): Promise<void> {
    if (!this.showResetFields) {
      if (this.forgotPasswordForm.get('email')?.invalid) {
        this.forgotPasswordForm.get('email')?.markAsTouched();
        return;
      }
    } else {
      const emailControl = this.forgotPasswordForm.get('email');
      const codeControl = this.forgotPasswordForm.get('code');
      const passwordControl = this.forgotPasswordForm.get('password');

      if (emailControl?.invalid || codeControl?.invalid || passwordControl?.invalid) {
        emailControl?.markAsTouched();
        codeControl?.markAsTouched();
        passwordControl?.markAsTouched();
        return;
      }
    }

    this.isLoading = true;
    try {
      if (!this.showResetFields) {
        const email = { email: this.forgotPasswordForm.value.email as string };
        const response = await this.authService.forgotPassword(email);
        
        if (response && response.success) {
          const successMessage = response.message || 'Password reset code sent to email';
          swalHelper.showToast(successMessage, 'success');
          
          this.showResetFields = true;
          
          this.forgotPasswordForm.get('code')?.setValidators([Validators.required]);
          this.forgotPasswordForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.forgotPasswordForm.get('code')?.updateValueAndValidity();
          this.forgotPasswordForm.get('password')?.updateValueAndValidity();
        } else {
          const errorMessage = response?.message || 'Failed to send reset code';
          swalHelper.showToast(errorMessage, 'error');
        }
      } else {
        const resetData = {
          email: this.forgotPasswordForm.value.email as string,
          code: this.forgotPasswordForm.value.code as string,
          password: this.forgotPasswordForm.value.password as string,
        };
        
        const response = await this.authService.updatePassword(resetData);
        
        if (response && response.success) {
          const successMessage = response.message || 'Password updated successfully';
          swalHelper.showToast(successMessage, 'success');
          
          this.toggleForgotPassword();
        } else {
          const errorMessage = response?.message || 'Failed to update password';
          swalHelper.showToast(errorMessage, 'error');
        }
      }
    } catch (error: any) {
      console.error('Forgot Password Error:', error);
      
      let errorMessage = 'An error occurred';
      
      if (error.response?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      swalHelper.showToast(errorMessage, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    document.body.style.backgroundColor = '';
  }
}