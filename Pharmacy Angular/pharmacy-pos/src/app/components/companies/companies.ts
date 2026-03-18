import { Component, OnInit, NgZone, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class CompaniesComponent implements OnInit, OnDestroy {

  // ── View ──────────────────────────────────────────────────────────────────
  viewMode: 'list' | 'details' = 'list';
  formMode: 'add' | 'edit' | null = null;
  showForm = false;
  // Every time this changes, Angular treats the form as a completely new element
  formKey = 0;

  // ── Data ──────────────────────────────────────────────────────────────────
  companies: any[] = [];
  selectedCompany: any = null;
  searchTerm = '';
  companyMedicines: any[] = [];

  // ── Form fields (plain primitives — never an object) ──────────────────────
  formId: number | null = null;
  formName    = '';
  formContact = '';
  formAddress = '';

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;

  // ── Busy state ────────────────────────────────────────────────────────────
  isBusy    = false;
  isLoading = false;

  // ── Cleanup flag ──────────────────────────────────────────────────────────
  private isDestroyed = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.resetBusyState();
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  // ── Internal: run every DB call inside NgZone ─────────────────────────────

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      // window.electronAPI.database.query resolves outside Angular zone.
      // Wrapping in zone.run() forces change detection after every IPC response.
      this.db.query(sql, params, method)
        .then((result: any) => {
          this.zone.run(() => {
            if (!this.isDestroyed) {
              resolve(result);
            }
          });
        })
        .catch((err: any) => {
          this.zone.run(() => {
            console.error('Database error in dbRun:', err);
            if (!this.isDestroyed) {
              reject(err);
            }
          });
        });
    });
  }

  // ── Reset busy state ──────────────────────────────────────────────────────

  private resetBusyState() {
    if (this.isDestroyed) return;
    this.zone.run(() => {
      this.isBusy = false;
      this.cdr.detectChanges();
    });
  }

  // ── Load list ─────────────────────────────────────────────────────────────

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
      if (!this.isDestroyed) {
        this.companies = Array.isArray(result) ? [...result] : [];
      }
    } catch (e) {
      console.error(e);
      if (!this.isDestroyed) {
        this.showToast('Failed to load companies.', 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
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
         GROUP BY m.product_id ORDER BY m.name`,
        [id]
      );
      if (!this.isDestroyed) {
        this.companyMedicines = Array.isArray(result) ? [...result] : [];
        this.cdr.detectChanges();
      }
    } catch (e) { 
      console.error(e); 
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

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

  // ── Filtered list ─────────────────────────────────────────────────────────

  get filteredCompanies(): any[] {
    if (!this.searchTerm.trim() || this.isDestroyed) return this.companies;
    const t = this.searchTerm.toLowerCase();
    return this.companies.filter(c =>
      c.company_name.toLowerCase().includes(t) ||
      (c.contact && c.contact.toLowerCase().includes(t)) ||
      (c.address  && c.address.toLowerCase().includes(t))
    );
  }

  trackById(_: number, item: any) { return item.company_id; }

  // ── Open form — KEY trick ─────────────────────────────────────────────────
  // formKey increment forces *ngIf + [attr.key] to treat the form
  // as a brand-new DOM element every single time. No stale ngModel, ever.

  private openForm(mode: 'add' | 'edit') {
    if (this.isDestroyed) return;
    // 1. Hide form so Angular destroys it
    this.showForm = false;
    this.cdr.detectChanges();

    // 2. Bump key — next render will be a completely fresh form
    this.formKey++;
    this.formMode = mode;

    // 3. Show on next macrotask — guarantees prior DOM is gone
    setTimeout(() => {
      this.zone.run(() => {
        if (!this.isDestroyed) {
          this.showForm = true;
          this.cdr.detectChanges();
        }
      });
    }, 0);
  }

  showAddForm() {
    this.formId = null; 
    this.formName = ''; 
    this.formContact = ''; 
    this.formAddress = '';
    this.openForm('add');
  }

  showEditForm(company: any) {
    // Set values BEFORE opening so inputs start pre-filled
    this.formId      = company.company_id;
    this.formName    = company.company_name || '';
    this.formContact = company.contact      || '';
    this.formAddress = company.address      || '';
    this.openForm('edit');
  }

  showDetails(company: any) {
    if (this.isDestroyed) return;
    this.showForm = false; 
    this.formMode = null;
    this.selectedCompany  = company;
    this.companyMedicines = [];
    this.viewMode = 'details';
    this.cdr.detectChanges();
    this.loadCompanyMedicines(company.company_id);
  }

  cancelForm() {
    if (this.isDestroyed) return;
    this.showForm = false; 
    this.formMode = null;
    this.formId = null; 
    this.formName = ''; 
    this.formContact = ''; 
    this.formAddress = '';
    this.cdr.detectChanges();
  }

  goBack() {
    if (this.isDestroyed) return;
    this.showForm = false; 
    this.formMode = null;
    this.viewMode = 'list'; 
    this.selectedCompany = null; 
    this.companyMedicines = [];
    this.cdr.detectChanges();
  }

  // ── ADD ───────────────────────────────────────────────────────────────────

  async addCompany() {
    const name    = this.formName.trim();
    const contact = this.formContact.trim();
    const address = this.formAddress.trim();
    if (!name || !contact || !address) { 
      this.showToast('Please fill all required fields.', 'error'); 
      return; 
    }
    if (this.isBusy || this.isDestroyed) return;

    this.isBusy = true;
    this.cdr.detectChanges();
    
    // Close form immediately — do NOT wait for DB
    this.showForm = false; 
    this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(
        `INSERT INTO company (company_name, contact, address) VALUES (?, ?, ?)`,
        [name, contact, address], 'run'
      );
      if (!this.isDestroyed) {
        await this.loadCompanies();
        this.showToast('Company added successfully!');
      }
    } catch (e: any) {
      console.error(e);
      if (!this.isDestroyed) {
        this.showToast('Failed to add company.', 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async updateCompany() {
    const name    = this.formName.trim();
    const contact = this.formContact.trim();
    const address = this.formAddress.trim();
    if (!name || !contact || !address) { 
      this.showToast('Please fill all required fields.', 'error'); 
      return; 
    }
    if (!this.formId) { 
      this.showToast('Company ID missing.', 'error'); 
      return; 
    }
    if (this.isBusy || this.isDestroyed) return;

    const id = this.formId;
    this.isBusy = true;
    this.cdr.detectChanges();
    
    // Close form immediately
    this.showForm = false; 
    this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(
        `UPDATE company SET company_name=?, contact=?, address=? WHERE company_id=?`,
        [name, contact, address, id], 'run'
      );
      if (!this.isDestroyed) {
        await this.loadCompanies();
        this.showToast('Company updated successfully!');
      }
    } catch (e: any) {
      console.error(e);
      if (!this.isDestroyed) {
        this.showToast('Failed to update company.', 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  deleteCompany(companyId: number) {
    // Run the entire operation inside zone to ensure proper change detection
    this.zone.run(() => {
      const confirmed = confirm('Are you sure you want to delete this company?');
      if (!confirmed || this.isBusy || this.isDestroyed) return;

      this.isBusy = true;
      this.cdr.detectChanges(); // Force immediate UI update
      
      // Optimistic removal
      const backup = [...this.companies];
      this.companies = this.companies.filter(c => c.company_id !== companyId);
      this.cdr.detectChanges();

      this.dbRun('DELETE FROM company WHERE company_id=?', [companyId], 'run')
        .then(() => {
          this.zone.run(() => {
            if (!this.isDestroyed) {
              this.showToast('Company deleted successfully!');
              this.isBusy = false;
              this.cdr.detectChanges();
            }
          });
        })
        .catch((e: any) => {
          console.error('Delete error:', e);
          this.zone.run(() => {
            if (!this.isDestroyed) {
              // Rollback
              this.companies = backup;
              
              // Check for foreign key constraint error
              if (e?.message?.includes('FOREIGN KEY') || e?.message?.includes('constraint failed')) {
                this.showToast('Cannot delete: medicines are linked to this company.', 'error');
              } else {
                this.showToast('Failed to delete company.', 'error');
              }
              
              // CRITICAL FIX: Always reset isBusy and trigger change detection
              this.isBusy = false;
              this.cdr.detectChanges();
              
              // Force a complete re-render of the view to ensure all elements are responsive
              setTimeout(() => {
                this.zone.run(() => {
                  if (!this.isDestroyed) {
                    this.cdr.detectChanges();
                  }
                });
              }, 100);
            }
          });
        })
        .finally(() => {
          // This ensures isBusy is reset even if something unexpected happens
          this.zone.run(() => {
            if (!this.isDestroyed && this.isBusy) {
              this.isBusy = false;
              this.cdr.detectChanges();
            }
          });
        });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  }

  getStockClass(stock: number, threshold: number): string {
    const s = stock ?? 0;
    const t = threshold ?? 0;
    if (s === 0)       return 'badge-out';
    if (s < t * 0.25)  return 'badge-critical';
    if (s < t)         return 'badge-low';
    return 'badge-ok';
  }
}