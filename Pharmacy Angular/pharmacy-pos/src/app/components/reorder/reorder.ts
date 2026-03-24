import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-reorder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reorder.html',
  styleUrls: ['./reorder.scss']
})
export class ReorderComponent implements OnInit, OnDestroy {
  // Data
  lowStockItems: any[] = [];
  allMedicines: any[] = [];
  reorderList: any[] = [];
  
  // For inline editing
  editingItemId: number | null = null;
  editQuantity: number = 0;
  
  // For adding new medicine
  selectedMedicineId: number | null = null;
  
  // UI states
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
  ) {}

  ngOnInit() {
    this.loadData();
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

  async loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // Load all medicines for dropdown
      const medicinesRes = await this.dbRun(`
        SELECT 
          m.product_id, 
          m.name,
          COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
          m.minimum_threshold
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        ORDER BY m.name
      `);
      this.allMedicines = medicinesRes || [];

      // Load low stock items
      await this.loadLowStock();
      
      // Initialize reorder list from low stock
      this.initReorderList();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Failed to load data', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadLowStock() {
    try {
      const result = await this.dbRun(`
        SELECT 
          m.product_id, 
          m.name,
          COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
          m.minimum_threshold,
          (m.minimum_threshold - COALESCE(SUM(bi.quantity_remaining), 0)) as needed_quantity
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        HAVING current_stock <= m.minimum_threshold
        ORDER BY needed_quantity DESC
      `);
      this.lowStockItems = result || [];
    } catch (error) {
      console.error('Error loading low stock:', error);
    }
  }

  initReorderList() {
    this.reorderList = this.lowStockItems.map(item => ({
      product_id: item.product_id,
      name: item.name,
      quantity: Math.max(item.needed_quantity, 5) // at least 5 units
    }));
    this.cdr.detectChanges();
  }

  // Add medicine from dropdown
  addMedicineToReorder() {
    if (!this.selectedMedicineId) {
      this.showToast('Please select a medicine', 'error');
      return;
    }

    // Check if already in list
    if (this.reorderList.find(i => i.product_id === this.selectedMedicineId)) {
      this.showToast('Medicine already in reorder list', 'error');
      return;
    }

    const medicine = this.allMedicines.find(m => m.product_id === this.selectedMedicineId);
    if (medicine) {
      const needed = Math.max((medicine.minimum_threshold || 10) - (medicine.current_stock || 0), 5);
      this.reorderList.push({
        product_id: medicine.product_id,
        name: medicine.name,
        quantity: needed
      });
      this.selectedMedicineId = null;
      this.showToast('Medicine added to reorder list');
    }
  }

  // Inline edit functions
  startEdit(item: any) {
    this.editingItemId = item.product_id;
    this.editQuantity = item.quantity;
  }

  cancelEdit() {
    this.editingItemId = null;
    this.editQuantity = 0;
  }

  saveEdit(item: any) {
    if (this.editQuantity < 1) {
      this.showToast('Quantity must be at least 1', 'error');
      return;
    }
    item.quantity = this.editQuantity;
    this.cancelEdit();
    this.showToast('Quantity updated');
  }

  // Delete item
  deleteItem(item: any) {
    const index = this.reorderList.findIndex(i => i.product_id === item.product_id);
    if (index !== -1) {
      this.reorderList.splice(index, 1);
      this.showToast('Item removed from reorder list');
    }
  }

  // Save to local device
  saveToLocal() {
    try {
      const data = {
        date: new Date().toISOString(),
        items: this.reorderList.map(item => ({
          name: item.name,
          quantity: item.quantity
        }))
      };

      // Save to localStorage
      localStorage.setItem('reorder_list_' + new Date().toISOString().split('T')[0], JSON.stringify(data));
      
      // Also save as downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reorder_list_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('Reorder list saved!');
    } catch (error) {
      this.showToast('Failed to save', 'error');
    }
  }

  getFilteredMedicines() {
    // Filter out medicines already in reorder list
    const existingIds = this.reorderList.map(i => i.product_id);
    return this.allMedicines.filter(m => !existingIds.includes(m.product_id));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }
}