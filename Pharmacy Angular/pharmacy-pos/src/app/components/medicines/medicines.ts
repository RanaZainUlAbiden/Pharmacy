import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicines.html',
  styleUrls: ['./medicines.scss']
})
export class MedicinesComponent implements OnInit, OnDestroy {
  // View states
  viewMode: 'list' | 'details' = 'list';
  formMode: 'add' | 'edit' | null = null;
  showForm = false;
  formKey = 0;

  // Data arrays
  medicines: any[] = [];
  companies: any[] = [];
  categories: any[] = [];
  packings: any[] = [];
  selectedMedicine: any = null;
  medicineBatches: any[] = [];
  searchTerm = '';

  // Form fields
  formId: number | null = null;
  formName = '';
  formDescription = '';
  formCompanyId: number | null = null;
  formCategoryId: number | null = null;
  formPackingId: number | null = null;
  formSalePrice: number | null = null;
  formMinimumThreshold: number | null = null;

  // UI states
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  isBusy = false;
  isLoading = false;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // Database helper
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

  // Load all data
  async loadInitialData() {
    if (this.isDestroyed) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const [companiesRes, categoriesRes, packingsRes] = await Promise.all([
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name'),
        this.dbRun('SELECT category_id, category_name FROM categories ORDER BY category_name'),
        this.dbRun('SELECT packing_id, packing_name FROM packing ORDER BY packing_name')
      ]);

      if (!this.isDestroyed) {
        this.companies = companiesRes || [];
        
        // Remove duplicate categories
        const uniqueCategories = new Map();
        (categoriesRes || []).forEach((cat: any) => {
          if (!uniqueCategories.has(cat.category_name)) {
            uniqueCategories.set(cat.category_name, cat);
          }
        });
        this.categories = Array.from(uniqueCategories.values());
        
        // Remove duplicate packings
        const uniquePackings = new Map();
        (packingsRes || []).forEach((p: any) => {
          if (!uniquePackings.has(p.packing_name)) {
            uniquePackings.set(p.packing_name, p);
          }
        });
        this.packings = Array.from(uniquePackings.values());
        
        await this.loadMedicines();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showToast('Failed to load data', 'error');
    } finally {
      if (!this.isDestroyed) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async loadMedicines() {
    if (this.isDestroyed) return;
    
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
      this.medicines = result || [];
    }
  }

  async loadMedicineBatches(medicineId: number) {
    if (this.isDestroyed) return;

    const result = await this.dbRun(`
      SELECT bi.*, pb.BatchName, pb.purchase_date
      FROM batch_items bi
      JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
      WHERE bi.product_id = ?
      ORDER BY bi.expiry_date
    `, [medicineId]);

    if (!this.isDestroyed) {
      this.medicineBatches = result || [];
      this.cdr.detectChanges();
    }
  }

  // Toast
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

  // Filter
  get filteredMedicines(): any[] {
    if (!this.searchTerm.trim()) return this.medicines;
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

  // Form management
  private openForm(mode: 'add' | 'edit') {
    if (this.isDestroyed) return;
    
    this.showForm = false;
    this.cdr.detectChanges();
    
    this.formKey++;
    this.formMode = mode;
    
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
    
    // Make sure we're in list view
    this.viewMode = 'list';
    this.selectedMedicine = null;
    
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
    
    // Make sure we're in list view
    this.viewMode = 'list';
    this.selectedMedicine = null;
    
    this.openForm('edit');
  }

  showDetails(medicine: any) {
    if (this.isDestroyed) return;
    
    // Hide any open form
    this.showForm = false;
    this.formMode = null;
    
    // Set details view
    this.selectedMedicine = medicine;
    this.medicineBatches = [];
    this.viewMode = 'details';
    this.cdr.detectChanges();
    
    this.loadMedicineBatches(medicine.product_id);
  }

  cancelForm() {
    if (this.isDestroyed) return;
    
    // Simply hide the form and go back to list view
    this.showForm = false;
    this.formMode = null;
    this.viewMode = 'list';
    this.cdr.detectChanges();
  }

  goBack() {
    if (this.isDestroyed) return;
    
    // Hide any open form and go back to list view
    this.showForm = false;
    this.formMode = null;
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.medicineBatches = [];
    this.cdr.detectChanges();
  }

  // Validation
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

  // CRUD Operations
  async addMedicine() {
    if (!this.validateForm() || this.isBusy || this.isDestroyed) return;

    this.isBusy = true;
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
        
        // Close form and return to list view
        this.showForm = false;
        this.formMode = null;
        this.viewMode = 'list';
      }
    } catch (error: any) {
      console.error('Add error:', error);
      if (!this.isDestroyed) {
        const msg = error?.message?.includes('UNIQUE') 
          ? 'This medicine already exists for the selected company'
          : 'Failed to add medicine';
        this.showToast(msg, 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  async updateMedicine() {
    if (!this.validateForm() || !this.formId || this.isBusy || this.isDestroyed) return;

    const id = this.formId;
    this.isBusy = true;
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
        
        // Close form and return to list view
        this.showForm = false;
        this.formMode = null;
        this.viewMode = 'list';
      }
    } catch (error: any) {
      console.error('Update error:', error);
      if (!this.isDestroyed) {
        const msg = error?.message?.includes('UNIQUE')
          ? 'This medicine already exists for the selected company'
          : 'Failed to update medicine';
        this.showToast(msg, 'error');
      }
    } finally {
      if (!this.isDestroyed) {
        this.isBusy = false;
        this.cdr.detectChanges();
      }
    }
  }

  // FIXED DELETE METHOD - No more frozen inputs!
  deleteMedicine(medicineId: number) {
    // Run in zone to ensure change detection works
    this.zone.run(() => {
      // Simple confirmation
      const confirmed = confirm('Are you sure you want to delete this medicine?');
      if (!confirmed || this.isBusy || this.isDestroyed) return;

      // Set busy state
      this.isBusy = true;
      this.cdr.detectChanges();

      // Store backup for potential rollback
      const backup = [...this.medicines];
      
      // Optimistically remove from UI
      this.medicines = this.medicines.filter(m => m.product_id !== medicineId);
      this.cdr.detectChanges();

      // Perform actual delete
      this.dbRun('DELETE FROM medicines WHERE product_id = ?', [medicineId], 'run')
        .then(() => {
          this.zone.run(() => {
            if (!this.isDestroyed) {
              this.showToast('Medicine deleted successfully!');
              
              // IMPORTANT: Reset all view states
              this.showForm = false;
              this.formMode = null;
              this.viewMode = 'list';
              this.selectedMedicine = null;
              this.medicineBatches = [];
              
              // Reset busy state
              this.isBusy = false;
              
              // Force multiple change detections to ensure UI updates
              this.cdr.detectChanges();
              
              // Extra safety - detect changes again after a tiny delay
              setTimeout(() => {
                this.zone.run(() => {
                  if (!this.isDestroyed) {
                    this.cdr.detectChanges();
                  }
                });
              }, 10);
            }
          });
        })
        .catch((error: any) => {
          console.error('Delete error:', error);
          
          this.zone.run(() => {
            if (!this.isDestroyed) {
              // Rollback to backup
              this.medicines = backup;
              
              // Show appropriate error
              const msg = error?.message?.includes('FOREIGN KEY')
                ? 'Cannot delete: This medicine has purchase or sale records'
                : 'Failed to delete medicine';
              this.showToast(msg, 'error');
              
              // IMPORTANT: Reset all view states
              this.showForm = false;
              this.formMode = null;
              this.viewMode = 'list';
              this.selectedMedicine = null;
              this.medicineBatches = [];
              
              // Reset busy state
              this.isBusy = false;
              
              // Force multiple change detections
              this.cdr.detectChanges();
              
              // Extra safety
              setTimeout(() => {
                this.zone.run(() => {
                  if (!this.isDestroyed) {
                    this.cdr.detectChanges();
                  }
                });
              }, 10);
            }
          });
        });
    });
  }

  // Helpers
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

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }
}