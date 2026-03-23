import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchases.html',
  styleUrls: ['./purchases.scss']
})
export class PurchasesComponent implements OnInit, OnDestroy {
  // View states
  viewMode: 'list' | 'add' | 'details' = 'list';
  showForm = false;
  formKey = 0;

  // Data arrays
  purchases: any[] = [];
  companies: any[] = [];
  medicines: any[] = [];
  selectedPurchase: any = null;
  purchaseItems: any[] = [];
  searchTerm = '';

  // Form fields for new purchase
  formCompanyId: number | null = null;
  formBatchName = '';
  formPurchaseDate = new Date().toISOString().split('T')[0];
  formItems: any[] = [];
  formTotalPrice = 0;
  formPaid = 0;
  formStatus = 'pending';

  // For adding items to purchase
  selectedMedicineId: number | null = null;
  selectedMedicine: any = null;
  itemQuantity = 1;
  itemPurchasePrice = 0;
  itemExpiryDate = '';
  tempItems: any[] = [];

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
      const [companiesRes, medicinesRes] = await Promise.all([
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name'),
        this.dbRun('SELECT product_id, name, sale_price FROM medicines ORDER BY name')
      ]);

      if (!this.isDestroyed) {
        this.companies = companiesRes || [];
        this.medicines = medicinesRes || [];
        await this.loadPurchases();
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

  async loadPurchases() {
    if (this.isDestroyed) return;

    const result = await this.dbRun(`
      SELECT pb.*, c.company_name,
        (SELECT COUNT(*) FROM batch_items WHERE purchase_batch_id = pb.purchase_batch_id) as item_count,
        (SELECT SUM(quantity_received) FROM batch_items WHERE purchase_batch_id = pb.purchase_batch_id) as total_quantity
      FROM purchase_batches pb
      LEFT JOIN company c ON pb.company_id = c.company_id
      ORDER BY pb.purchase_date DESC
    `);

    if (!this.isDestroyed) {
      this.purchases = result || [];
      this.cdr.detectChanges();
    }
  }

  async loadPurchaseDetails(batchId: number) {
    if (this.isDestroyed) return;

    const [purchaseRes, itemsRes] = await Promise.all([
      this.dbRun(`
        SELECT pb.*, c.company_name
        FROM purchase_batches pb
        LEFT JOIN company c ON pb.company_id = c.company_id
        WHERE pb.purchase_batch_id = ?
      `, [batchId], 'get'),
      this.dbRun(`
        SELECT bi.*, m.name as medicine_name, m.sale_price
        FROM batch_items bi
        JOIN medicines m ON bi.product_id = m.product_id
        WHERE bi.purchase_batch_id = ?
        ORDER BY bi.expiry_date
      `, [batchId])
    ]);

    if (!this.isDestroyed) {
      this.selectedPurchase = purchaseRes;
      this.purchaseItems = itemsRes || [];
      this.cdr.detectChanges();
    }
  }

  // Show purchase details
  async showDetails(purchase: any) {
    if (this.isDestroyed) return;
    this.showForm = false;
    this.selectedPurchase = null;
    this.purchaseItems = [];
    this.viewMode = 'details';
    this.cdr.detectChanges();
    await this.loadPurchaseDetails(purchase.purchase_batch_id);
  }

  // Show add form
  showAddForm() {
    this.formCompanyId = null;
    this.formBatchName = '';
    this.formPurchaseDate = new Date().toISOString().split('T')[0];
    this.formTotalPrice = 0;
    this.formPaid = 0;
    this.formStatus = 'pending';
    this.tempItems = [];
    this.updateTotalPrice();
    this.viewMode = 'add';
    this.showForm = true;
    this.formKey++;
    this.cdr.detectChanges();
  }

  // Cancel form
  cancelForm() {
    this.showForm = false;
    this.viewMode = 'list';
    this.selectedPurchase = null;
    this.purchaseItems = [];
    this.tempItems = [];
    this.cdr.detectChanges();
  }

  goBack() {
    this.showForm = false;
    this.viewMode = 'list';
    this.selectedPurchase = null;
    this.purchaseItems = [];
    this.tempItems = [];
    this.cdr.detectChanges();
  }

  // Item management
  onMedicineSelect() {
  if (!this.selectedMedicineId) {
    this.selectedMedicine = null;
    this.itemPurchasePrice = 0;
    return;
  }
  this.selectedMedicine = this.medicines.find(m => m.product_id === this.selectedMedicineId);
  if (this.selectedMedicine) {
    // Set default purchase price to sale price or 0
    this.itemPurchasePrice = this.selectedMedicine.sale_price || 0;
  }
}

  addItem() {
  if (!this.selectedMedicineId) {
    this.showToast('Please select a medicine', 'error');
    return;
  }
  if (!this.itemQuantity || this.itemQuantity <= 0) {
    this.showToast('Quantity must be greater than 0', 'error');
    return;
  }
  
  // Fix: Ensure purchase price is a number and greater than 0
  const price = Number(this.itemPurchasePrice);
  if (isNaN(price) || price <= 0) {
    this.showToast('Purchase price must be greater than 0', 'error');
    return;
  }
  
  if (!this.itemExpiryDate) {
    this.showToast('Please select expiry date', 'error');
    return;
  }

  const medicine = this.medicines.find(m => m.product_id === this.selectedMedicineId);
  if (!medicine) return;

  // Check if item already exists in temp list
  const existingIndex = this.tempItems.findIndex(i => i.product_id === this.selectedMedicineId);
  if (existingIndex !== -1) {
    this.showToast('This medicine is already added. Remove existing and re-add if quantity changed', 'error');
    return;
  }

  this.tempItems.push({
    product_id: this.selectedMedicineId,
    medicine_name: medicine.name,
    quantity: Number(this.itemQuantity),
    purchase_price: price,
    total: Number(this.itemQuantity) * price,
    expiry_date: this.itemExpiryDate
  });

  this.updateTotalPrice();
  this.resetItemForm();
  this.cdr.detectChanges();
}

  removeItem(index: number) {
    this.tempItems.splice(index, 1);
    this.updateTotalPrice();
    this.cdr.detectChanges();
  }

  updateTotalPrice() {
    this.formTotalPrice = this.tempItems.reduce((sum, item) => sum + item.total, 0);
  }

  resetItemForm() {
    this.selectedMedicineId = null;
    this.selectedMedicine = null;
    this.itemQuantity = 1;
    this.itemPurchasePrice = 0;
    this.itemExpiryDate = '';
  }

  // Create purchase
  async createPurchase() {
    if (!this.formCompanyId) {
      this.showToast('Please select a supplier', 'error');
      return;
    }
    if (!this.formBatchName.trim()) {
      this.showToast('Please enter batch name', 'error');
      return;
    }
    if (this.tempItems.length === 0) {
      this.showToast('Please add at least one item', 'error');
      return;
    }
    if (this.formPaid < 0) {
      this.showToast('Paid amount cannot be negative', 'error');
      return;
    }

    this.isBusy = true;
    this.cdr.detectChanges();

    try {
      // Check if batch name already exists
      const existing = await this.dbRun(
        'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ?',
        [this.formBatchName.trim()],
        'get'
      );

      if (existing) {
        this.showToast('Batch name already exists', 'error');
        this.isBusy = false;
        return;
      }

      // Insert purchase batch
      const insertResult = await this.dbRun(
        `INSERT INTO purchase_batches 
         (company_id, purchase_date, total_price, paid, BatchName, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [this.formCompanyId, this.formPurchaseDate, this.formTotalPrice, 
         this.formPaid, this.formBatchName.trim(), this.formStatus],
        'run'
      );

      const batchId = (insertResult as any).lastID;

      // Insert batch items
      for (const item of this.tempItems) {
        await this.dbRun(
          `INSERT INTO batch_items 
           (purchase_batch_id, product_id, purchase_price, quantity_received, 
            quantity_remaining, expiry_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [batchId, item.product_id, item.purchase_price, item.quantity,
           item.quantity, item.expiry_date]
        );

        // Add to stock log
        await this.dbRun(
          `INSERT INTO stock_log 
           (batch_id, change_type, quantity_change, remarks, log_date)
           VALUES (?, 'PURCHASE', ?, ?, datetime('now'))`,
          [batchId, item.quantity, `Purchase batch: ${this.formBatchName}`],
          'run'
        );
      }

      await this.loadPurchases();
      this.showToast('Purchase added successfully!');
      this.cancelForm();

    } catch (error: any) {
      console.error('Error creating purchase:', error);
      this.showToast(error?.message || 'Failed to create purchase', 'error');
    } finally {
      this.isBusy = false;
      this.cdr.detectChanges();
    }
  }

  // Payment helper
  getPaymentStatus(total: number, paid: number): string {
    if (paid >= total) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Unpaid';
  }

  getPaymentStatusClass(total: number, paid: number): string {
    if (paid >= total) return 'status-paid';
    if (paid > 0) return 'status-partial';
    return 'status-unpaid';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  trackById(_: number, item: any) {
    return item.purchase_batch_id || item.product_id;
  }

  get filteredPurchases(): any[] {
    if (!this.searchTerm.trim()) return this.purchases;
    const term = this.searchTerm.toLowerCase();
    return this.purchases.filter(p =>
      p.BatchName?.toLowerCase().includes(term) ||
      (p.company_name && p.company_name.toLowerCase().includes(term))
    );
  }
}