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
  ngOnDestroy() { 
    this.isDestroyed = true; 
    if (this.toastTimer) clearTimeout(this.toastTimer); 
  }

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

  // ── Load data with persistence ─────────────────────────────────────────────────

  async loadData() {
    this.isLoading = true; 
    this.cdr.detectChanges();
    
    try {
      // Load saved reorder list from localStorage
      const savedList = localStorage.getItem('reorderList');
      const savedTimestamp = localStorage.getItem('reorderListTimestamp');
      
      // Load all medicines
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

      // Check if we have a saved list and it's not too old (optional: keep for 7 days)
      if (savedList && savedList !== '[]') {
        const parsedList = JSON.parse(savedList);
        if (parsedList.length > 0) {
          this.reorderList = parsedList;
          this.showToast('Previous reorder list restored', 'success');
        } else {
          // Load low stock items only if no saved list
          await this.loadLowStockItems();
        }
      } else {
        // First time - load low stock items
        await this.loadLowStockItems();
      }

    } catch (e) {
      console.error('loadData:', e);
      this.showToast('Failed to load data', 'error');
    } finally {
      this.isLoading = false; 
      this.cdr.detectChanges();
    }
  }

  // Load low stock items (for first load)
  async loadLowStockItems() {
    try {
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
      
      // Save initial list
      this.saveToLocalStorage();
    } catch (e) {
      console.error('loadLowStockItems:', e);
    }
  }

  // Save reorder list to localStorage
  private saveToLocalStorage() {
    localStorage.setItem('reorderList', JSON.stringify(this.reorderList));
    localStorage.setItem('reorderListTimestamp', new Date().toISOString());
  }

  // ── Dropdown — exclude already-added medicines ────────────────────────────────

  get availableMedicines(): any[] {
    const ids = new Set(this.reorderList.map(i => i.product_id));
    return this.allMedicines.filter(m => !ids.has(m.product_id));
  }

  // ── Add medicine to list ─────────────────────────────────────────────────────

  addMedicineToReorder() {
    if (!this.selectedMedicineId) { 
      this.showToast('Please select a medicine', 'error'); 
      return; 
    }

    const id = Number(this.selectedMedicineId);
    if (this.reorderList.some(i => i.product_id === id)) {
      this.showToast('Medicine already in reorder list', 'error'); 
      return;
    }

    const med = this.allMedicines.find(m => m.product_id === id);
    if (!med) return;

    const needed = Math.max((med.minimum_threshold || 10) - (med.current_stock || 0), 5);

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
    this.saveToLocalStorage();
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
    if (this.editQuantity < 1) { 
      this.showToast('Quantity must be at least 1', 'error'); 
      return; 
    }
    item.quantity      = this.editQuantity;
    this.reorderList   = [...this.reorderList];
    this.saveToLocalStorage();
    this.cancelEdit();
    this.showToast('Quantity updated');
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  deleteItem(item: any) {
    this.reorderList = this.reorderList.filter(i => i.product_id !== item.product_id);
    this.saveToLocalStorage();
    this.showToast('Item removed');
    this.cdr.detectChanges();
  }

  // ── Clear all ─────────────────────────────────────────────────────────────────

  clearList() {
    if (confirm('Clear entire reorder list?')) {
      this.reorderList = [];
      this.saveToLocalStorage();
      this.showToast('Reorder list cleared');
      this.cdr.detectChanges();
    }
  }

  // ── Total reorder quantity ────────────────────────────────────────────────────

  get totalQuantity(): number {
    return this.reorderList.reduce((s, i) => s + (i.quantity || 0), 0);
  }

  // ── Print reorder bill (Thermal Printer Format - 80mm) ─────────────────────────

saveToLocal() {
  if (this.reorderList.length === 0) { 
    this.showToast('List is empty', 'error'); 
    return; 
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = today.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  const serial = 'RO-' + today.getFullYear()
               + String(today.getMonth() + 1).padStart(2, '0')
               + String(today.getDate()).padStart(2, '0')
               + '-' + (Math.floor(Math.random() * 9000) + 1000);

  const rows = this.reorderList.map((item, idx) => `
    <tr>
      <td class="sno">${idx + 1}</td>
      <td class="mname">${this.escapeHtml(item.name)}</td>
      <td class="center bold">${item.quantity}</td>
     </tr>`).join('');

  // Clean thermal printer format (matching sale receipt)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reorder Bill – ${serial}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      font-size: 11px;
      line-height: 1.4;
    }

    /* Header Section */
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #000;
    }
    .header h2 {
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 4px;
      letter-spacing: 1px;
    }
    .header p {
      font-size: 9px;
      margin: 2px 0;
    }

    /* Title */
    .title {
      text-align: center;
      margin: 10px 0;
    }
    .title p {
      font-size: 12px;
      font-weight: bold;
    }

    /* Info Section */
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 9px;
    }

    /* Solid Line */
    .solid-line {
      border-top: 1px solid #000;
      margin: 8px 0;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }
    th, td {
      padding: 6px 2px;
      text-align: left;
      border-bottom: 1px solid #ccc;
    }
    th {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      font-size: 10px;
    }
    td.center {
      text-align: center;
    }
    .sno {
      width: 15%;
      text-align: center;
    }
    .mname {
      width: 60%;
      word-break: break-word;
      white-space: normal;
    }
    .bold {
      font-weight: bold;
    }

    /* Total Section */
    .total {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-weight: bold;
      font-size: 11px;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-size: 8px;
    }
    .footer p {
      margin: 2px 0;
    }

    @media print {
      body {
        margin: 0;
        padding: 2mm;
      }
    }
  </style>
</head>
<body>

  <!-- Header Section (Same as Sale Receipt) -->
  <div class="header">
    <h2>PHARMACY POS</h2>
    <p>123 Main Street, Lahore, Pakistan</p>
    <p>Phone: 0300-1234567 | Email: info@pharmacy.com</p>
  </div>

  <!-- Title -->
  <div class="title">
    <p>REORDER BILL</p>
  </div>

  <!-- Info Section -->
  <div class="info-row">
    <div>Bill No: ${serial}</div>
    <div>Date: ${dateStr}</div>
  </div>
  <div class="info-row">
    <div>Time: ${timeStr}</div>
    <div>Items: ${this.reorderList.length}</div>
  </div>

  <div class="solid-line"></div>

  <!-- Table - Only 3 Columns -->
  <table>
    <thead>
      <tr>
        <th class="sno">#</th>
        <th class="mname">Medicine Name</th>
        <th class="center">Qty</th>
      </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="solid-line"></div>

  <!-- Total Section -->
  <div class="total">
    <span>TOTAL ITEMS</span>
    <span>${this.totalQuantity}</span>
  </div>

  <div class="solid-line"></div>

  <!-- Footer (Same as Sale Receipt) -->
  <div class="footer">
    <p><strong>THANK YOU!</strong></p>
    <p>Visit Again</p>
    <p>GST: 12-345678-9</p>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
        setTimeout(() => window.close(), 500);
      }, 100);
    };
  </script>

</body>
</html>`;

  // Open print window
  const win = window.open('', '_blank', 'width=400,height=600,toolbar=no,menubar=no');
  if (!win) { 
    this.showToast('Pop-up blocked — please allow pop-ups', 'error'); 
    return; 
  }
  
  win.document.write(html);
  win.document.close();
  win.focus();
  
  this.showToast('Reorder bill opened for printing!');
}
private escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
  // ── Clear saved list manually (optional) ─────────────────────────────────────

  clearSavedList() {
    if (confirm('Clear saved reorder list? This cannot be undone.')) {
      localStorage.removeItem('reorderList');
      localStorage.removeItem('reorderListTimestamp');
      this.reorderList = [];
      this.showToast('Saved list cleared');
      this.cdr.detectChanges();
    }
  }

  // ── Misc ──────────────────────────────────────────────────────────────────────

  trackById(_: number, item: any) { return item.product_id; }
}