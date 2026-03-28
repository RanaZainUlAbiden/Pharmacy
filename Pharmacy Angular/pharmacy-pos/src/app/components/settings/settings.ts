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

  currentUser: any = null;
  users: any[] = [];

  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  showCurrentPw  = false;
  showNewPw      = false;
  showConfirmPw  = false;

  showAddUserModal = false;
  addUserError     = '';
  newUserForm = {
    username: '', password: '', confirmPassword: '',
    showPassword: false, showConfirm: false,
  };

  companySettings = {
    name: 'Pharmacy POS', address: '123 Main Street, Lahore, Pakistan',
    phone: '0300-1234567', email: 'info@pharmacy.com', taxRate: 17,
  };

  notifications = {
    lowStockAlert: true, expiringAlert: true,
    lowStockThreshold: 10, expiringDays: 30,
  };

  lastBackup: string | null = null;

  // ── CSV Import state ──────────────────────────────────────────────────────
  importStep: 'idle' | 'preview' | 'done' = 'idle';
  importParsedRows: any[]  = [];
  importPreviewRows: any[] = [];
  importValidRows: any[]   = [];
  importInvalidRows: any[] = [];
  importProgress   = 0;
  importIsRunning  = false;
  importedCount    = 0;
  skippedCount     = 0;
  importErrorCount = 0;
  packingOptions: any[] = [];

  activeTab: 'general' | 'users' | 'notifications' | 'backup' = 'general';
  isBusy    = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed     = false;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private taxService: TaxService,
  ) {
    const raw = localStorage.getItem('currentUser');
    if (raw) this.currentUser = JSON.parse(raw);
  }

  ngOnInit()    { this.loadUsers(); this.loadSettings(); this.loadPackingOptions(); }
  ngOnDestroy() { this.isDestroyed = true; if (this.toastTimer) clearTimeout(this.toastTimer); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 4000);
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

  // ── Password helpers ──────────────────────────────────────────────────────

  get passwordsMatch(): boolean {
    return !!this.passwordForm.newPassword &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword;
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
    const map: any = {
      0: { pct: 10,  cls: 'weak',   label: 'Very Weak'   },
      1: { pct: 25,  cls: 'weak',   label: 'Weak'        },
      2: { pct: 50,  cls: 'fair',   label: 'Fair'        },
      3: { pct: 65,  cls: 'good',   label: 'Good'        },
      4: { pct: 80,  cls: 'strong', label: 'Strong'      },
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
      this.users = await this.dbRun('SELECT user_id, username, created_at FROM users ORDER BY created_at');
    } catch (e) { this.showToast('Failed to load users', 'error'); }
  }

  loadSettings() {
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) this.companySettings = JSON.parse(savedCompany);
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) this.notifications = JSON.parse(savedNotifications);
    const savedBackup = localStorage.getItem('lastBackup');
    if (savedBackup) this.lastBackup = savedBackup;
  }

  async loadPackingOptions() {
    try {
      this.packingOptions = await this.dbRun('SELECT packing_id, packing_name FROM packing ORDER BY packing_name');
    } catch (e) { console.error('loadPackingOptions:', e); }
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
    if (!currentPassword || !newPassword || !confirmPassword) { this.showToast('Please fill all fields', 'error'); return; }
    if (newPassword !== confirmPassword) { this.showToast('New passwords do not match', 'error'); return; }
    if (newPassword.length < 4) { this.showToast('Password must be at least 4 characters', 'error'); return; }
    if (newPassword === currentPassword) { this.showToast('New password must differ from current', 'error'); return; }
    this.isBusy = true;
    try {
      const user = await this.dbRun('SELECT * FROM users WHERE user_id = ? AND password_hash = ?',
        [this.currentUser.user_id, currentPassword], 'get');
      if (!user) { this.showToast('Current password is incorrect', 'error'); return; }
      await this.dbRun('UPDATE users SET password_hash = ? WHERE user_id = ?',
        [newPassword, this.currentUser.user_id], 'run');
      this.clearPasswordForm();
      this.showToast('Password changed successfully');
    } catch (e) { this.showToast('Failed to change password', 'error'); }
    finally { this.isBusy = false; }
  }

  // ── Add User Modal ────────────────────────────────────────────────────────

  openAddUserModal() {
    this.newUserForm = { username: '', password: '', confirmPassword: '', showPassword: false, showConfirm: false };
    this.addUserError = '';
    this.showAddUserModal = true;
  }

  closeAddUserModal() { this.showAddUserModal = false; this.addUserError = ''; }

  async submitAddUser() {
    const { username, password, confirmPassword } = this.newUserForm;
    this.addUserError = '';
    if (!username.trim())          { this.addUserError = 'Username is required'; return; }
    if (username.trim().length < 3){ this.addUserError = 'Username must be at least 3 characters'; return; }
    if (!password)                 { this.addUserError = 'Password is required'; return; }
    if (password.length < 4)       { this.addUserError = 'Password must be at least 4 characters'; return; }
    if (password !== confirmPassword){ this.addUserError = 'Passwords do not match'; return; }
    this.isBusy = true;
    try {
      const existing = await this.dbRun('SELECT user_id FROM users WHERE LOWER(username) = LOWER(?)',
        [username.trim()], 'get');
      if (existing) { this.addUserError = 'Username already exists'; return; }
      await this.dbRun('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, datetime("now"))',
        [username.trim(), password], 'run');
      await this.loadUsers();
      this.closeAddUserModal();
      this.showToast(`User "${username.trim()}" added successfully`);
    } catch (e: any) {
      this.addUserError = e?.message?.includes('UNIQUE') ? 'Username already exists' : 'Failed to add user';
    } finally { this.isBusy = false; }
  }

  async deleteUser(userId: number, username: string) {
    if (userId === this.currentUser?.user_id) { this.showToast('Cannot delete your own account', 'error'); return; }
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    this.isBusy = true;
    try {
      await this.dbRun('DELETE FROM users WHERE user_id = ?', [userId], 'run');
      await this.loadUsers();
      this.showToast(`User "${username}" deleted`);
    } catch (e) { this.showToast('Failed to delete user', 'error'); }
    finally { this.isBusy = false; }
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
      } else { this.showToast('Backup failed', 'error'); }
    } catch (e) { this.showToast('Backup failed', 'error'); }
    finally { this.isBusy = false; }
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
      } else { this.showToast('Restore failed', 'error'); }
    } catch (e) { this.showToast('Restore failed', 'error'); }
    finally { this.isBusy = false; }
  }

  clearData() {
    if (!confirm('⚠️ This will delete ALL data! Continue?')) return;
    if (!confirm('Are you ABSOLUTELY sure? This cannot be undone!')) return;
    this.isBusy = true;
    this.showToast('Clearing data…');
    this.performClearData();
  }

  async performClearData() {
    try {
      const tables = ['sale_items','sales','batch_items','purchase_batches',
        'stock_log','customerpricerecord','payment_records','medicines','customers','company','users'];
      for (const t of tables) await this.dbRun(`DELETE FROM ${t}`, [], 'run');
      await this.dbRun(`INSERT INTO users (username, password_hash) VALUES ('admin', 'admin123')`, [], 'run');
      await this.dbRun(`INSERT INTO customers (full_name, phone, address) VALUES ('walkin', '9090909090', 'walkin')`, [], 'run');
      this.showToast('All data cleared. Reloading…');
      localStorage.clear();
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) { this.showToast('Failed to clear data', 'error'); }
    finally { this.isBusy = false; }
  }

  // ════════════════════════════════════════════════════════════════════
  // CSV IMPORT — lives inside Backup tab
  // ════════════════════════════════════════════════════════════════════

  downloadTemplate() {
    const content = 'Medicine Name,Sale Price,Purchase Price,Min Threshold,Opening Stock,Packing\n'
      + 'Panadol 500mg,25,18,10,500,Tablet\n'
      + 'Augmentin 625mg,350,280,5,200,Capsule\n'
      + 'Calpol Syrup,85,60,20,100,Syrup';
    const blob = new Blob([content], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'medicines_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  onCSVFilePicked(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { this.showToast('Please select a .csv file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.zone.run(() => { this.parseCSV(text); this.cdr.detectChanges(); });
    };
    reader.readAsText(file);
  }

  private parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { this.showToast('CSV is empty or has no data rows', 'error'); return; }
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('name') || header.includes('medicine') || header.includes('price');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    this.importParsedRows = [];
    this.importValidRows  = [];
    this.importInvalidRows = [];

    for (let i = 0; i < dataLines.length; i++) {
      const cols = this.splitCSVLine(dataLines[i]);
      if (cols.length < 2) continue;
      const name          = cols[0]?.trim();
      const salePrice     = parseFloat(cols[1]?.trim());
      const purchasePrice = parseFloat(cols[2]?.trim() || '0');
      const minThreshold  = parseInt(cols[3]?.trim()  || '0', 10);
      const openingStock  = parseInt(cols[4]?.trim()  || '0', 10);
      const packingName   = cols[5]?.trim() || '';
      const row = {
        rowNum: i + (hasHeader ? 2 : 1), name, salePrice, purchasePrice,
        minThreshold: isNaN(minThreshold) ? 0 : minThreshold,
        openingStock:  isNaN(openingStock)  ? 0 : openingStock,
        packingName, packingId: this.resolvePackingId(packingName),
        valid: true, error: ''
      };
      if (!name || name.length < 2)          { row.valid = false; row.error = 'Name missing'; }
      else if (isNaN(salePrice) || salePrice <= 0) { row.valid = false; row.error = 'Invalid sale price'; }
      this.importParsedRows.push(row);
      if (row.valid) this.importValidRows.push(row);
      else           this.importInvalidRows.push(row);
    }
    this.importPreviewRows = this.importParsedRows.slice(0, 10);
    this.importStep = 'preview';
    this.cdr.detectChanges();
  }

  private splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  }

  private resolvePackingId(name: string): number {
    if (!name || this.packingOptions.length === 0) return 1;
    const found = this.packingOptions.find(p => p.packing_name.toLowerCase() === name.toLowerCase());
    return found ? found.packing_id : this.packingOptions[0].packing_id;
  }

  async startCSVImport() {
    if (this.importValidRows.length === 0) { this.showToast('No valid rows to import', 'error'); return; }
    this.importIsRunning  = true;
    this.importedCount    = 0;
    this.skippedCount     = 0;
    this.importErrorCount = 0;
    this.importProgress   = 0;
    this.cdr.detectChanges();

    const today     = new Date().toISOString().split('T')[0];
    const batchName = `OPENING-STOCK-${Date.now()}`;

    try {
      await this.dbRun(`INSERT OR IGNORE INTO company (company_name, contact, address) VALUES ('Opening Stock Import','0000000000','N/A')`, [], 'run');
      const supplier: any = await this.dbRun(`SELECT company_id FROM company WHERE company_name = 'Opening Stock Import'`, [], 'get');
      await this.dbRun(`INSERT OR IGNORE INTO purchase_batches (company_id, purchase_date, total_price, paid, BatchName, status) VALUES (?,?,0,0,?,'completed')`,
        [supplier.company_id, today, batchName], 'run');
      const batch: any = await this.dbRun(`SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ?`, [batchName], 'get');

      for (let i = 0; i < this.importValidRows.length; i++) {
        const row = this.importValidRows[i];
        try {
          const existing: any = await this.dbRun(`SELECT product_id FROM medicines WHERE name = ?`, [row.name], 'get');
          let productId: number;
          if (existing) {
            productId = existing.product_id;
            this.skippedCount++;
          } else {
            const result: any = await this.dbRun(
              `INSERT INTO medicines (name, packing_id, sale_price, minimum_threshold) VALUES (?,?,?,?)`,
              [row.name, row.packingId, row.salePrice, row.minThreshold], 'run');
            productId = result.lastID;
            this.importedCount++;
          }
          if (row.openingStock > 0) {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 2);
            await this.dbRun(
              `INSERT INTO batch_items (purchase_batch_id, product_id, purchase_price, quantity_received, expiry_date, quantity_remaining) VALUES (?,?,?,?,?,?)`,
              [batch.purchase_batch_id, productId, row.purchasePrice || 0, row.openingStock,
               expiry.toISOString().split('T')[0], row.openingStock], 'run');
          }
        } catch (rowErr) { console.error(`Row ${row.rowNum}:`, rowErr); this.importErrorCount++; }

        this.importProgress = Math.round(((i + 1) / this.importValidRows.length) * 100);
        this.cdr.detectChanges();
        if (i % 50 === 0) await new Promise(r => setTimeout(r, 0));
      }
      this.importStep = 'done';
      this.showToast(`Import complete! ${this.importedCount} added, ${this.skippedCount} skipped`);
    } catch (e: any) {
      this.showToast('Import failed: ' + (e.message || e), 'error');
    } finally {
      this.importIsRunning = false;
      this.cdr.detectChanges();
    }
  }

  resetImport() {
    this.importStep = 'idle';
    this.importParsedRows = []; this.importPreviewRows = [];
    this.importValidRows  = []; this.importInvalidRows = [];
    this.importProgress   = 0;  this.importIsRunning  = false;
    this.importedCount    = 0;  this.skippedCount     = 0; this.importErrorCount = 0;
    this.cdr.detectChanges();
  }
}
// NOTE: Add the following CSS to the END of your existing settings.scss file

/*
.section-desc { color: #6b7280; font-size: .88rem; margin: -.25rem 0 1rem; }

.import-template-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; padding: 1rem 1.25rem; background: rgba(102,126,234,.05);
  border: 1.5px solid rgba(102,126,234,.2); border-radius: 10px;
  margin-bottom: 1.25rem; flex-wrap: wrap;
  .import-template-info { display: flex; gap: .75rem; align-items: flex-start; flex: 1;
    .material-symbols-outlined { font-size: 26px; color: #667eea; margin-top: 2px; }
    strong { font-size: .9rem; color: #1f2937; }
    p { margin: .2rem 0 .4rem; font-size: .82rem; color: #6b7280; }
    .col-hint { font-size: .75rem; background: #f3f4f6; padding: 3px 8px; border-radius: 6px; color: #374151; display: block; }
  }
}

.btn-outline-sm {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .5rem 1rem; background: white; border: 1.5px solid #e5e7eb;
  border-radius: 8px; font-size: .85rem; font-weight: 600; cursor: pointer; color: #1f2937;
  white-space: nowrap; flex-shrink: 0;
  &:hover { border-color: #667eea; color: #667eea; }
  .material-symbols-outlined { font-size: 16px; }
}

.import-drop-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2.5rem 2rem; border: 2px dashed #e5e7eb; border-radius: 12px;
  cursor: pointer; text-align: center; transition: all .2s; margin-bottom: .5rem;
  &:hover { border-color: #667eea; background: rgba(102,126,234,.03); }
  .material-symbols-outlined { font-size: 48px; color: #667eea; opacity: .6; margin-bottom: .6rem; }
  p { margin: 0; font-size: .9rem; color: #1f2937; }
  .dz-hint { font-size: .8rem; color: #6b7280; margin-top: .3rem !important; }
}

.import-chips { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: 1rem; }
.ichip {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .3rem .8rem; border-radius: 20px; font-size: .78rem; font-weight: 600;
  .material-symbols-outlined { font-size: 14px; }
  &.ichip-total   { background: rgba(102,126,234,.1); color: #4338ca; }
  &.ichip-valid   { background: #d1fae5; color: #065f46; }
  &.ichip-invalid { background: #fee2e2; color: #b91c1c; }
}

.warning-box.amber {
  background: #fffbeb; border-color: #fcd34d; color: #92400e;
  ul { margin: .3rem 0 0 1rem; padding: 0; font-size: .82rem; }
  li { margin-bottom: .15rem; }
}

.import-preview-wrap { overflow-x: auto; margin-bottom: 1rem; }
.preview-hint { font-size: .78rem; color: #6b7280; margin: 0 0 .5rem; }
.import-preview-table {
  width: 100%; border-collapse: collapse; font-size: .82rem;
  th { padding: .5rem .7rem; background: linear-gradient(135deg,#667eea,#764ba2);
    color: white; text-align: left; font-size: .72rem; text-transform: uppercase; }
  td { padding: .5rem .7rem; border-bottom: 1px solid #e5e7eb; }
  tr.row-invalid td { background: #fff5f5; }
  .istatus { padding: 2px 7px; border-radius: 10px; font-size: .72rem; font-weight: 700;
    &.ok  { background: #d1fae5; color: #065f46; }
    &.err { background: #fee2e2; color: #b91c1c; }
  }
}

.import-progress { margin-bottom: 1rem; }
.iprog-label { font-size: .82rem; color: #6b7280; margin-bottom: .35rem; }
.iprog-bar { height: 8px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
.iprog-fill { height: 100%; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 99px; transition: width .15s; }

.import-done {
  display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.5rem;
  .import-done-icon { font-size: 56px; color: #10b981; margin-bottom: .75rem; font-variation-settings: 'FILL' 1; }
  h4 { font-size: 1.2rem; color: #1f2937; margin: 0 0 1rem; }
  .import-done-hint { color: #6b7280; font-size: .85rem; margin: .75rem 0 1rem; }
}
.import-results { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; }
.ires {
  display: flex; flex-direction: column; align-items: center;
  padding: 1rem 1.5rem; border-radius: 10px; min-width: 110px;
  .ires-num { font-size: 2rem; font-weight: 900; }
  .ires-lbl { font-size: .75rem; font-weight: 600; margin-top: .25rem; }
  &.ires-added   { background: #d1fae5; .ires-num, .ires-lbl { color: #065f46; } }
  &.ires-skipped { background: #fef3c7; .ires-num, .ires-lbl { color: #92400e; } }
  &.ires-error   { background: #fee2e2; .ires-num, .ires-lbl { color: #b91c1c; } }
}
*/