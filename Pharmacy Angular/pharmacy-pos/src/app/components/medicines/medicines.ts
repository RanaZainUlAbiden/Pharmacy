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
  packings: any[] = [];
  selectedMedicine: any = null;
  medicineBatches: any[] = [];
  searchTerm = '';

  // Form fields
  formId: number | null = null;
  formName = '';
  formDescription = '';
  formPackingId: number | null = null;
  formSalePrice: number | null = null;
  formMinimumThreshold: number | null = null;

  // UI states
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  isBusy = false;
  isLoading = false;
  private isDestroyed = false;

  // Custom confirm dialog
  showConfirmDialog = false;
  confirmMessage = '';
  private confirmCallback: (() => void) | null = null;

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

  private openConfirm(message: string, onConfirm: () => void) {
    this.zone.run(() => {
      this.confirmMessage = message;
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
      this.confirmCallback = null;
      this.cdr.detectChanges();
    });
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

  async loadInitialData() {
    if (this.isDestroyed) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const [packingsRes] = await Promise.all([
        this.dbRun('SELECT packing_id, packing_name FROM packing ORDER BY packing_name')
      ]);

      if (!this.isDestroyed) {
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
        m.product_id, m.name, m.description, m.sale_price, m.minimum_threshold,
        p.packing_id, p.packing_name,
        COALESCE(SUM(bi.quantity_remaining), 0) as current_stock
      FROM medicines m
      LEFT JOIN packing p ON m.packing_id = p.packing_id
      LEFT JOIN batch_items bi ON m.product_id = bi.product_id
      GROUP BY m.product_id
      ORDER BY m.name
    `);

    if (!this.isDestroyed) {
      this.medicines = result || [];
      this.cdr.detectChanges();
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

  get filteredMedicines(): any[] {
    if (!this.searchTerm.trim()) return this.medicines;
    const term = this.searchTerm.toLowerCase();
    return this.medicines.filter(m =>
      m.name.toLowerCase().includes(term)
    );
  }

  trackById(_: number, item: any) {
    return item.product_id;
  }

  showAddForm() {
    this.formId = null;
    this.formName = '';
    this.formDescription = '';
    this.formPackingId = null;
    this.formSalePrice = null;
    this.formMinimumThreshold = null;
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.formMode = 'add';
    this.showForm = true;
    this.formKey++;
    this.cdr.detectChanges();
  }

  showEditForm(medicine: any) {
    this.formId = medicine.product_id;
    this.formName = medicine.name || '';
    this.formDescription = medicine.description || '';
    this.formPackingId = medicine.packing_id;
    this.formSalePrice = medicine.sale_price;
    this.formMinimumThreshold = medicine.minimum_threshold || 0;
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.formMode = 'edit';
    this.showForm = true;
    this.formKey++;
    this.cdr.detectChanges();
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
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.medicineBatches = [];
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

  private validateForm(): boolean {
    if (!this.formName?.trim()) { 
      this.showToast('Medicine name is required', 'error'); 
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

  async addMedicine() {
    if (!this.validateForm() || this.isBusy || this.isDestroyed) return;
    this.isBusy = true;
    this.cdr.detectChanges();

    try {
      await this.dbRun(
        `INSERT INTO medicines (name, description, packing_id, sale_price, minimum_threshold)
         VALUES (?, ?, ?, ?, ?)`,
        [this.formName.trim(), this.formDescription?.trim() || null,
         this.formPackingId, this.formSalePrice, this.formMinimumThreshold || 0],
        'run'
      );
      if (!this.isDestroyed) {
        await this.loadMedicines();
        this.showToast('Medicine added successfully!');
        this.showForm = false; 
        this.formMode = null; 
        this.viewMode = 'list';
        this.selectedMedicine = null; 
        this.medicineBatches = [];
      }
    } catch (error: any) {
      if (!this.isDestroyed) {
        this.showToast(error?.message?.includes('UNIQUE') ? 'This medicine already exists' : 'Failed to add medicine', 'error');
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
        `UPDATE medicines SET name=?, description=?, packing_id=?, sale_price=?, minimum_threshold=? WHERE product_id=?`,
        [this.formName.trim(), this.formDescription?.trim() || null,
         this.formPackingId, this.formSalePrice, this.formMinimumThreshold || 0, id],
        'run'
      );
      if (!this.isDestroyed) {
        await this.loadMedicines();
        this.showToast('Medicine updated successfully!');
        this.showForm = false; 
        this.formMode = null; 
        this.viewMode = 'list';
        this.selectedMedicine = null; 
        this.medicineBatches = [];
      }
    } catch (error: any) {
      if (!this.isDestroyed) {
        this.showToast(error?.message?.includes('UNIQUE') ? 'This medicine already exists' : 'Failed to update medicine', 'error');
      }
    } finally {
      if (!this.isDestroyed) { 
        this.isBusy = false; 
        this.cdr.detectChanges(); 
      }
    }
  }

  deleteMedicine(medicineId: number) {
    if (this.isBusy || this.isDestroyed) return;

    this.openConfirm('Are you sure you want to delete this medicine?', () => {
      this.zone.run(async () => {
        this.isBusy = true;
        this.cdr.detectChanges();

        try {
          await this.dbRun('DELETE FROM medicines WHERE product_id = ?', [medicineId], 'run');

          if (!this.isDestroyed) {
            await this.loadMedicines();
            this.showToast('Medicine deleted successfully!');

            if (this.selectedMedicine?.product_id === medicineId) {
              this.showForm = false; 
              this.formMode = null; 
              this.viewMode = 'list';
              this.selectedMedicine = null; 
              this.medicineBatches = [];
            }
          }
        } catch (error: any) {
          if (!this.isDestroyed) {
            this.showToast('Failed to delete medicine', 'error');
          }
        } finally {
          if (!this.isDestroyed) {
            this.isBusy = false;
            this.cdr.detectChanges();
          }
        }
      });
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  getStockClass(stock: number, threshold: number): string {
    const s = stock ?? 0, t = threshold ?? 0;
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