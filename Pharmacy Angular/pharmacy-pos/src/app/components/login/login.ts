import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };
  
  showPassword = false;
  submitted = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private db: DatabaseService
  ) {}

  async onLogin() {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.credentials.username || !this.credentials.password) {
      return;
    }

    this.isLoading = true;

    try {
      const users = await this.db.query(
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        [this.credentials.username, this.credentials.password]
      );

      if (users && users.length > 0) {
        console.log('Login successful', users[0]);
        localStorage.setItem('currentUser', JSON.stringify(users[0]));
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Invalid username or password';
      }
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage = 'An error occurred. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}