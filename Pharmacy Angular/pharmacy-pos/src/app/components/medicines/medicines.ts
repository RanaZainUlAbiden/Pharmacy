import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicines.html',
  styleUrls: ['./medicines.scss']
})
export class MedicinesComponent implements OnInit, OnDestroy {

  // ── View ──────────────────────────────────────────────────────────────────
  viewMode: 'list' | 'details' = 'list';
  formMode: 'add' | 'edit' | null = null;
  showForm = false;
  formKey = 0; // Forces fresh form on each open

  // ── Data ──────────────────────────────────────────────────────────────────
  medicines: any[] = [];
  companies: any[] = [];
  categories: any[] = [];
  packings: any[] = [];
  selectedMedicine: any = null;
  medicineBatches: any[] = [];
  searchTerm = '';

  // ── Form fields ───────────────────────────────────────────────────────────
  formId: number | null = null;
  formName = '';
  formDescription = '';
  formCompanyId: number | null = null;
  formCategoryId: number | null = null;
  formPackingId: number | null = null;
  formSalePrice: number | null = null;
  formMinimumThreshold: number | null = null;

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;

  // ── Busy state ────────────────────────────────────────────────────────────
  isBusy = false;
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
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  // ── Database helper (ensures zone.run) ────────────────────────────────────
  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
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
            console.error('Database error:', err);
            if (!this.isDestroyed) {
              reject(err);
            }
          });
        });
    });
  }

  // ── Load all dropdown data and medicines ──────────────────────────────────
  async loadInitialData() {
    if (this.isDestroyed) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // Load dropdowns in parallel
      const [companiesRes, categoriesRes, packingsRes, medicinesRes] = await Promise.all([
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name'),
        this.dbRun('SELECT category_id, category_name FROM categories ORDER BY category_name'),
        this.dbRun('SELECT packing_id, packing_name FROM packing ORDER BY packing_name'),
        this.loadMedicines() // This sets this.medicines internally
      ]);

      if (!this.isDestroyed) {
        this.companies = Array.isArray(companiesRes) ? companiesRes : [];
        this.categories = Array.isArray(categoriesRes) ? categoriesRes : [];
        this.packings = Array.isArray(packingsRes) ? packingsRes : [];
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      if (!this.isDestroyed) {
        this.showToast('Failed to load required data', 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async loadMedicines() {
    if (this.isDestroyed) return;
    
    try {
      const result = await this.dbRun(`
        SELECT 
          m.product_id,
          m.name,
          m.description,
          m.sale_price,
          m.minimum_threshold,
          c.company_id,
          c.company_name,
          cat.category_id,
          cat.category_name,
          p.packing_id,
          p.packing_name,
          COALESCE(SUM(bi.quantity_remaining), 0) as current_stock
        FROM medicines m
        LEFT JOIN company c ON m.company_id = c.company_id
        LEFT JOIN categories cat ON m.category_id = cat.category_id
        LEFT JOIN packing p ON m.packing_id = p.packing_id
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        ORDER BY m.name
      `);

      if (!this.isDestroyed) {
        this.medicines = Array.isArray(result) ? result : [];
      }
    } catch (error) {
      console.error('Failed to load medicines:', error);
      if (!this.isDestroyed) {
        this.showToast('Failed to load medicines', 'error');
      }
    }
  }

  async loadMedicineBatches(medicineId: number) {
    if (this.isDestroyed) return;

    try {
      const result = await this.dbRun(`
        SELECT 
          bi.*,
          pb.BatchName,
          pb.purchase_date
        FROM batch_items bi
        JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
        WHERE bi.product_id = ?
        ORDER BY bi.expiry_date
      `, [medicineId]);

      if (!this.isDestroyed) {
        this.medicineBatches = Array.isArray(result) ? result : [];
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
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
  get filteredMedicines(): any[] {
    if (!this.searchTerm.trim() || this.isDestroyed) return this.medicines;
    const term = this.searchTerm.toLowerCase();
    return this.medicines.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.company_name && m.company_name.toLowerCase().includes(term)) ||
      (m.category_name && m.category_name.toLowerCase().includes(term))
    );
  }

  trackById(_: number, item: any) { 
    return item.product_id; 
  }

  // ── Form management (fixed version - no race condition) ───────────────────
  private openForm(mode: 'add' | 'edit') {
    if (this.isDestroyed) return;

    // 1. Hide form
    this.showForm = false;
    this.cdr.detectChanges();

    // 2. Increment key for fresh form
    this.formKey++;
    this.formMode = mode;

    // 3. Use requestAnimationFrame instead of setTimeout for better timing
    requestAnimationFrame(() => {
      this.zone.run(() => {
        if (!this.isDestroyed) {
          this.showForm = true;
          this.cdr.detectChanges();
        }
      });
    });
  }

  showAddForm() {
    // Reset all form fields
    this.formId = null;
    this.formName = '';
    this.formDescription = '';
    this.formCompanyId = null;
    this.formCategoryId = null;
    this.formPackingId = null;
    this.formSalePrice = null;
    this.formMinimumThreshold = null;
    
    this.openForm('add');
  }

  showEditForm(medicine: any) {
    // Set form values
    this.formId = medicine.product_id;
    this.formName = medicine.name || '';
    this.formDescription = medicine.description || '';
    this.formCompanyId = medicine.company_id;
    this.formCategoryId = medicine.category_id;
    this.formPackingId = medicine.packing_id;
    this.formSalePrice = medicine.sale_price;
    this.formMinimumThreshold = medicine.minimum_threshold || 0;
    
    this.openForm('edit');
  }

  showDetails(medicine: any) {
    if (this.isDestroyed) return;
    
    this.showForm = false;
    this.formMode = null;
    this.selectedMedicine = medicine;
    this.medicineBatches = [];
    this.viewMode = 'details';
    this.cdr.detectChanges();
    
    this.loadMedicineBatches(medicine.product_id);
  }

  cancelForm() {
    if (this.isDestroyed) return;
    this.showForm = false;
    this.formMode = null;
    this.cdr.detectChanges();
  }

  goBack() {
    if (this.isDestroyed) return;
    this.showForm = false;
    this.formMode = null;
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.medicineBatches = [];
    this.cdr.detectChanges();
  }

  // ── Validation helpers ────────────────────────────────────────────────────
  private validateForm(): boolean {
    if (!this.formName?.trim()) {
      this.showToast('Medicine name is required', 'error');
      return false;
    }
    if (!this.formCompanyId) {
      this.showToast('Please select a company', 'error');
      return false;
    }
    if (!this.formCategoryId) {
      this.showToast('Please select a category', 'error');
      return false;
    }
    if (!this.formPackingId) {
      this.showToast('Please select packing type', 'error');
      return false;
    }
    if (!this.formSalePrice || this.formSalePrice <= 0) {
      this.showToast('Sale price must be greater than 0', 'error');
      return false;
    }
    if (this.formMinimumThreshold === null || this.formMinimumThreshold < 0) {
      this.showToast('Minimum threshold cannot be negative', 'error');
      return false;
    }
    return true;
  }

  // ── ADD ───────────────────────────────────────────────────────────────────
  async addMedicine() {
    if (!this.validateForm() || this.isBusy || this.isDestroyed) return;

    this.isBusy = true;
    this.cdr.detectChanges();

    // Close form immediately (optimistic UI)
    this.showForm = false;
    this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(
        `INSERT INTO medicines 
         (name, description, company_id, category_id, packing_id, sale_price, minimum_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          this.formName.trim(),
          this.formDescription?.trim() || null,
          this.formCompanyId,
          this.formCategoryId,
          this.formPackingId,
          this.formSalePrice,
          this.formMinimumThreshold || 0
        ],
        'run'
      );

      if (!this.isDestroyed) {
        await this.loadMedicines();
        this.showToast('Medicine added successfully!');
      }
    } catch (error: any) {
      console.error('Add medicine error:', error);
      if (!this.isDestroyed) {
        // Check for UNIQUE constraint (name + company)
        if (error?.message?.includes('UNIQUE')) {
          this.showToast('This medicine already exists for the selected company', 'error');
        } else {
          this.showToast('Failed to add medicine', 'error');
        }
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  async updateMedicine() {
    if (!this.validateForm() || !this.formId || this.isBusy || this.isDestroyed) return;

    const id = this.formId;
    this.isBusy = true;
    this.cdr.detectChanges();

    // Close form immediately
    this.showForm = false;
    this.formMode = null;
    this.cdr.detectChanges();

    try {
      await this.dbRun(
        `UPDATE medicines 
         SET name = ?, description = ?, company_id = ?, category_id = ?, 
             packing_id = ?, sale_price = ?, minimum_threshold = ?
         WHERE product_id = ?`,
        [
          this.formName.trim(),
          this.formDescription?.trim() || null,
          this.formCompanyId,
          this.formCategoryId,
          this.formPackingId,
          this.formSalePrice,
          this.formMinimumThreshold || 0,
          id
        ],
        'run'
      );

      if (!this.isDestroyed) {
        await this.loadMedicines();
        this.showToast('Medicine updated successfully!');
      }
    } catch (error: any) {
      console.error('Update medicine error:', error);
      if (!this.isDestroyed) {
        if (error?.message?.includes('UNIQUE')) {
          this.showToast('This medicine already exists for the selected company', 'error');
        } else {
          this.showToast('Failed to update medicine', 'error');
        }
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  // ── DELETE (FIXED - no more frozen inputs) ───────────────────────────────
  deleteMedicine(medicineId: number) {
    // Run everything in zone
    this.zone.run(() => {
      const confirmed = confirm('Are you sure you want to delete this medicine?\n\nThis will also delete all associated batch records.');
      if (!confirmed || this.isBusy || this.isDestroyed) return;

      this.isBusy = true;
      this.cdr.detectChanges();

      // Optimistic removal
      const backup = [...this.medicines];
      this.medicines = this.medicines.filter(m => m.product_id !== medicineId);
      this.cdr.detectChanges();

      // Perform deletion
      this.dbRun('DELETE FROM medicines WHERE product_id = ?', [medicineId], 'run')
        .then(() => {
          this.zone.run(() => {
            if (!this.isDestroyed) {
              this.showToast('Medicine deleted successfully!');
              this.isBusy = false;
              this.cdr.detectChanges();
            }
          });
        })
        .catch((error: any) => {
          console.error('Delete error:', error);
          
          this.zone.run(() => {
            if (!this.isDestroyed) {
              // Rollback
              this.medicines = backup;
              
              // Show appropriate error message
              if (error?.message?.includes('FOREIGN KEY') || error?.message?.includes('constraint failed')) {
                this.showToast('Cannot delete: This medicine has purchase or sale records', 'error');
              } else {
                this.showToast('Failed to delete medicine', 'error');
              }
              
              // CRITICAL: Always reset isBusy
              this.isBusy = false;
              this.cdr.detectChanges();
              
              // Extra safety: force another change detection
              setTimeout(() => {
                this.zone.run(() => {
                  if (!this.isDestroyed) {
                    this.cdr.detectChanges();
                  }
                });
              }, 50);
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
    if (s === 0) return 'badge-out';
    if (s < t * 0.25) return 'badge-critical';
    if (s < t) return 'badge-low';
    return 'badge-ok';
  }

  getBatchStockClass(remaining: number): string {
    if (remaining === 0) return 'badge-out';
    if (remaining < 10) return 'badge-critical';
    if (remaining < 50) return 'badge-low';
    return 'badge-ok';
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  }
}