import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgTemplateOutlet],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {

  // ── Report type ────────────────────────────────────────────────────────────
  reportType: 'sales' | 'stock' = 'sales';

  // ── Date range (sales only) ────────────────────────────────────────────────
  dateRange = {
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end:   new Date().toISOString().split('T')[0]
  };
  periodPreset: string = 'month';

  // ── Filter values ──────────────────────────────────────────────────────────
  // KEY FIX: use null (not 0 or '') so [ngValue]="null" in template binds correctly
  selectedCustomerId:  number | null = null;
  selectedMedicineId:  number | null = null;
  selectedCompanyId:   number | null = null;
  selectedStockStatus: string        = 'all';

  // ── Dropdown data ──────────────────────────────────────────────────────────
  medicines: any[] = [];
  customers: any[] = [];
  companies: any[] = [];

  // ── Report data ────────────────────────────────────────────────────────────
  salesData:         any[] = [];
  stockData:         any[] = [];   // raw from DB
  filteredStockData: any[] = [];   // after client-side filters

  // ── Sales summary ──────────────────────────────────────────────────────────
  summary = {
    totalSales:        0,
    totalTransactions: 0,
    totalPaid:         0,
    totalDue:          0,
    averageSale:       0,
    topProduct:        ''
  };

  // ── Stock summary ──────────────────────────────────────────────────────────
  stockSummary = {
    total:      0,
    inStock:    0,
    lowStock:   0,
    outOfStock: 0
  };

  // ── UI state ───────────────────────────────────────────────────────────────
  isLoading = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer:  any  = null;
  private isDestroyed       = false;

  constructor(
    private db:   DatabaseService,
    private zone: NgZone,
    private cdr:  ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDropdowns();
    this.setPeriod('month');   // sets dateRange + calls loadReport()
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (this.isDestroyed) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.zone.run(() => { this.toast = { message: msg, type }; this.cdr.detectChanges(); });
    this.toastTimer = setTimeout(() => {
      this.zone.run(() => { if (!this.isDestroyed) { this.toast = null; this.cdr.detectChanges(); } });
    }, 3000);
  }

  // ── DB helper ──────────────────────────────────────────────────────────────
  private dbRun(sql: string, params: any[] = [], method = 'all'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, method)
        .then((r: any) => this.zone.run(() => { if (!this.isDestroyed) resolve(r); }))
        .catch((e: any) => this.zone.run(() => { if (!this.isDestroyed) reject(e); }));
    });
  }

  // ── Tab switch ─────────────────────────────────────────────────────────────
  switchTab(type: 'sales' | 'stock') {
    this.reportType = type;
    // reset filters on tab switch so nothing lingers
    this.selectedCustomerId  = null;
    this.selectedMedicineId  = null;
    this.selectedCompanyId   = null;
    this.selectedStockStatus = 'all';
    this.loadReport();
  }

  // ── Customer filter change ─────────────────────────────────────────────────
  // This is the critical fix: always reload with whatever selectedCustomerId is,
  // including null (= All Customers)
  onCustomerChange() {
    this.loadReport();
  }

  // ── Stock filter (client-side, no DB call needed) ──────────────────────────
  applyStockFilter() {
    if (this.selectedStockStatus === 'all') {
      this.filteredStockData = [...this.stockData];
    } else {
      this.filteredStockData = this.stockData.filter(
        i => i.stock_status === this.selectedStockStatus
      );
    }
  }

  // ── Reset filters ──────────────────────────────────────────────────────────
  resetFilters() {
    this.selectedCustomerId  = null;
    this.selectedMedicineId  = null;
    this.selectedCompanyId   = null;
    this.selectedStockStatus = 'all';
    this.setPeriod('month');
  }

  // ── Dropdowns ──────────────────────────────────────────────────────────────
  async loadDropdowns() {
    try {
      const [med, cust, comp] = await Promise.all([
        this.dbRun('SELECT product_id, name FROM medicines ORDER BY name'),
        this.dbRun('SELECT customer_id, full_name FROM customers ORDER BY full_name'),
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name')
      ]);
      this.medicines = med  || [];
      this.customers = cust || [];
      this.companies = comp || [];
    } catch (e) {
      console.error('Dropdown load error:', e);
    }
  }

  // ── Period presets ─────────────────────────────────────────────────────────
  setPeriod(preset: string) {
    this.periodPreset = preset;
    const today = new Date();

    switch (preset) {
      case 'today':
        this.dateRange.start = this.dateRange.end = this.toDate(today);
        break;
      case 'yesterday': {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        this.dateRange.start = this.dateRange.end = this.toDate(y);
        break;
      }
      case 'week': {
        const w = new Date(today); w.setDate(today.getDate() - 7);
        this.dateRange.start = this.toDate(w);
        this.dateRange.end   = this.toDate(today);
        break;
      }
      case 'month': {
        const m = new Date(today); m.setDate(1);
        this.dateRange.start = this.toDate(m);
        this.dateRange.end   = this.toDate(today);
        break;
      }
      case 'year': {
        this.dateRange.start = `${today.getFullYear()}-01-01`;
        this.dateRange.end   = this.toDate(today);
        break;
      }
    }
    this.loadReport();
  }

  private toDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // ── Main loader ────────────────────────────────────────────────────────────
  async loadReport() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      if (this.reportType === 'sales') {
        await this.loadSalesReport();
      } else {
        await this.loadStockReport();
      }
    } catch (e) {
      console.error('Report load error:', e);
      this.showToast('Failed to load report', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Sales Report ───────────────────────────────────────────────────────────
  async loadSalesReport() {
    // Build params array carefully — selectedCustomerId can be null
    let sql: string;
    let params: any[];

    if (this.selectedCustomerId !== null) {
      // Filter by specific customer AND date range
      sql = `
        SELECT
          s.sale_id,
          s.sale_date,
          c.full_name  AS customer_name,
          COUNT(si.sale_item_id) AS item_count,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) AS due_amount
        FROM sales s
        LEFT JOIN customers c  ON s.customer_id = c.customer_id
        LEFT JOIN sale_items si ON s.sale_id    = si.sale_id
        WHERE s.customer_id = ?
          AND date(s.sale_date) BETWEEN ? AND ?
        GROUP BY s.sale_id
        ORDER BY s.sale_date DESC
      `;
      params = [this.selectedCustomerId, this.dateRange.start, this.dateRange.end];
    } else {
      // ALL customers — no customer WHERE clause at all
      sql = `
        SELECT
          s.sale_id,
          s.sale_date,
          c.full_name  AS customer_name,
          COUNT(si.sale_item_id) AS item_count,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) AS due_amount
        FROM sales s
        LEFT JOIN customers c  ON s.customer_id = c.customer_id
        LEFT JOIN sale_items si ON s.sale_id    = si.sale_id
        WHERE date(s.sale_date) BETWEEN ? AND ?
        GROUP BY s.sale_id
        ORDER BY s.sale_date DESC
      `;
      params = [this.dateRange.start, this.dateRange.end];
    }

    this.salesData = (await this.dbRun(sql, params)) || [];

    // Summary
    this.summary.totalSales        = this.salesData.reduce((s, r) => s + (r.total_amount || 0), 0);
    this.summary.totalPaid         = this.salesData.reduce((s, r) => s + (r.paid_amount   || 0), 0);
    this.summary.totalDue          = this.salesData.reduce((s, r) => s + (r.due_amount    || 0), 0);
    this.summary.totalTransactions = this.salesData.length;
    this.summary.averageSale       = this.summary.totalTransactions
      ? this.summary.totalSales / this.summary.totalTransactions : 0;

    // Top product (within date range, optionally scoped to customer)
    let topSql: string;
    let topParams: any[];

    if (this.selectedCustomerId !== null) {
      topSql = `
        SELECT m.name, SUM(si.quantity) AS total_qty
        FROM sale_items si
        JOIN batch_items bi ON si.batch_item_id = bi.batch_item_id
        JOIN medicines m    ON bi.product_id    = m.product_id
        JOIN sales s        ON si.sale_id       = s.sale_id
        WHERE s.customer_id = ?
          AND date(s.sale_date) BETWEEN ? AND ?
        GROUP BY m.product_id
        ORDER BY total_qty DESC
        LIMIT 1
      `;
      topParams = [this.selectedCustomerId, this.dateRange.start, this.dateRange.end];
    } else {
      topSql = `
        SELECT m.name, SUM(si.quantity) AS total_qty
        FROM sale_items si
        JOIN batch_items bi ON si.batch_item_id = bi.batch_item_id
        JOIN medicines m    ON bi.product_id    = m.product_id
        JOIN sales s        ON si.sale_id       = s.sale_id
        WHERE date(s.sale_date) BETWEEN ? AND ?
        GROUP BY m.product_id
        ORDER BY total_qty DESC
        LIMIT 1
      `;
      topParams = [this.dateRange.start, this.dateRange.end];
    }

    const topResult = await this.dbRun(topSql, topParams);
    this.summary.topProduct = topResult?.[0]?.name || '—';
  }

  // ── Stock Report ───────────────────────────────────────────────────────────
  async loadStockReport() {
    // Build WHERE clauses dynamically
    const whereClauses: string[] = [];
    const params: any[]          = [];

    if (this.selectedMedicineId !== null) {
      whereClauses.push('m.product_id = ?');
      params.push(this.selectedMedicineId);
    }
    if (this.selectedCompanyId !== null) {
      whereClauses.push('m.company_id = ?');
      params.push(this.selectedCompanyId);
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

   const sql = `
SELECT
  m.product_id,
  m.name,
  m.sale_price,
  m.minimum_threshold,
  COALESCE(SUM(bi.quantity_remaining), 0) AS current_stock,
  MIN(CASE WHEN bi.quantity_remaining > 0 THEN bi.expiry_date END) AS next_expiry,
  CAST(
    julianday(MIN(CASE WHEN bi.quantity_remaining > 0 THEN bi.expiry_date END))
    - julianday(date('now'))
  AS INTEGER) AS days_to_next_expiry,
  CASE
    WHEN COALESCE(SUM(bi.quantity_remaining), 0) = 0 THEN 'Out of Stock'
    WHEN COALESCE(SUM(bi.quantity_remaining), 0) <= COALESCE(m.minimum_threshold, 0) THEN 'Low Stock'
    ELSE 'In Stock'
  END AS stock_status
FROM medicines m
LEFT JOIN batch_items bi ON m.product_id = bi.product_id
${whereSQL}
GROUP BY m.product_id
ORDER BY m.name;
`;

    this.stockData = (await this.dbRun(sql, params)) || [];

    // Build summary from raw data
    this.stockSummary.total      = this.stockData.length;
    this.stockSummary.inStock    = this.stockData.filter(i => i.stock_status === 'In Stock').length;
    this.stockSummary.lowStock   = this.stockData.filter(i => i.stock_status === 'Low Stock').length;
    this.stockSummary.outOfStock = this.stockData.filter(i => i.stock_status === 'Out of Stock').length;

    // Apply client-side status filter
    this.applyStockFilter();
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style:                 'currency',
      currency:              'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatCurrencyRaw(amount: number): string {
    return `PKR ${(amount || 0).toLocaleString()}`;
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getReportTitle(): string {
    return this.reportType === 'sales' ? 'Sales Report' : 'Stock Report';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Out of Stock': return 'status-out';
      case 'Low Stock':    return 'status-low';
      default:             return 'status-good';
    }
  }

  getExpiryClass(days: number | null): string {
    if (days === null || days === undefined) return '';
    if (days <= 0)  return 'expiry-expired';
    if (days <= 30) return 'expiry-critical';
    if (days <= 90) return 'expiry-warning';
    return '';
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  async exportPDF() {
    if (this.isLoading) return;

    const doc   = new jsPDF();
    const title = this.getReportTitle();

    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    if (this.reportType === 'sales') {
      doc.text(`Period: ${this.dateRange.start} to ${this.dateRange.end}`, 14, 30);
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

    let headers: string[] = [];
    let data:    any[][]  = [];

    if (this.reportType === 'sales') {
      headers = ['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Due'];
      data = this.salesData.map(s => [
        `#${s.sale_id}`,
        this.formatDate(s.sale_date),
        s.customer_name || 'Walk-in',
        s.item_count    || 0,
        this.formatCurrencyRaw(s.total_amount),
        this.formatCurrencyRaw(s.paid_amount),
        this.formatCurrencyRaw(s.due_amount)
      ]);
      // Totals row
      data.push([
        '', '', '', 'TOTAL',
        this.formatCurrencyRaw(this.summary.totalSales),
        this.formatCurrencyRaw(this.summary.totalPaid),
        this.formatCurrencyRaw(this.summary.totalDue)
      ]);
    } else {
      headers = ['#', 'Medicine', 'Stock', 'Min', 'Status', 'Next Expiry'];
      data = this.filteredStockData.map((s, i) => [
        i + 1,
        s.name,
        s.current_stock,
        s.minimum_threshold || 0,
        s.stock_status,
        s.next_expiry ? this.formatDate(s.next_expiry) : '—'
      ]);
    }

    autoTable(doc, {
      head:       [headers],
      body:       data,
      startY:     45,
      theme:      'grid',
      styles:     { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234] }
    });

    doc.save(`${title.replace(/\s/g, '_')}_${this.dateRange.start}.pdf`);
    this.showToast('Report exported as PDF');
  }

  // ── Export Excel (CSV) ─────────────────────────────────────────────────────
  async exportExcel() {
    if (this.isLoading) return;

    let rows: any[] = [];

    if (this.reportType === 'sales') {
      rows = this.salesData.map(s => ({
        'Invoice #': s.sale_id,
        'Date':      this.formatDate(s.sale_date),
        'Customer':  s.customer_name || 'Walk-in',
        'Items':     s.item_count    || 0,
        'Total':     s.total_amount,
        'Paid':      s.paid_amount,
        'Due':       s.due_amount
      }));
    } else {
      rows = this.filteredStockData.map(s => ({
        'Medicine':      s.name,
        'Company':       s.company_name  || '—',
        'Category':      s.category_name || '—',
        'Current Stock': s.current_stock,
        'Min Threshold': s.minimum_threshold || 0,
        'Status':        s.stock_status,
        'Next Expiry':   s.next_expiry ? this.formatDate(s.next_expiry) : '—'
      }));
    }

    if (!rows.length) { this.showToast('No data to export', 'error'); return; }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${this.getReportTitle().replace(/\s/g, '_')}_${this.dateRange.start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Report exported as CSV');
  }
}