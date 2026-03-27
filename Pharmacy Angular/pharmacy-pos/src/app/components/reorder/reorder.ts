import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
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

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('qtyInput')    qtyInput!: ElementRef;

  // ── Company Settings ──────────────────────────────────────────────────────────
  companySettings: any = {
    name: 'Pharmacy POS',
    address: '123 Main Street, Lahore',
    phone: '0300-1234567',
    email: 'info@pharmacy.com'
  };

  // ── Data ──────────────────────────────────────────────────────────────────────
  allNeedingReorder: any[] = [];   // low/out-of-stock (for badges)
  allMedicines: any[]      = [];   // ALL medicines (for search)
  reorderList: any[]       = [];

  // ── Search ────────────────────────────────────────────────────────────────────
  searchQuery   = '';
  searchResults: any[] = [];
  selectedIndex = -1;
  showDropdown  = false;

  // ── Selected medicine & qty ───────────────────────────────────────────────────
  selectedMedicine: any = null;
  addQuantity = 1;

  // ── Inline editing ────────────────────────────────────────────────────────────
  editingItemId: number | null = null;
  editQuantity = 0;

  // ── UI ────────────────────────────────────────────────────────────────────────
  isLoading = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any   = null;
  private isDestroyed       = false;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadCompanySettings();
    this.loadData();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Company Settings ──────────────────────────────────────────────────────────

  loadCompanySettings() {
    const saved = localStorage.getItem('companySettings');
    if (saved) this.companySettings = JSON.parse(saved);
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

  // ── Load data ─────────────────────────────────────────────────────────────────

  async loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      // 1) Low / out-of-stock that were actually purchased (badges only)
      const lowStock = await this.dbRun(`
        SELECT
          m.product_id,
          m.name,
          COALESCE(NULLIF(m.minimum_threshold, 0), 10)               AS minimum_threshold,
          COALESCE(SUM(bi.quantity_remaining), 0)                    AS current_stock,
          (COALESCE(NULLIF(m.minimum_threshold, 0), 10)
            - COALESCE(SUM(bi.quantity_remaining), 0))               AS needed_quantity
        FROM medicines m
        INNER JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        HAVING current_stock <= minimum_threshold
        ORDER BY current_stock ASC, needed_quantity DESC
      `);
      this.allNeedingReorder = lowStock || [];

      // 2) ALL medicines for search bar
      const all = await this.dbRun(`
        SELECT
          m.product_id,
          m.name,
          COALESCE(SUM(bi.quantity_remaining), 0) AS current_stock
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        ORDER BY m.name ASC
      `);
      this.allMedicines = all || [];

      // 3) Restore saved reorder list
      const savedList = localStorage.getItem('reorderList');
      if (savedList && savedList !== '[]') {
        const parsed = JSON.parse(savedList);
        if (parsed.length > 0) {
          this.reorderList = parsed;
          this.showToast('Previous reorder list restored', 'success');
        }
      }
    } catch (e) {
      console.error('loadData:', e);
      this.showToast('Failed to load data', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      // Auto-focus search bar on load
      setTimeout(() => this.searchInput?.nativeElement.focus(), 100);
    }
  }

  // ── Keyboard Navigation ───────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    const active = document.activeElement;

    // ── When qty input is focused ──
    if (active === this.qtyInput?.nativeElement) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.addMedicineToReorder();   // adds item → focuses search bar
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.clearSearch();
        setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
      }
      return;
    }

    // ── When search bar is focused ──
    if (active !== this.searchInput?.nativeElement) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.searchResults.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.searchResults.length;
        this.scrollToSelected();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.searchResults.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.scrollToSelected();
      }
    } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
        this.selectFromSearch(this.searchResults[this.selectedIndex]);
      } else if (this.searchResults.length > 0) {
        this.selectFromSearch(this.searchResults[0]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.clearSearch();
    }
  }

  private scrollToSelected() {
    setTimeout(() => {
      const el = document.querySelector('.search-option.highlighted');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  onSearchInput() {
    const q = this.searchQuery.trim().toLowerCase();
    this.selectedIndex = -1;
    if (!q) {
      this.searchResults = [];
      this.showDropdown  = false;
      this.cdr.detectChanges();
      return;
    }
    this.searchResults = this.allMedicines
      .filter(m => m.name.toLowerCase().includes(q))
      .slice(0, 10);
    this.selectedIndex = this.searchResults.length > 0 ? 0 : -1;
    this.showDropdown  = this.searchResults.length > 0;
    this.cdr.detectChanges();
  }

  selectFromSearch(med: any) {
    this.selectedMedicine = med;
    this.searchQuery      = med.name;
    this.showDropdown     = false;
    this.searchResults    = [];
    // Suggest quantity
    const lowEntry  = this.allNeedingReorder.find(m => m.product_id === med.product_id);
    this.addQuantity = lowEntry ? Math.max(Math.ceil(lowEntry.needed_quantity), 5) : 1;
    this.cdr.detectChanges();
    // Move focus to qty input
    setTimeout(() => {
      this.qtyInput?.nativeElement.focus();
      this.qtyInput?.nativeElement.select();
    }, 50);
  }

  clearSearch() {
    this.searchQuery      = '';
    this.searchResults    = [];
    this.showDropdown     = false;
    this.selectedMedicine = null;
    this.selectedIndex    = -1;
    this.addQuantity      = 1;
    this.cdr.detectChanges();
  }

  hideDropdown() {
    setTimeout(() => { this.showDropdown = false; this.cdr.detectChanges(); }, 200);
  }

  // ── Stock label helpers ───────────────────────────────────────────────────────

  getStockLabel(med: any): string {
    if (med.current_stock === 0) return 'Out of Stock';
    const low = this.allNeedingReorder.find(m => m.product_id === med.product_id);
    if (low) return `Low (${med.current_stock})`;
    return `Stock: ${med.current_stock}`;
  }

  getStockClass(med: any): string {
    if (med.current_stock === 0) return 'tag-out';
    const low = this.allNeedingReorder.find(m => m.product_id === med.product_id);
    return low ? 'tag-low' : 'tag-ok';
  }

  // ── Add to reorder list ───────────────────────────────────────────────────────

  addMedicineToReorder() {
    if (!this.selectedMedicine) {
      this.showToast('Please search and select a medicine first', 'error');
      return;
    }
    if (this.addQuantity < 1) {
      this.showToast('Quantity must be at least 1', 'error');
      return;
    }
    if (this.reorderList.some(i => i.product_id === this.selectedMedicine.product_id)) {
      this.showToast('Already in reorder list', 'error');
      return;
    }

    const lowEntry = this.allNeedingReorder.find(m => m.product_id === this.selectedMedicine.product_id);

    this.reorderList = [
      ...this.reorderList,
      {
        product_id:        this.selectedMedicine.product_id,
        name:              this.selectedMedicine.name,
        current_stock:     this.selectedMedicine.current_stock,
        minimum_threshold: lowEntry?.minimum_threshold ?? 0,
        quantity:          this.addQuantity
      }
    ];

    this.saveToLocalStorage();
    this.showToast(`${this.selectedMedicine.name} added`);
    this.clearSearch();
    this.cdr.detectChanges();

    // Return focus to search bar
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  private saveToLocalStorage() {
    localStorage.setItem('reorderList', JSON.stringify(this.reorderList));
    localStorage.setItem('reorderListTimestamp', new Date().toISOString());
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
    item.quantity    = this.editQuantity;
    this.reorderList = [...this.reorderList];
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

  clearList() {
    if (confirm('Clear entire reorder list?')) {
      this.reorderList = [];
      this.saveToLocalStorage();
      this.showToast('Reorder list cleared');
      this.cdr.detectChanges();
    }
  }

  clearSavedList() {
    if (confirm('Clear saved reorder list? This cannot be undone.')) {
      localStorage.removeItem('reorderList');
      localStorage.removeItem('reorderListTimestamp');
      this.reorderList = [];
      this.showToast('Saved list cleared');
      this.cdr.detectChanges();
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────────

  get outOfStockMedicines(): any[] { return this.allNeedingReorder.filter(m => m.current_stock === 0); }
  get lowStockMedicines():   any[] { return this.allNeedingReorder.filter(m => m.current_stock > 0);  }
  get totalQuantity():      number { return this.reorderList.reduce((s, i) => s + (i.quantity || 0), 0); }

  // ── Print Bill ────────────────────────────────────────────────────────────────

  saveToLocal() {
    if (this.reorderList.length === 0) { this.showToast('List is empty', 'error'); return; }

    const today   = new Date();
    const dateStr = today.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    const serial  = 'RO-'
      + today.getFullYear()
      + String(today.getMonth() + 1).padStart(2, '0')
      + String(today.getDate()).padStart(2, '0')
      + '-' + (Math.floor(Math.random() * 9000) + 1000);

    // ── Fetch company info from localStorage (same as sales component) ──
    const company = this.companySettings;

    const rows = this.reorderList.map((item, idx) => `
      <tr>
        <td class="sno">${idx + 1}</td>
        <td class="mname">${this.escapeHtml(item.name)}</td>
        <td class="stock-cell ${item.current_stock === 0 ? 'out' : 'low'}">
          ${item.current_stock === 0 ? 'OUT' : item.current_stock}
        </td>
        <td class="center bold">${item.quantity}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reorder Bill - ${serial}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 4mm 3mm; font-size: 12px; font-weight: 600; line-height: 1.5; color: #000; }
    .header { text-align: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #000; }
    .header h2 { font-size: 18px; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }
    .header p  { font-size: 11px; font-weight: 600; margin: 2px 0; }
    .title { text-align: center; margin: 8px 0 6px; }
    .title p { font-size: 14px; font-weight: 900; letter-spacing: 2px; text-decoration: underline; }
    .info-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; font-weight: 700; }
    .solid-line { border-top: 2px solid #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    thead tr { border-bottom: 2px solid #000; }
    th { font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 5px 3px; text-align: left; }
    td { font-size: 11px; font-weight: 700; padding: 5px 3px; border-bottom: 1px dashed #aaa; vertical-align: top; }
    .sno { width: 10%; text-align: center; }
    .mname { width: 50%; word-break: break-word; }
    .stock-cell { width: 18%; text-align: center; font-weight: 900; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .total-row { display: flex; justify-content: space-between; margin: 6px 0 2px; font-size: 13px; font-weight: 900; }
    .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; }
    .footer p { margin: 3px 0; font-size: 11px; font-weight: 700; }
    .footer .thanks { font-size: 14px; font-weight: 900; }
    .devinfo { text-align: center; margin-top: 8px; font-size: 10px; font-weight: 700; }
    @media print { body { margin: 0; padding: 2mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h2>${this.escapeHtml(company.name || 'PHARMACY POS')}</h2>
    ${company.address ? `<p>${this.escapeHtml(company.address)}</p>` : ''}
    ${company.phone   ? `<p>Phone: ${this.escapeHtml(company.phone)}</p>` : ''}
    ${company.email   ? `<p>Email: ${this.escapeHtml(company.email)}</p>` : ''}
    ${company.gst     ? `<p>GST: ${this.escapeHtml(company.gst)}</p>`     : ''}
  </div>
  <div class="title"><p>REORDER BILL</p></div>
  <div class="info-row"><span>Bill No:</span><span>${serial}</span></div>
  <div class="info-row"><span>Date:</span><span>${dateStr}</span></div>
  <div class="info-row"><span>Time:</span><span>${timeStr}</span></div>
  <div class="info-row"><span>Total Items:</span><span>${this.reorderList.length}</span></div>
  <div class="solid-line"></div>
  <table>
    <thead>
      <tr>
        <th class="sno">#</th>
        <th class="mname">Medicine Name</th>
        <th class="center">Stock</th>
        <th class="center">Ord Qty</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="solid-line"></div>
  <div class="total-row"><span>TOTAL ORDER QTY</span><span>${this.totalQuantity}</span></div>
  <div class="info-row"><span>No. of Medicines</span><span>${this.reorderList.length}</span></div>
  <div class="solid-line"></div>
  <div class="footer">
    <p class="thanks">*** REORDER SLIP ***</p>
    <p>Generated: ${dateStr} at ${timeStr}</p>
  </div>
  <div class="devinfo">
    <p>Designed by DevInfantary.com</p>
    <p>Contact: 03324645962</p>
  </div>
  <script>
    window.onload = () => { setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 150); };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=420,height=650,toolbar=no,menubar=no');
    if (!win) { this.showToast('Pop-up blocked - please allow pop-ups', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    this.showToast('Reorder bill opened for printing!');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  trackById(_: number, item: any) { return item.product_id; }
}