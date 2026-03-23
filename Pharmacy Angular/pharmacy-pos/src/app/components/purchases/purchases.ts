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

  // ── View states ──────────────────────────────────────────────────────────────
  viewMode: 'list' | 'add' | 'details' = 'list';
  showForm = false;
  formKey = 0;

  // ── Data ─────────────────────────────────────────────────────────────────────
  purchases: any[] = [];
  companies: any[] = [];
  medicines: any[] = [];
  selectedPurchase: any = null;
  purchaseItems: any[] = [];
  searchTerm = '';

  // ── Form fields ──────────────────────────────────────────────────────────────
  formCompanyId: number | null = null;
  formBatchName = '';
  formPurchaseDate = new Date().toISOString().split('T')[0];
  formTotalPrice = 0;
  formPaid = 0;
  formStatus = 'pending';

  // ── Item-row fields ──────────────────────────────────────────────────────────
  selectedMedicineId: number | null = null;
  selectedMedicine: any = null;
  itemQuantity: number = 1;
  itemPurchasePrice: number = 0;
  itemExpiryDate = '';
  tempItems: any[] = [];

  // ── UI states ────────────────────────────────────────────────────────────────
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  isBusy = false;
  isLoading = false;
  private isDestroyed = false;

  // ── Confirm dialog ───────────────────────────────────────────────────────────
  showConfirmDialog = false;
  confirmMessage = '';
  private confirmCallback: (() => void) | null = null;

  // ── Polling ──────────────────────────────────────────────────────────────────
  private pollTimer: any = null;
  private readonly POLL_INTERVAL = 5000;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.stopPolling();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (!this.isDestroyed && this.viewMode === 'list' && !this.isBusy) {
        await this.loadPurchases(false);
      }
    }, this.POLL_INTERVAL);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Confirm dialog ───────────────────────────────────────────────────────────

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

  // ── DB helpers ───────────────────────────────────────────────────────────────

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

  /**
   * Safely extract the inserted row ID from a 'run' result.
   * Handles both better-sqlite3 (lastInsertRowid) and node-sqlite3 (lastID),
   * and also the case where Electron's IPC bridge wraps it differently.
   */
  private getLastId(runResult: any): number | null {
    if (!runResult) return null;

    // better-sqlite3 via Electron IPC
    if (typeof runResult.lastInsertRowid === 'number' && runResult.lastInsertRowid > 0) {
      return runResult.lastInsertRowid;
    }
    // node-sqlite3 / some wrappers
    if (typeof runResult.lastID === 'number' && runResult.lastID > 0) {
      return runResult.lastID;
    }
    // Some Electron bridges return it nested
    if (runResult.result) {
      return this.getLastId(runResult.result);
    }
    // Fallback: check any key that looks like an ID
    for (const key of Object.keys(runResult)) {
      if (/last.*id/i.test(key) && typeof runResult[key] === 'number') {
        return runResult[key];
      }
    }
    return null;
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

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
    }, 3500);
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

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
        this.medicines  = medicinesRes  || [];
        await this.loadPurchases(false);
        this.startPolling();
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showToast('Failed to load data', 'error');
    } finally {
      if (!this.isDestroyed) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async loadPurchases(showLoader = false) {
    if (this.isDestroyed) return;
    if (showLoader) {
      this.isLoading = true;
      this.cdr.detectChanges();
    }
    try {
      const result = await this.dbRun(`
        SELECT
          pb.*,
          c.company_name,
          (SELECT COUNT(*) FROM batch_items
           WHERE purchase_batch_id = pb.purchase_batch_id) AS item_count,
          (SELECT SUM(quantity_received) FROM batch_items
           WHERE purchase_batch_id = pb.purchase_batch_id) AS total_quantity
        FROM purchase_batches pb
        LEFT JOIN company c ON pb.company_id = c.company_id
        ORDER BY pb.purchase_date DESC, pb.purchase_batch_id DESC
      `);
      if (!this.isDestroyed) {
        this.purchases = result || [];
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      if (!this.isDestroyed && showLoader) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async loadPurchaseDetails(batchId: number) {
    if (this.isDestroyed) return;
    try {
      const [purchaseRes, itemsRes] = await Promise.all([
        this.dbRun(`
          SELECT pb.*, c.company_name
          FROM purchase_batches pb
          LEFT JOIN company c ON pb.company_id = c.company_id
          WHERE pb.purchase_batch_id = ?
        `, [batchId], 'get'),
        this.dbRun(`
          SELECT bi.*, m.name AS medicine_name, m.sale_price
          FROM batch_items bi
          JOIN medicines m ON bi.product_id = m.product_id
          WHERE bi.purchase_batch_id = ?
          ORDER BY bi.expiry_date
        `, [batchId])
      ]);
      if (!this.isDestroyed) {
        this.selectedPurchase = purchaseRes;
        this.purchaseItems    = itemsRes || [];
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Failed to load purchase details:', error);
      this.showToast('Failed to load purchase details', 'error');
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  async showDetails(purchase: any) {
    if (this.isDestroyed || this.isBusy) return;
    this.stopPolling();
    this.showForm         = false;
    this.selectedPurchase = null;
    this.purchaseItems    = [];
    this.viewMode         = 'details';
    this.cdr.detectChanges();
    await this.loadPurchaseDetails(purchase.purchase_batch_id);
  }

  showAddForm() {
    this.stopPolling();
    this.resetForm();
    this.viewMode = 'add';
    this.showForm = true;
    this.formKey++;
    this.cdr.detectChanges();
  }

  cancelForm() {
    this.showForm         = false;
    this.viewMode         = 'list';
    this.selectedPurchase = null;
    this.purchaseItems    = [];
    this.resetForm();
    this.cdr.detectChanges();
    this.startPolling();
  }

  goBack() {
    this.showForm         = false;
    this.viewMode         = 'list';
    this.selectedPurchase = null;
    this.purchaseItems    = [];
    this.resetForm();
    this.cdr.detectChanges();
    this.startPolling();
  }

  private resetForm() {
    this.formCompanyId    = null;
    this.formBatchName    = '';
    this.formPurchaseDate = new Date().toISOString().split('T')[0];
    this.formTotalPrice   = 0;
    this.formPaid         = 0;
    this.formStatus       = 'pending';
    this.tempItems        = [];
    this.resetItemForm();
  }

  // ── Item row ─────────────────────────────────────────────────────────────────

  onMedicineSelect() {
    if (!this.selectedMedicineId) {
      this.selectedMedicine  = null;
      this.itemPurchasePrice = 0;
      return;
    }
    const id = Number(this.selectedMedicineId);
    this.selectedMedicine  = this.medicines.find(m => m.product_id === id) || null;
    this.itemPurchasePrice = this.selectedMedicine?.sale_price
      ? Number(this.selectedMedicine.sale_price)
      : 0;
    this.cdr.detectChanges();
  }

  onPriceInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.itemPurchasePrice = v === '' ? 0 : parseFloat(v);
  }

  onQuantityInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.itemQuantity = v === '' ? 1 : parseInt(v, 10);
  }

  addItem() {
    if (!this.selectedMedicineId) {
      this.showToast('Please select a medicine', 'error'); return;
    }
    const qty   = Number(this.itemQuantity);
    const price = Number(this.itemPurchasePrice);
    const id    = Number(this.selectedMedicineId);

    if (!qty || qty <= 0) {
      this.showToast('Quantity must be greater than 0', 'error'); return;
    }
    if (isNaN(price) || price <= 0) {
      this.showToast('Purchase price must be greater than 0', 'error'); return;
    }
    if (!this.itemExpiryDate) {
      this.showToast('Please select an expiry date', 'error'); return;
    }
    const medicine = this.medicines.find(m => m.product_id === id);
    if (!medicine) {
      this.showToast('Selected medicine not found', 'error'); return;
    }
    if (this.tempItems.some(i => Number(i.product_id) === id)) {
      this.showToast('Medicine already added — remove it first to change quantity', 'error'); return;
    }

    this.tempItems.push({
      product_id:     id,
      medicine_name:  medicine.name,
      quantity:       qty,
      purchase_price: price,
      total:          qty * price,
      expiry_date:    this.itemExpiryDate
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

  private updateTotalPrice() {
    this.formTotalPrice = this.tempItems.reduce((s, i) => s + i.total, 0);
  }

  private resetItemForm() {
    this.selectedMedicineId = null;
    this.selectedMedicine   = null;
    this.itemQuantity       = 1;
    this.itemPurchasePrice  = 0;
    this.itemExpiryDate     = '';
  }

  // ── Create purchase ──────────────────────────────────────────────────────────

  async createPurchase() {
    // ── Validation ────────────────────────────────────────────────────────────
    if (!this.formCompanyId) {
      this.showToast('Please select a supplier', 'error'); return;
    }
    if (!this.formBatchName.trim()) {
      this.showToast('Please enter a batch name', 'error'); return;
    }
    if (this.tempItems.length === 0) {
      this.showToast('Please add at least one item', 'error'); return;
    }
    const paid = Number(this.formPaid);
    if (isNaN(paid) || paid < 0) {
      this.showToast('Paid amount cannot be negative', 'error'); return;
    }

    this.isBusy = true;
    this.cdr.detectChanges();

    let batchId: number | null = null;
    let success = false;

    try {
      // 1. Duplicate check
      const existing = await this.dbRun(
        'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ?',
        [this.formBatchName.trim()],
        'get'
      );
      if (existing) {
        this.showToast('A batch with this name already exists', 'error');
        return;
      }

      // 2. Insert batch header
      const batchResult = await this.dbRun(
        `INSERT INTO purchase_batches
           (company_id, purchase_date, total_price, paid, BatchName, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Number(this.formCompanyId),
          this.formPurchaseDate,
          this.formTotalPrice,
          paid,
          this.formBatchName.trim(),
          this.formStatus
        ],
        'run'
      );

      // ── THE FIX: handle both better-sqlite3 and node-sqlite3 return shapes ──
      console.log('batchResult from DB:', JSON.stringify(batchResult));
      batchId = this.getLastId(batchResult);

      // If we still couldn't get an ID, query for it by BatchName as fallback
      if (!batchId) {
        const inserted = await this.dbRun(
          'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ? ORDER BY purchase_batch_id DESC LIMIT 1',
          [this.formBatchName.trim()],
          'get'
        );
        batchId = inserted?.purchase_batch_id ?? null;
      }

      if (!batchId) {
        throw new Error('Could not determine inserted batch ID. Please check database configuration.');
      }

      // 3. Insert line items
      for (const item of this.tempItems) {
        await this.dbRun(
          `INSERT INTO batch_items
             (purchase_batch_id, product_id, purchase_price,
              quantity_received, quantity_remaining, expiry_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            batchId,
            item.product_id,
            item.purchase_price,
            item.quantity,
            item.quantity,
            item.expiry_date
          ],
          'run'
        );
      }

      // 4. Stock log — non-critical, won't fail the purchase if schema differs
      try {
        for (const item of this.tempItems) {
          await this.dbRun(
            `INSERT INTO stock_log
               (product_id, change_type, quantity_change, remarks, log_date)
             VALUES (?, 'PURCHASE', ?, ?, datetime('now'))`,
            [
              item.product_id,
              item.quantity,
              `Purchase batch: ${this.formBatchName.trim()}`
            ],
            'run'
          );
        }
      } catch (logErr) {
        console.warn('stock_log insert skipped (schema may differ):', logErr);
      }

      success = true;

    } catch (error: any) {
      console.error('createPurchase error:', error);

      // Manual rollback
      if (batchId) {
        try {
          await this.dbRun('DELETE FROM batch_items WHERE purchase_batch_id = ?', [batchId], 'run');
          await this.dbRun('DELETE FROM purchase_batches WHERE purchase_batch_id = ?', [batchId], 'run');
          console.log('Rollback succeeded for batch', batchId);
        } catch (rbErr) {
          console.error('Rollback failed:', rbErr);
        }
      }

      this.showToast(error?.message || 'Failed to create purchase', 'error');

    } finally {
      // Always reset busy — form stays open on error, closes only on success below
      this.isBusy = false;
      this.cdr.detectChanges();
    }

    // ── Success path: runs after finally, so isBusy is already false ──────────
    if (success) {
      await this.loadPurchases(false);           // refresh list silently
      this.showToast('Purchase created successfully! ✓', 'success');
      await this.delay(600);                     // let toast show before switching view
      this.cancelForm();                         // go to list, restart polling
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getPaymentStatus(total: number, paid: number): string {
    if (!total || total === 0) return 'Unpaid';
    if (paid >= total)         return 'Paid';
    if (paid > 0)              return 'Partial';
    return 'Unpaid';
  }

  getPaymentStatusClass(total: number, paid: number): string {
    if (!total || total === 0) return 'status-unpaid';
    if (paid >= total)         return 'status-paid';
    if (paid > 0)              return 'status-partial';
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
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return date; }
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  trackById(_: number, item: any) {
    return item.purchase_batch_id ?? item.product_id;
  }

  get filteredPurchases(): any[] {
    if (!this.searchTerm.trim()) return this.purchases;
    const term = this.searchTerm.toLowerCase();
    return this.purchases.filter(p =>
      p.BatchName?.toLowerCase().includes(term) ||
      p.company_name?.toLowerCase().includes(term)
    );
  }

  get balanceDue(): number {
    return Math.max(0, this.formTotalPrice - (Number(this.formPaid) || 0));
  }
}