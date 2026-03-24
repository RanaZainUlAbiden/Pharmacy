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

  // ── Data ─────────────────────────────────────────────────────────────────────
  allMedicines:  any[] = [];
  reorderList:   any[] = [];

  // ── Inline editing ────────────────────────────────────────────────────────────
  editingItemId: number | null = null;
  editQuantity   = 0;

  // ── Adding ────────────────────────────────────────────────────────────────────
  selectedMedicineId: number | null = null;

  // ── UI ────────────────────────────────────────────────────────────────────────
  isLoading      = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer:  any = null;
  private isDestroyed      = false;

  constructor(
    private db:   DatabaseService,
    private zone: NgZone,
    private cdr:  ChangeDetectorRef
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit()    { this.loadData(); }
  ngOnDestroy() { this.isDestroyed = true; if (this.toastTimer) clearTimeout(this.toastTimer); }

  // ── Toast ─────────────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3000);
  }

  // ── DB helper ─────────────────────────────────────────────────────────────────

  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((r: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(r); }))
        .catch((e: any) => this.zone.run(() => { if (!this.isDestroyed) reject(e); }));
    });
  }

  // ── Load data ─────────────────────────────────────────────────────────────────

  async loadData() {
    this.isLoading = true; this.cdr.detectChanges();
    try {
      // All medicines for the dropdown (sorted by name)
      const med = await this.dbRun(`
        SELECT
          m.product_id, m.name,
          m.minimum_threshold,
          COALESCE(SUM(bi.quantity_remaining), 0) AS current_stock
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        ORDER BY m.name
      `);
      this.allMedicines = med || [];

      // Pre-populate reorder list with LOW STOCK items
      const low = await this.dbRun(`
        SELECT
          m.product_id, m.name,
          m.minimum_threshold,
          COALESCE(SUM(bi.quantity_remaining), 0) AS current_stock,
          (m.minimum_threshold - COALESCE(SUM(bi.quantity_remaining), 0)) AS needed_quantity
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        HAVING current_stock <= m.minimum_threshold
        ORDER BY needed_quantity DESC
      `);

      this.reorderList = (low || []).map((item: any) => ({
        product_id:        item.product_id,
        name:              item.name,
        current_stock:     item.current_stock,
        minimum_threshold: item.minimum_threshold,
        quantity:          Math.max(Math.ceil(item.needed_quantity), 5)
      }));

    } catch (e) {
      console.error('loadData:', e);
      this.showToast('Failed to load data', 'error');
    } finally {
      this.isLoading = false; this.cdr.detectChanges();
    }
  }

  // ── Dropdown — exclude already-added medicines ────────────────────────────────

  get availableMedicines(): any[] {
    const ids = new Set(this.reorderList.map(i => i.product_id));
    return this.allMedicines.filter(m => !ids.has(m.product_id));
  }

  // ── Add medicine to list (FIX: forces change detection) ──────────────────────

  addMedicineToReorder() {
    if (!this.selectedMedicineId) { this.showToast('Please select a medicine', 'error'); return; }

    const id = Number(this.selectedMedicineId);
    if (this.reorderList.some(i => i.product_id === id)) {
      this.showToast('Medicine already in reorder list', 'error'); return;
    }

    const med = this.allMedicines.find(m => m.product_id === id);
    if (!med) return;

    const needed = Math.max((med.minimum_threshold || 10) - (med.current_stock || 0), 5);

    // FIX: create a new array reference so Angular detects the change
    this.reorderList = [
      ...this.reorderList,
      {
        product_id:        med.product_id,
        name:              med.name,
        current_stock:     med.current_stock,
        minimum_threshold: med.minimum_threshold,
        quantity:          needed
      }
    ];

    this.selectedMedicineId = null;
    this.showToast(`${med.name} added to reorder list`);
    this.cdr.detectChanges();
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────

  startEdit(item: any) {
    this.editingItemId = item.product_id;
    this.editQuantity  = item.quantity;
    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.editingItemId = null;
    this.editQuantity  = 0;
    this.cdr.detectChanges();
  }

  saveEdit(item: any) {
    if (this.editQuantity < 1) { this.showToast('Quantity must be at least 1', 'error'); return; }
    // Mutate in place then create new array ref so *ngFor re-renders
    item.quantity      = this.editQuantity;
    this.reorderList   = [...this.reorderList];
    this.cancelEdit();
    this.showToast('Quantity updated');
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  deleteItem(item: any) {
    this.reorderList = this.reorderList.filter(i => i.product_id !== item.product_id);
    this.showToast('Item removed');
    this.cdr.detectChanges();
  }

  // ── Clear all ─────────────────────────────────────────────────────────────────

  clearList() {
    this.reorderList = [];
    this.showToast('Reorder list cleared');
    this.cdr.detectChanges();
  }

  // ── Total reorder quantity ────────────────────────────────────────────────────

  get totalQuantity(): number {
    return this.reorderList.reduce((s, i) => s + (i.quantity || 0), 0);
  }

  // ── Save / Print reorder bill ─────────────────────────────────────────────────

  saveToLocal() {
    if (this.reorderList.length === 0) { this.showToast('List is empty', 'error'); return; }

    const today    = new Date();
    const dateStr  = today.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr  = today.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    const serial   = 'RO-' + today.getFullYear()
                   + String(today.getMonth() + 1).padStart(2, '0')
                   + String(today.getDate()).padStart(2, '0')
                   + '-' + (Math.floor(Math.random() * 9000) + 1000);

    const rows = this.reorderList.map((item, idx) => `
      <tr>
        <td class="sno">${idx + 1}</td>
        <td class="mname">${item.name}</td>
        <td class="center bold">${item.quantity}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reorder Bill – ${serial}</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      font-size: 12px;
      color: #000;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h2 {
      margin: 0;
      font-size: 18px;
    }

    .header p {
      margin: 2px 0;
      font-size: 12px;
    }

    /* Info */
    .info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 12px;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      border: 1px solid #000;
      padding: 6px;
    }

    th {
      text-align: left;
      font-weight: bold;
    }

    td.center {
      text-align: center;
      width: 80px;
    }

    /* Total */
    .total {
      margin-top: 10px;
      text-align: right;
      font-weight: bold;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
    }

    @media print {
      body {
        padding: 10px;
      }
    }
  </style>
</head>

<body>

  <!-- Header -->
  <div class="header">
    <h2>Pharmacy POS</h2>
    <p>Reorder Bill</p>
  </div>

  <!-- Info -->
  <div class="info">
    <div>Serial: ${serial}</div>
    <div>Date: ${dateStr}</div>
    <div>Time: ${timeStr}</div>
  </div>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine Name</th>
        <th class="center">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Total -->
  <div class="total">
    Total Qty: ${this.totalQuantity}
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated by Pharmacy POS
  </div>

  <script>
    window.onload = () => window.print();
  </script>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { this.showToast('Pop-up blocked — please allow pop-ups', 'error'); return; }
    win.document.write(html);
    win.document.close();
    this.showToast('Reorder bill opened for printing!');
  }

  // ── Misc ──────────────────────────────────────────────────────────────────────

  trackById(_: number, item: any) { return item.product_id; }
}