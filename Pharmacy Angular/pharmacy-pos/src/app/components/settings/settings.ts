import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { TaxService } from '../../services/tax.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {

  // ── Current logged-in user ────────────────────────────────────────────────
  currentUser: any = null;
  users: any[] = [];

  // ── Password form ─────────────────────────────────────────────────────────
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  // Password-field visibility toggles (Change-Password section)
  showCurrentPw  = false;
  showNewPw      = false;
  showConfirmPw  = false;

  // ── Add-User modal state ──────────────────────────────────────────────────
  showAddUserModal = false;
  addUserError     = '';
  newUserForm = {
    username:        '',
    password:        '',
    confirmPassword: '',
    showPassword:    false,
    showConfirm:     false,
  };

  // ── Company settings ──────────────────────────────────────────────────────
  companySettings = {
    name:    'Pharmacy POS',
    address: '123 Main Street, Lahore, Pakistan',
    phone:   '0300-1234567',
    email:   'info@pharmacy.com',
    taxRate: 17,
  };

  // ── Notification settings ─────────────────────────────────────────────────
  notifications = {
    lowStockAlert:      true,
    expiringAlert:      true,
    lowStockThreshold:  10,
    expiringDays:       30,
  };

  // ── Backup ────────────────────────────────────────────────────────────────
  lastBackup: string | null = null;

  // ── UI state ──────────────────────────────────────────────────────────────
  activeTab: 'general' | 'users' | 'notifications' | 'backup' = 'general';
  isBusy    = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;

  private toastTimer: any    = null;
  private isDestroyed        = false;

  constructor(
    private db:         DatabaseService,
    private zone:       NgZone,
    private cdr:        ChangeDetectorRef,
    private taxService: TaxService,
  ) {
    const raw = localStorage.getItem('currentUser');
    if (raw) this.currentUser = JSON.parse(raw);
  }

  ngOnInit()    { this.loadUsers(); this.loadSettings(); }
  ngOnDestroy() { this.isDestroyed = true; if (this.toastTimer) clearTimeout(this.toastTimer); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3000);
  }

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((r: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(r); }))
        .catch((e: any) => this.zone.run(() => { if (!this.isDestroyed) reject(e); }));
    });
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleString();
  }

  // ── Password computed helpers ─────────────────────────────────────────────

  get passwordsMatch(): boolean {
    return (
      !!this.passwordForm.newPassword &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword
    );
  }

  get pwStrength(): { pct: number; cls: string; label: string } {
    const pw = this.passwordForm.newPassword;
    if (!pw) return { pct: 0, cls: '', label: '' };

    let score = 0;
    if (pw.length >= 4)  score++;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const map: { [k: number]: { pct: number; cls: string; label: string } } = {
      0: { pct: 10,  cls: 'weak',   label: 'Very Weak' },
      1: { pct: 25,  cls: 'weak',   label: 'Weak'      },
      2: { pct: 50,  cls: 'fair',   label: 'Fair'      },
      3: { pct: 65,  cls: 'good',   label: 'Good'      },
      4: { pct: 80,  cls: 'strong', label: 'Strong'    },
      5: { pct: 100, cls: 'strong', label: 'Very Strong' },
    };
    return map[score] ?? map[0];
  }

  clearPasswordForm() {
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.showCurrentPw = this.showNewPw = this.showConfirmPw = false;
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async loadUsers() {
    try {
      this.users = await this.dbRun(
        'SELECT user_id, username, created_at FROM users ORDER BY created_at'
      );
    } catch (error) {
      console.error('Error loading users:', error);
      this.showToast('Failed to load users', 'error');
    }
  }

  loadSettings() {
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) this.companySettings = JSON.parse(savedCompany);

    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) this.notifications = JSON.parse(savedNotifications);

    const savedBackup = localStorage.getItem('lastBackup');
    if (savedBackup) this.lastBackup = savedBackup;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  saveCompanySettings() {
    localStorage.setItem('companySettings', JSON.stringify(this.companySettings));
    this.taxService.setTaxRate(this.companySettings.taxRate);
    this.showToast('Company settings saved');
  }

  saveNotificationSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(this.notifications));
    this.showToast('Notification settings saved');
  }

  // ── Change Password ───────────────────────────────────────────────────────

  async changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.showToast('Please fill all fields', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      this.showToast('New passwords do not match', 'error'); return;
    }
    if (newPassword.length < 4) {
      this.showToast('Password must be at least 4 characters', 'error'); return;
    }
    if (newPassword === currentPassword) {
      this.showToast('New password must differ from current password', 'error'); return;
    }

    this.isBusy = true;
    try {
      const user = await this.dbRun(
        'SELECT * FROM users WHERE user_id = ? AND password_hash = ?',
        [this.currentUser.user_id, currentPassword],
        'get'
      );

      if (!user) { this.showToast('Current password is incorrect', 'error'); return; }

      await this.dbRun(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [newPassword, this.currentUser.user_id],
        'run'
      );

      this.clearPasswordForm();
      this.showToast('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      this.showToast('Failed to change password', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  // ── Add User Modal ────────────────────────────────────────────────────────

  openAddUserModal() {
    this.newUserForm = {
      username: '', password: '', confirmPassword: '',
      showPassword: false, showConfirm: false,
    };
    this.addUserError    = '';
    this.showAddUserModal = true;
  }

  closeAddUserModal() {
    this.showAddUserModal = false;
    this.addUserError     = '';
  }

  async submitAddUser() {
    const { username, password, confirmPassword } = this.newUserForm;
    this.addUserError = '';

    // Validation
    if (!username.trim()) {
      this.addUserError = 'Username is required'; return;
    }
    if (username.trim().length < 3) {
      this.addUserError = 'Username must be at least 3 characters'; return;
    }
    if (!password) {
      this.addUserError = 'Password is required'; return;
    }
    if (password.length < 4) {
      this.addUserError = 'Password must be at least 4 characters'; return;
    }
    if (password !== confirmPassword) {
      this.addUserError = 'Passwords do not match'; return;
    }

    this.isBusy = true;
    try {
      // Check duplicate
      const existing = await this.dbRun(
        'SELECT user_id FROM users WHERE LOWER(username) = LOWER(?)',
        [username.trim()],
        'get'
      );
      if (existing) {
        this.addUserError = 'Username already exists';
        this.isBusy = false;
        return;
      }

      await this.dbRun(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, datetime("now"))',
        [username.trim(), password],
        'run'
      );

      await this.loadUsers();
      this.closeAddUserModal();
      this.showToast(`User "${username.trim()}" added successfully`);
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error?.message?.includes('UNIQUE')) {
        this.addUserError = 'Username already exists';
      } else {
        this.addUserError = 'Failed to add user. Please try again.';
      }
    } finally {
      this.isBusy = false;
    }
  }

  // ── Delete User ───────────────────────────────────────────────────────────

  async deleteUser(userId: number, username: string) {
    if (userId === this.currentUser?.user_id) {
      this.showToast('Cannot delete your own account', 'error'); return;
    }
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;

    this.isBusy = true;
    try {
      await this.dbRun('DELETE FROM users WHERE user_id = ?', [userId], 'run');
      await this.loadUsers();
      this.showToast(`User "${username}" deleted`);
    } catch (error) {
      console.error('Delete user error:', error);
      this.showToast('Failed to delete user', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  // ── Backup / Restore / Clear ──────────────────────────────────────────────

  async backupDatabase() {
    this.isBusy = true;
    try {
      // @ts-ignore
      const result = await window.electronAPI.database.backup();
      if (result.success) {
        this.lastBackup = new Date().toLocaleString();
        localStorage.setItem('lastBackup', this.lastBackup);
        this.showToast(`Backup saved: ${result.path}`);
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
    if (!confirm('⚠️ Restoring will overwrite all current data. Continue?')) return;
    this.isBusy = true;
    try {
      // @ts-ignore
      const result = await window.electronAPI.database.restore();
      if (result.success) {
        this.showToast('Database restored. Reloading…');
        setTimeout(() => window.location.reload(), 2000);
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
    if (!confirm('⚠️ This will delete ALL data from the database! Continue?')) return;
    if (!confirm('Are you ABSOLUTELY sure? This action cannot be undone!')) return;
    this.isBusy = true;
    this.showToast('Clearing data…');
    this.performClearData();
  }

  async performClearData() {
    try {
      const tables = [
        'sale_items', 'sales', 'batch_items', 'purchase_batches',
        'stock_log', 'customerpricerecord', 'payment_records',
        'medicines', 'customers', 'company', 'users',
      ];
      for (const table of tables) {
        await this.dbRun(`DELETE FROM ${table}`, [], 'run');
      }
      await this.dbRun(
        `INSERT INTO users (username, password_hash) VALUES ('admin', 'admin123')`, [], 'run'
      );
      await this.dbRun(
        `INSERT INTO customers (full_name, phone, address) VALUES ('walkin', '9090909090', 'walkin')`, [], 'run'
      );
      this.showToast('All data cleared. Reloading…');
      localStorage.clear();
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showToast('Failed to clear data', 'error');
    } finally {
      this.isBusy = false;
    }
  }
}