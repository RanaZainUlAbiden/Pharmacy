import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { PurchaseStateService } from '../../services/purchaseState.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchases.html',
  styleUrls: ['./purchases.scss']
})
export class PurchasesComponent implements OnInit, OnDestroy {

  // ── View states ──────────────────────────────────────────────────────────────
  viewMode: 'list' | 'add' | 'edit' | 'details' = 'list';
  showForm = false;
  formKey  = 0;

  // ── Data ─────────────────────────────────────────────────────────────────────
  purchases:       any[] = [];
  companies:       any[] = [];
  medicines:       any[] = [];
  selectedPurchase: any  = null;
  purchaseItems:   any[] = [];
  searchTerm             = '';

  // ── Form fields (shared by add & edit) ───────────────────────────────────────
  editingBatchId:   number | null = null;
  formCompanyId:    number | null = null;
  formBatchName                   = '';
  formPurchaseDate                = new Date().toISOString().split('T')[0];
  formTotalPrice                  = 0;
  formPaid                        = 0;
  formStatus                      = 'pending';

  // ── Item-row fields ──────────────────────────────────────────────────────────
  selectedMedicineId: number | null = null;
  selectedMedicine:   any           = null;
  itemQuantity:       number        = 1;
  itemPurchasePrice:  number        = 0;
  itemExpiryDate                    = '';
  tempItems:          any[]         = [];

  // ── Medicine search ──────────────────────────────────────────────────────────
  medicineSearchTerm       = '';
  showMedicineSuggestions  = false;

  // ── UI states ────────────────────────────────────────────────────────────────
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any  = null;
  isBusy                   = false;
  isLoading                = false;
  private isDestroyed      = false;

  // ── Confirm dialog ───────────────────────────────────────────────────────────
  showConfirmDialog        = false;
  confirmMessage           = '';
  private confirmCallback: (() => void) | null = null;

  // ── Polling ──────────────────────────────────────────────────────────────────
  private pollTimer: any           = null;
  private readonly POLL_INTERVAL   = 5000;

  constructor(
    private db:   DatabaseService,
    private zone: NgZone,
    private cdr:  ChangeDetectorRef,
    private stateService: PurchaseStateService
  ) {}

  // ── Close suggestions on outside click ───────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.medicine-search-wrapper')) {
      this.closeMedicineSuggestions();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadInitialData();
    this.restoreFormState();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.saveFormState();
    this.isDestroyed = true;
    this.stopPolling();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (!this.isDestroyed && this.viewMode === 'list' && !this.isBusy)
        await this.loadPurchases(false);
    }, this.POLL_INTERVAL);
  }

  private saveFormState() {
    const state = {
      viewMode: this.viewMode,
      showForm: this.showForm,
      editingBatchId: this.editingBatchId,
      formCompanyId: this.formCompanyId,
      formBatchName: this.formBatchName,
      formPurchaseDate: this.formPurchaseDate,
      formTotalPrice: this.formTotalPrice,
      formPaid: this.formPaid,
      formStatus: this.formStatus,
      tempItems: this.tempItems,
      selectedMedicineId: this.selectedMedicineId,
      itemQuantity: this.itemQuantity,
      itemPurchasePrice: this.itemPurchasePrice,
      itemExpiryDate: this.itemExpiryDate,
      medicineSearchTerm: this.medicineSearchTerm
    };
    this.stateService.saveState(state);
  }

  private restoreFormState() {
    const state = this.stateService.getState();
    if (!state) return;
    this.viewMode = state.viewMode;
    this.showForm = state.showForm;
    this.editingBatchId = state.editingBatchId;
    this.formCompanyId = state.formCompanyId;
    this.formBatchName = state.formBatchName;
    this.formPurchaseDate = state.formPurchaseDate;
    this.formTotalPrice = state.formTotalPrice;
    this.formPaid = state.formPaid;
    this.formStatus = state.formStatus;
    this.tempItems = state.tempItems || [];
    this.selectedMedicineId = state.selectedMedicineId;
    this.itemQuantity = state.itemQuantity;
    this.itemPurchasePrice = state.itemPurchasePrice;
    this.itemExpiryDate = state.itemExpiryDate;
    this.medicineSearchTerm = state.medicineSearchTerm || '';
  }

  private stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  // ── Confirm dialog ───────────────────────────────────────────────────────────

  private openConfirm(msg: string, cb: () => void) {
    this.zone.run(() => {
      this.confirmMessage  = msg;
      this.confirmCallback = cb;
      this.showConfirmDialog = true;
      this.cdr.detectChanges();
    });
  }

  onConfirmYes() {
    this.showConfirmDialog = false;
    this.cdr.detectChanges();
    if (this.confirmCallback) { const cb = this.confirmCallback; this.confirmCallback = null; cb(); }
  }

  onConfirmNo() {
    this.zone.run(() => { this.showConfirmDialog = false; this.confirmCallback = null; this.cdr.detectChanges(); });
  }

  // ── DB helpers ───────────────────────────────────────────────────────────────

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((r: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(r); }))
        .catch((e: any) => this.zone.run(() => { if (!this.isDestroyed) reject(e); }));
    });
  }

  private getLastId(res: any): number | null {
    if (!res) return null;
    if (typeof res.lastInsertRowid === 'number' && res.lastInsertRowid > 0) return res.lastInsertRowid;
    if (typeof res.lastID          === 'number' && res.lastID          > 0) return res.lastID;
    if (res.result) return this.getLastId(res.result);
    for (const k of Object.keys(res))
      if (/last.*id/i.test(k) && typeof res[k] === 'number') return res[k];
    return null;
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3500);
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  async loadInitialData() {
    if (this.isDestroyed) return;
    this.isLoading = true; this.cdr.detectChanges();
    try {
      const [co, me] = await Promise.all([
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name'),
        this.dbRun('SELECT product_id, name, sale_price FROM medicines ORDER BY name')
      ]);
      if (!this.isDestroyed) {
        this.companies = co || [];
        this.medicines = me || [];
        await this.loadPurchases(false);
        this.startPolling();
      }
    } catch (e) {
      console.error('loadInitialData:', e);
      this.showToast('Failed to load data', 'error');
    } finally {
      if (!this.isDestroyed) { this.isLoading = false; this.cdr.detectChanges(); }
    }
  }

  async loadPurchases(showLoader = false) {
    if (this.isDestroyed) return;
    if (showLoader) { this.isLoading = true; this.cdr.detectChanges(); }
    try {
      const r = await this.dbRun(`
        SELECT pb.*, c.company_name,
          (SELECT COUNT(*)          FROM batch_items WHERE purchase_batch_id = pb.purchase_batch_id) AS item_count,
          (SELECT SUM(quantity_received) FROM batch_items WHERE purchase_batch_id = pb.purchase_batch_id) AS total_quantity
        FROM purchase_batches pb
        LEFT JOIN company c ON pb.company_id = c.company_id
        ORDER BY pb.purchase_date DESC, pb.purchase_batch_id DESC`);
      if (!this.isDestroyed) { this.purchases = r || []; this.cdr.detectChanges(); }
    } catch (e) { console.error('loadPurchases:', e); }
    finally { if (!this.isDestroyed && showLoader) { this.isLoading = false; this.cdr.detectChanges(); } }
  }

  async loadPurchaseDetails(batchId: number) {
    if (this.isDestroyed) return;
    try {
      const [p, items] = await Promise.all([
        this.dbRun(`SELECT pb.*, c.company_name FROM purchase_batches pb
                    LEFT JOIN company c ON pb.company_id = c.company_id
                    WHERE pb.purchase_batch_id = ?`, [batchId], 'get'),
        this.dbRun(`SELECT bi.*, m.name AS medicine_name, m.sale_price
                    FROM batch_items bi JOIN medicines m ON bi.product_id = m.product_id
                    WHERE bi.purchase_batch_id = ? ORDER BY bi.expiry_date`, [batchId])
      ]);
      if (!this.isDestroyed) {
        this.selectedPurchase = p;
        this.purchaseItems    = items || [];
        this.cdr.detectChanges();
      }
    } catch (e) { console.error('loadPurchaseDetails:', e); this.showToast('Failed to load details', 'error'); }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  async showDetails(purchase: any) {
    if (this.isDestroyed || this.isBusy) return;
    this.stopPolling();
    this.showForm = false; this.selectedPurchase = null; this.purchaseItems = [];
    this.viewMode = 'details'; this.cdr.detectChanges();
    await this.loadPurchaseDetails(purchase.purchase_batch_id);
  }

  showAddForm() {
    this.stopPolling();
    this.editingBatchId = null;
    this.resetForm();
    this.viewMode = 'add'; this.showForm = true; this.formKey++;
    this.cdr.detectChanges();
  }

  async showEditForm(purchase: any) {
    if (this.isDestroyed || this.isBusy) return;
    this.stopPolling();
    this.isBusy = true; this.cdr.detectChanges();

    try {
      const items = await this.dbRun(`
        SELECT bi.*, m.name AS medicine_name
        FROM batch_items bi
        JOIN medicines m ON bi.product_id = m.product_id
        WHERE bi.purchase_batch_id = ?
        ORDER BY bi.expiry_date`, [purchase.purchase_batch_id]);

      this.editingBatchId   = purchase.purchase_batch_id;
      this.formBatchName    = purchase.BatchName    || '';
      this.formCompanyId    = purchase.company_id   ?? null;
      this.formPurchaseDate = purchase.purchase_date
        ? purchase.purchase_date.split('T')[0]
        : new Date().toISOString().split('T')[0];
      this.formPaid         = purchase.paid         || 0;
      this.formStatus       = purchase.status       || 'pending';
      this.formTotalPrice   = purchase.total_price  || 0;

      this.tempItems = (items || []).map((bi: any) => ({
        batch_item_id:  bi.batch_item_id,
        product_id:     bi.product_id,
        medicine_name:  bi.medicine_name,
        quantity:       bi.quantity_received,
        purchase_price: bi.purchase_price,
        total:          bi.purchase_price * bi.quantity_received,
        expiry_date:    bi.expiry_date,
        existing:       true
      }));

      this.resetItemForm();
      this.viewMode = 'edit'; this.showForm = true; this.formKey++;
      this.cdr.detectChanges();
    } catch (e: any) {
      console.error('showEditForm:', e);
      this.showToast('Failed to load purchase for editing', 'error');
    } finally {
      this.isBusy = false; this.cdr.detectChanges();
    }
  }

  cancelForm() {
    this.stateService.clearState();
    this.showForm = false; this.viewMode = 'list';
    this.selectedPurchase = null; this.purchaseItems = [];
    this.editingBatchId   = null;
    this.resetForm(); this.cdr.detectChanges();
    this.startPolling();
  }

  goBack() {
    this.showForm = false; this.viewMode = 'list';
    this.selectedPurchase = null; this.purchaseItems = [];
    this.editingBatchId   = null;
    this.resetForm(); this.cdr.detectChanges();
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

  // ── Medicine Search ───────────────────────────────────────────────────────────

  /** Called on every keystroke in the medicine search input */
  onMedicineSearch() {
    // If user types after a selection, clear the selection
    if (this.selectedMedicineId) {
      this.selectedMedicineId = null;
      this.selectedMedicine   = null;
      this.itemPurchasePrice  = 0;
    }
    this.showMedicineSuggestions = this.medicineSearchTerm.trim().length > 0;
    this.cdr.detectChanges();
  }

  /** Called on focus — show suggestions if there's already text */
  onMedicineSearchFocus() {
    if (!this.selectedMedicineId && this.medicineSearchTerm.trim().length > 0) {
      this.showMedicineSuggestions = true;
      this.cdr.detectChanges();
    }
  }

  /** Selects a medicine from the suggestion list */
  selectMedicine(medicine: any) {
    this.selectedMedicineId     = medicine.product_id;
    this.selectedMedicine       = medicine;
    this.medicineSearchTerm     = '';          // clear the text input
    this.showMedicineSuggestions = false;
    this.itemPurchasePrice      = 0;           // default 0 as requested
    this.cdr.detectChanges();
  }

  /** Clears the current medicine selection */
  clearMedicineSelection() {
    this.selectedMedicineId     = null;
    this.selectedMedicine       = null;
    this.medicineSearchTerm     = '';
    this.itemPurchasePrice      = 0;
    this.showMedicineSuggestions = false;
    this.cdr.detectChanges();
  }

  /** Hides the suggestions panel */
  closeMedicineSuggestions() {
    this.showMedicineSuggestions = false;
    this.cdr.detectChanges();
  }

  /** Filtered medicine list based on search term — case-insensitive, fast */
  get filteredMedicines(): any[] {
    const term = this.medicineSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return this.medicines.filter(m =>
      m.name.toLowerCase().includes(term)
    ).slice(0, 20); // cap at 20 results for performance
  }

  // ── Item row ─────────────────────────────────────────────────────────────────

  /** Legacy: kept for any remaining calls, but onMedicineSearch covers the new flow */
  onMedicineSelect() {
    if (!this.selectedMedicineId) { this.selectedMedicine = null; this.itemPurchasePrice = 0; return; }
    const id = Number(this.selectedMedicineId);
    this.selectedMedicine  = this.medicines.find(m => m.product_id === id) || null;
    this.itemPurchasePrice = 0;
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
    if (!this.selectedMedicineId) { this.showToast('Please select a medicine', 'error'); return; }
    const qty   = Number(this.itemQuantity);
    const price = Number(this.itemPurchasePrice);
    const id    = Number(this.selectedMedicineId);

    if (!qty || qty <= 0)           { this.showToast('Quantity must be greater than 0', 'error'); return; }
    if (isNaN(price) || price <= 0) { this.showToast('Purchase price must be greater than 0', 'error'); return; }
    if (!this.itemExpiryDate)        { this.showToast('Please select an expiry date', 'error'); return; }

    const medicine = this.medicines.find(m => m.product_id === id);
    if (!medicine) { this.showToast('Selected medicine not found', 'error'); return; }
    if (this.tempItems.some(i => Number(i.product_id) === id))
      { this.showToast('Medicine already added — remove it first', 'error'); return; }

    this.tempItems.push({
      product_id:     id,
      medicine_name:  medicine.name,
      quantity:       qty,
      purchase_price: price,
      total:          qty * price,
      expiry_date:    this.itemExpiryDate,
      existing:       false
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
    this.selectedMedicineId     = null;
    this.selectedMedicine       = null;
    this.medicineSearchTerm     = '';
    this.showMedicineSuggestions = false;
    this.itemQuantity            = 1;
    this.itemPurchasePrice       = 0;
    this.itemExpiryDate          = '';
  }

  // ── CREATE ───────────────────────────────────────────────────────────────────

  async createPurchase() {
    if (!this.validateForm()) return;

    const paid = Number(this.formPaid);
    this.isBusy = true; this.cdr.detectChanges();

    let batchId: number | null = null;
    let success = false;

    try {
      const existing = await this.dbRun(
        'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ?',
        [this.formBatchName.trim()], 'get');
      if (existing) { this.showToast('A batch with this name already exists', 'error'); return; }

      const res = await this.dbRun(
        `INSERT INTO purchase_batches (company_id, purchase_date, total_price, paid, BatchName, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [Number(this.formCompanyId), this.formPurchaseDate, this.formTotalPrice, paid, this.formBatchName.trim(), this.formStatus],
        'run');

      batchId = this.getLastId(res);
      if (!batchId) {
        const row = await this.dbRun(
          'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ? ORDER BY purchase_batch_id DESC LIMIT 1',
          [this.formBatchName.trim()], 'get');
        batchId = row?.purchase_batch_id ?? null;
      }
      if (!batchId) throw new Error('Could not determine inserted batch ID');

      for (const item of this.tempItems) {
        await this.dbRun(
          `INSERT INTO batch_items (purchase_batch_id, product_id, purchase_price, quantity_received, quantity_remaining, expiry_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [batchId, item.product_id, item.purchase_price, item.quantity, item.quantity, item.expiry_date], 'run');
      }

      try {
        for (const item of this.tempItems) {
          await this.dbRun(
            `INSERT INTO stock_log (product_id, change_type, quantity_change, remarks, log_date)
             VALUES (?, 'PURCHASE', ?, ?, datetime('now'))`,
            [item.product_id, item.quantity, `Purchase batch: ${this.formBatchName.trim()}`], 'run');
        }
      } catch (le) { console.warn('stock_log skipped:', le); }

      success = true;

    } catch (e: any) {
      console.error('createPurchase:', e);
      if (batchId) {
        try {
          await this.dbRun('DELETE FROM batch_items WHERE purchase_batch_id = ?', [batchId], 'run');
          await this.dbRun('DELETE FROM purchase_batches WHERE purchase_batch_id = ?', [batchId], 'run');
        } catch (rb) { console.error('rollback failed:', rb); }
      }
      this.showToast(e?.message || 'Failed to create purchase', 'error');
    } finally {
      this.isBusy = false; this.cdr.detectChanges();
    }

    if (success) {
      await this.loadPurchases(false);
      this.showToast('Purchase created successfully! ✓');
      await this.delay(500);
      this.cancelForm();
    }
    this.stateService.clearState();
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────

  async updatePurchase() {
    if (!this.validateForm()) return;
    if (!this.editingBatchId) return;

    const paid    = Number(this.formPaid);
    const batchId = this.editingBatchId;
    this.isBusy   = true; this.cdr.detectChanges();

    let success = false;

    try {
      const dup = await this.dbRun(
        'SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = ? AND purchase_batch_id != ?',
        [this.formBatchName.trim(), batchId], 'get');
      if (dup) { this.showToast('Another batch with this name already exists', 'error'); return; }

      await this.dbRun(
        `UPDATE purchase_batches
         SET company_id = ?, purchase_date = ?, total_price = ?, paid = ?, BatchName = ?, status = ?
         WHERE purchase_batch_id = ?`,
        [Number(this.formCompanyId), this.formPurchaseDate, this.formTotalPrice, paid, this.formBatchName.trim(), this.formStatus, batchId],
        'run');

      await this.dbRun('DELETE FROM batch_items WHERE purchase_batch_id = ?', [batchId], 'run');

      for (const item of this.tempItems) {
        await this.dbRun(
          `INSERT INTO batch_items (purchase_batch_id, product_id, purchase_price, quantity_received, quantity_remaining, expiry_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [batchId, item.product_id, item.purchase_price, item.quantity, item.quantity, item.expiry_date], 'run');
      }

      success = true;

    } catch (e: any) {
      console.error('updatePurchase:', e);
      this.showToast(e?.message || 'Failed to update purchase', 'error');
    } finally {
      this.isBusy = false; this.cdr.detectChanges();
    }

    if (success) {
      await this.loadPurchases(false);
      this.showToast('Purchase updated successfully! ✓');
      await this.delay(500);
      this.cancelForm();
    }
    this.stateService.clearState();
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────

  deletePurchase(purchase: any) {
    if (this.isBusy || this.isDestroyed) return;

    this.openConfirm(
      `Delete batch "${purchase.BatchName}"? This will also delete all its items and cannot be undone.`,
      () => {
        this.zone.run(async () => {
          this.isBusy = true; this.cdr.detectChanges();
          try {
            const batchId = purchase.purchase_batch_id;
            await this.dbRun('DELETE FROM batch_items    WHERE purchase_batch_id = ?', [batchId], 'run');
            await this.dbRun('DELETE FROM purchase_batches WHERE purchase_batch_id = ?', [batchId], 'run');

            await this.loadPurchases(false);
            this.showToast('Purchase deleted successfully!');

            if (this.viewMode === 'details' && this.selectedPurchase?.purchase_batch_id === batchId)
              this.goBack();

          } catch (e: any) {
            console.error('deletePurchase:', e);
            this.showToast(e?.message || 'Failed to delete purchase', 'error');
          } finally {
            if (!this.isDestroyed) { this.isBusy = false; this.cdr.detectChanges(); }
          }
        });
      }
    );
  }

  // ── Shared submit handler ─────────────────────────────────────────────────────

  onFormSubmit() {
    if (this.viewMode === 'edit') this.updatePurchase();
    else                          this.createPurchase();
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  private validateForm(): boolean {
    if (!this.formCompanyId)        { this.showToast('Please select a supplier', 'error');    return false; }
    if (!this.formBatchName.trim()) { this.showToast('Please enter a batch name', 'error');   return false; }
    if (this.tempItems.length === 0){ this.showToast('Please add at least one item', 'error'); return false; }
    const paid = Number(this.formPaid);
    if (isNaN(paid) || paid < 0)   { this.showToast('Paid amount cannot be negative', 'error'); return false; }
    return true;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

  getPaymentStatus(total: number, paid: number): string {
    if (!total || total === 0) return 'Unpaid';
    if (paid >= total) return 'Paid';
    if (paid > 0)      return 'Partial';
    return 'Unpaid';
  }

  getPaymentStatusClass(total: number, paid: number): string {
    if (!total || total === 0) return 'status-unpaid';
    if (paid >= total)         return 'status-paid';
    if (paid > 0)              return 'status-partial';
    return 'status-unpaid';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  }

  formatDate(date: string): string {
    if (!date) return '—';
    try { return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return date; }
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  trackById(_: number, item: any) { return item.purchase_batch_id ?? item.product_id; }

  get filteredPurchases(): any[] {
    if (!this.searchTerm.trim()) return this.purchases;
    const t = this.searchTerm.toLowerCase();
    return this.purchases.filter(p =>
      p.BatchName?.toLowerCase().includes(t) ||
      p.company_name?.toLowerCase().includes(t)
    );
  }

  get balanceDue(): number {
    return Math.max(0, this.formTotalPrice - (Number(this.formPaid) || 0));
  }

  get formTitle(): string {
    if (this.viewMode === 'edit') return 'Edit Purchase Batch';
    return 'New Purchase Batch';
  }

  get submitLabel(): string {
    if (this.isBusy) return 'Saving…';
    return this.viewMode === 'edit' ? 'Update Purchase' : 'Create Purchase';
  }
}