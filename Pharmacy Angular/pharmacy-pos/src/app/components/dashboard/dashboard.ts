import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <nav class="navbar">
        <div class="nav-brand">
          <span class="material-symbols-outlined">local_pharmacy</span>
          <h2>Pharmacy POS</h2>
        </div>
        
        <div class="nav-user">
          <span class="material-symbols-outlined">account_circle</span>
          <span>{{ currentUser?.username || 'Admin' }}</span>
          <button class="logout-btn" (click)="logout()">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </nav>

      <div class="container">
        <h1>Welcome to Dashboard</h1>
        <p>Your pharmacy management system is ready!</p>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Medicines</h3>
            <p class="stat-value">0</p>
          </div>
          <div class="stat-card">
            <h3>Low Stock</h3>
            <p class="stat-value">0</p>
          </div>
          <div class="stat-card">
            <h3>Today's Sales</h3>
            <p class="stat-value">0</p>
          </div>
          <div class="stat-card">
            <h3>Expiring Soon</h3>
            <p class="stat-value">0</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0,1');

    .dashboard {
      min-height: 100vh;
      background: #f5f5f5;
    }

    .navbar {
      background: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-brand span {
      font-size: 32px;
      color: #667eea;
    }

    .nav-brand h2 {
      margin: 0;
      color: #333;
    }

    .nav-user {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .nav-user span {
      color: #666;
    }

    .logout-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      display: flex;
      align-items: center;
    }

    .logout-btn:hover {
      color: #dc3545;
    }

    .container {
      padding: 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-card h3 {
      margin: 0 0 10px;
      color: #666;
      font-size: 14px;
    }

    .stat-value {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #333;
    }
  `]
})
export class DashboardComponent {
  currentUser: any;

  constructor(private router: Router) {
    const user = localStorage.getItem('currentUser');
    if (user) {
      this.currentUser = JSON.parse(user);
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}