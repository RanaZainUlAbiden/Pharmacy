import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.scss']
})
export class CompaniesComponent implements OnInit, OnDestroy {

  // View
  viewMode: 'list' | 'details' = 'list';
  formMode: 'add' | 'edit' | null = null;
  showForm = false;
  formKey = 0;

  // Data
  companies: any[] = [];
  selectedCompany: any = null;
  searchTerm = '';
  companyMedicines: any[] = [];

  // Form fields
  formId: number | null = null;
  formName    = '';
  formContact = '';
  formAddress = '';

  // Validation errors
  nameError    = '';
  contactError = '';
  addressError = '';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;

  // Busy
  isBusy    = false;
  isLoading = false;
  private isDestroyed = false;

  // ✅ Custom confirm dialog — window.confirm() nahi
  showConfirmDialog = false;
  confirmMessage    = '';
  private confirmCallback: (() => void) | null = null;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.loadCompanies(); }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Custom Confirm ────────────────────────────────────────────────────────

  private openConfirm(message: string, onConfirm: () => void) {
    this.zone.run(() => {
      this.confirmMessage  = message;
      this.confirmCallback = onConfirm;
      this.showConfirmDialog = true;
      this.cdr.detectChanges();
    });
  }

  onConfirmYes() {
    this.showConfirmDialog = false;
    this.cdr.detectChanges();
    if (this.confirmCallback) {
      const cb = this.confirmCallback;
      this.confirmCallback = null;
      cb();
    }
  }

  onConfirmNo() {
    this.zone.run(() => {
      this.showConfirmDialog = false;
      this.confirmCallback   = null;
      this.cdr.detectChanges();
    });
  }

  // ── DB Helper ─────────────────────────────────────────────────────────────

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((result: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(result); }))
        .catch((err: any)   => this.zone.run(() => { if (!this.isDestroyed) reject(err); }));
    });
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async loadCompanies() {
    if (this.isDestroyed) return;
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      const result = await this.dbRun(
        `SELECT c.*, COUNT(m.product_id) as medicine_count
         FROM company c
         LEFT JOIN medicines m ON c.company_id = m.company_id
         GROUP BY c.company_id
         ORDER BY c.company_name`
      );
      if (!this.isDestroyed) this.companies = Array.isArray(result) ? [...result] : [];
    } catch (e) {
      if (!this.isDestroyed) this.showToast('Failed to load companies.', 'error');
    } finally {
      if (!this.isDestroyed) { this.isLoading = false; this.cdr.detectChanges(); }
    }
  }

  async loadCompanyMedicines(id: number) {
    if (this.isDestroyed) return;
    try {
      const result = await this.dbRun(
        `SELECT m.product_id, m.name, m.sale_price, m.minimum_threshold,
                cat.category_name, p.packing_name,
                COALESCE(SUM(bi.quantity_remaining),0) as current_stock
         FROM medicines m
         LEFT JOIN categories cat ON m.category_id = cat.category_id
         LEFT JOIN packing p ON m.packing_id = p.packing_id
         LEFT JOIN batch_items bi ON m.product_id = bi.product_id
         WHERE m.company_id = ?
         GROUP BY m.product_id ORDER BY m.name`, [id]
      );
      if (!this.isDestroyed) {
        this.companyMedicines = Array.isArray(result) ? [...result] : [];
        this.cdr.detectChanges();
      }
    } catch (e) { console.error(e); }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3000);
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  get filteredCompanies(): any[] {
    if (!this.searchTerm.trim()) return this.companies;
    const t = this.searchTerm.toLowerCase();
    return this.companies.filter(c =>
      c.company_name.toLowerCase().includes(t) ||
      (c.contact && c.contact.toLowerCase().includes(t)) ||
      (c.address  && c.address.toLowerCase().includes(t))
    );
  }

  trackById(_: number, item: any) { return item.company_id; }

  // ── Validation ────────────────────────────────────────────────────────────

  // Pakistan number formats: 03XX-XXXXXXX  /  +923XXXXXXXXX  /  03XXXXXXXXX
  private readonly phoneRegex = /^(\+92|0)3[0-9]{2}[-]?[0-9]{7}$/;

  private clearErrors() {
    this.nameError = this.contactError = this.addressError = '';
  }

  // Real-time validation — HTML se call hoti hai (blur event)
  validateName() {
    const v = this.formName.trim();
    if (!v)          this.nameError = 'Company name is required.';
    else if (v.length < 2) this.nameError = 'Name must be at least 2 characters.';
    else if (v.length > 100) this.nameError = 'Name cannot exceed 100 characters.';
    else             this.nameError = '';
  }

  validateContact() {
    const v = this.formContact.trim();
    if (!v)                       this.contactError = 'Contact number is required.';
    else if (!this.phoneRegex.test(v)) this.contactError = 'Format: 03XX-XXXXXXX or 03XXXXXXXXX';
    else                          this.contactError = '';
  }

  validateAddress() {
    const v = this.formAddress.trim();
    if (!v)            this.addressError = 'Address is required.';
    else if (v.length < 5)  this.addressError = 'Address must be at least 5 characters.';
    else if (v.length > 255) this.addressError = 'Address cannot exceed 255 characters.';
    else               this.addressError = '';
  }

  private validateAll(): boolean {
    this.validateName();
    this.validateContact();
    this.validateAddress();
    return !this.nameError && !this.contactError && !this.addressError;
  }

  get formInvalid(): boolean {
    return !!this.nameError || !!this.contactError || !!this.addressError
      || !this.formName.trim() || !this.formContact.trim() || !this.formAddress.trim();
  }

  // ── Form open/close ───────────────────────────────────────────────────────

  private openForm(mode: 'add' | 'edit') {
    if (this.isDestroyed) return;
    this.clearErrors();
    this.showForm = false;
    this.cdr.detectChanges();
    this.formKey++;
    this.formMode = mode;
    setTimeout(() => {
      this.zone.run(() => {
        if (!this.isDestroyed) { this.showForm = true; this.cdr.detectChanges(); }
      });
    }, 0);
  }

  showAddForm() {
    this.formId = null; this.formName = ''; this.formContact = ''; this.formAddress = '';
    this.openForm('add');
  }

  showEditForm(company: any) {
    this.formId      = company.company_id;
    this.formName    = company.company_name || '';
    this.formContact = company.contact      || '';
    this.formAddress = company.address      || '';
    this.openForm('edit');
  }

  showDetails(company: any) {
    if (this.isDestroyed) return;
    this.showForm = false; this.formMode = null;
    this.selectedCompany = company; this.companyMedicines = [];
    this.viewMode = 'details';
    this.cdr.detectChanges();
    this.loadCompanyMedicines(company.company_id);
  }

  cancelForm() {
    if (this.isDestroyed) return;
    this.showForm = false; this.formMode = null;
    this.formId = null; this.formName = ''; this.formContact = ''; this.formAddress = '';
    this.clearErrors();
    this.viewMode = 'list';
    this.cdr.detectChanges();
  }

  goBack() {
    if (this.isDestroyed) return;
    this.showForm = false; this.formMode = null;
    this.viewMode = 'list'; this.selectedCompany = null; this.companyMedicines = [];
    this.cdr.detectChanges();
  }

  // ── ADD ───────────────────────────────────────────────────────────────────

  async addCompany() {
    if (!this.validateAll() || this.isBusy || this.isDestroyed) return;

    const name = this.formName.trim(), contact = this.formContact.trim(), address = this.formAddress.trim();
    this.isBusy = true;
    this.showForm = false; this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(`INSERT INTO company (company_name, contact, address) VALUES (?, ?, ?)`,
        [name, contact, address], 'run');
      if (!this.isDestroyed) { await this.loadCompanies(); this.showToast('Company added successfully!'); }
    } catch (e: any) {
      if (!this.isDestroyed) {
        const msg = e?.message?.includes('UNIQUE') ? 'This company already exists.' : 'Failed to add company.';
        this.showToast(msg, 'error');
      }
    } finally {
      if (!this.isDestroyed) { this.isBusy = false; this.cdr.detectChanges(); }
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async updateCompany() {
    if (!this.validateAll() || !this.formId || this.isBusy || this.isDestroyed) return;

    const id = this.formId;
    const name = this.formName.trim(), contact = this.formContact.trim(), address = this.formAddress.trim();
    this.isBusy = true;
    this.showForm = false; this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(`UPDATE company SET company_name=?, contact=?, address=? WHERE company_id=?`,
        [name, contact, address, id], 'run');
      if (!this.isDestroyed) { await this.loadCompanies(); this.showToast('Company updated successfully!'); }
    } catch (e: any) {
      if (!this.isDestroyed) {
        const msg = e?.message?.includes('UNIQUE') ? 'This company name already exists.' : 'Failed to update company.';
        this.showToast(msg, 'error');
      }
    } finally {
      if (!this.isDestroyed) { this.isBusy = false; this.cdr.detectChanges(); }
    }
  }

  // ── DELETE — ✅ confirm() hata ke custom dialog lagaya ────────────────────

  deleteCompany(companyId: number) {
    if (this.isBusy || this.isDestroyed) return;

    this.openConfirm('Are you sure you want to delete this company?', () => {
      this.zone.run(async () => {
        this.isBusy = true;
        this.cdr.detectChanges();

        try {
          await this.dbRun('DELETE FROM company WHERE company_id=?', [companyId], 'run');
          if (!this.isDestroyed) {
            await this.loadCompanies();
            this.showToast('Company deleted successfully!');
            if (this.selectedCompany?.company_id === companyId) {
              this.viewMode = 'list'; this.selectedCompany = null; this.companyMedicines = [];
            }
          }
        } catch (e: any) {
          if (!this.isDestroyed) {
            const msg = e?.message?.includes('FOREIGN KEY') || e?.message?.includes('constraint')
              ? 'Cannot delete: medicines are linked to this company.'
              : 'Failed to delete company.';
            this.showToast(msg, 'error');
          }
        } finally {
          if (!this.isDestroyed) { this.isBusy = false; this.cdr.detectChanges(); }
        }
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency', currency: 'PKR', minimumFractionDigits: 0
    }).format(amount || 0);
  }

  getStockClass(stock: number, threshold: number): string {
    const s = stock ?? 0, t = threshold ?? 0;
    if (s === 0)      return 'badge-out';
    if (s < t * 0.25) return 'badge-critical';
    if (s < t)        return 'badge-low';
    return 'badge-ok';
  }
}