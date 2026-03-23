import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  // User settings
  currentUser: any = null;
  users: any[] = [];
  
  // Password change
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // Company settings
  companySettings = {
    name: 'Pharmacy POS',
    address: '',
    phone: '',
    email: '',
    taxRate: 17
  };
  
  // Notification settings
  notifications = {
    lowStockAlert: true,
    expiringAlert: true,
    lowStockThreshold: 10,
    expiringDays: 30
  };
  
  // Backup
  backupPath = '';
  lastBackup: string | null = null;
  
  // UI states
  activeTab: 'general' | 'users' | 'notifications' | 'backup' = 'general';
  isLoading = false;
  isBusy = false;
  
  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    const user = localStorage.getItem('currentUser');
    if (user) {
      this.currentUser = JSON.parse(user);
    }
  }

  ngOnInit() {
    this.loadUsers();
    this.loadSettings();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);

    this.zone.run(() => {
      this.toast = { message: msg, type };
      this.cdr.detectChanges();
    });

    this.toastTimer = setTimeout(() => {
      this.zone.run(() => {
        if (!this.isDestroyed) {
          this.toast = null;
          this.cdr.detectChanges();
        }
      });
    }, 3000);
  }

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((result: any) => {
          this.zone.run(() => {
            if (!this.isDestroyed) resolve(result);
          });
        })
        .catch((err: any) => {
          this.zone.run(() => {
            if (!this.isDestroyed) reject(err);
          });
        });
    });
  }

  async loadUsers() {
    try {
      this.users = await this.dbRun('SELECT user_id, username, created_at FROM users ORDER BY created_at');
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  loadSettings() {
    // Load from localStorage
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) {
      this.companySettings = JSON.parse(savedCompany);
    }
    
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
    }
    
    const savedBackup = localStorage.getItem('lastBackup');
    if (savedBackup) {
      this.lastBackup = savedBackup;
    }
  }

  saveCompanySettings() {
    localStorage.setItem('companySettings', JSON.stringify(this.companySettings));
    this.showToast('Company settings saved');
  }

  saveNotificationSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(this.notifications));
    this.showToast('Notification settings saved');
  }

  async changePassword() {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.showToast('Please fill all fields', 'error');
      return;
    }
    
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.showToast('New passwords do not match', 'error');
      return;
    }
    
    if (this.passwordForm.newPassword.length < 4) {
      this.showToast('Password must be at least 4 characters', 'error');
      return;
    }
    
    this.isBusy = true;
    
    try {
      const user = await this.dbRun(
        'SELECT * FROM users WHERE user_id = ? AND password_hash = ?',
        [this.currentUser.user_id, this.passwordForm.currentPassword],
        'get'
      );
      
      if (!user) {
        this.showToast('Current password is incorrect', 'error');
        return;
      }
      
      await this.dbRun(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [this.passwordForm.newPassword, this.currentUser.user_id],
        'run'
      );
      
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      this.showToast('Password changed successfully');
      
    } catch (error) {
      console.error('Error changing password:', error);
      this.showToast('Failed to change password', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  async addUser() {
    const username = prompt('Enter username:');
    if (!username) return;
    
    const password = prompt('Enter password:');
    if (!password) return;
    
    this.isBusy = true;
    
    try {
      await this.dbRun(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, password],
        'run'
      );
      await this.loadUsers();
      this.showToast(`User ${username} added successfully`);
    } catch (error: any) {
      if (error?.message?.includes('UNIQUE')) {
        this.showToast('Username already exists', 'error');
      } else {
        this.showToast('Failed to add user', 'error');
      }
    } finally {
      this.isBusy = false;
    }
  }

  async deleteUser(userId: number, username: string) {
    if (userId === this.currentUser.user_id) {
      this.showToast('Cannot delete your own account', 'error');
      return;
    }
    
    if (!confirm(`Delete user "${username}"?`)) return;
    
    this.isBusy = true;
    
    try {
      await this.dbRun('DELETE FROM users WHERE user_id = ?', [userId], 'run');
      await this.loadUsers();
      this.showToast(`User ${username} deleted`);
    } catch (error) {
      this.showToast('Failed to delete user', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  async backupDatabase() {
    this.isBusy = true;
    
    try {
      // Get database file path from electron
      // @ts-ignore
      const result = await window.electronAPI.database.backup();
      
      if (result.success) {
        this.lastBackup = new Date().toLocaleString();
        localStorage.setItem('lastBackup', this.lastBackup);
        this.showToast(`Backup saved to: ${result.path}`);
      } else {
        this.showToast('Backup failed', 'error');
      }
    } catch (error) {
      console.error('Backup error:', error);
      this.showToast('Backup failed', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  async restoreDatabase() {
    if (!confirm('Restoring will overwrite current data. Continue?')) return;
    
    this.isBusy = true;
    
    try {
      // @ts-ignore
      const result = await window.electronAPI.database.restore();
      
      if (result.success) {
        this.showToast('Database restored. Please restart the app.');
      } else {
        this.showToast('Restore failed', 'error');
      }
    } catch (error) {
      console.error('Restore error:', error);
      this.showToast('Restore failed', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  clearData() {
    if (!confirm('⚠️ WARNING: This will delete ALL data! Continue?')) return;
    if (!confirm('Are you ABSOLUTELY sure? This cannot be undone!')) return;
    
    this.isBusy = true;
    
    // This would require admin privileges - implement carefully
    this.showToast('Feature requires admin approval', 'error');
    this.isBusy = false;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
}