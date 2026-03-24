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

  // Custom confirm dialog
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

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((result: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(result); }))
        .catch((err: any)   => this.zone.run(() => { if (!this.isDestroyed) reject(err); }));
    });
  }

  async loadCompanies() {
    if (this.isDestroyed) return;
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      // Remove medicine count since company_id is removed from medicines
      const result = await this.dbRun(`SELECT * FROM company ORDER BY company_name`);
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
      // Since medicines no longer have company_id, show empty list
      this.companyMedicines = [];
    } catch (e) { console.error(e); }
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3000);
  }

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

  private readonly phoneRegex = /^(\+92|0)3[0-9]{2}[-]?[0-9]{7}$/;

  private clearErrors() {
    this.nameError = this.contactError = this.addressError = '';
  }

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
            this.showToast('Cannot delete: company has records.', 'error');
          }
        } finally {
          if (!this.isDestroyed) { this.isBusy = false; this.cdr.detectChanges(); }
        }
      });
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency', currency: 'PKR', minimumFractionDigits: 0
    }).format(amount || 0);
  }
}