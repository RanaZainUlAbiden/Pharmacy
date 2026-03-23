import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  // Report type
  reportType: 'sales' | 'stock' | 'expiry' | 'customer' = 'sales';
  
  // Date range
  dateRange = {
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };
  
  // Period presets
  periodPreset: 'today' | 'yesterday' | 'week' | 'month' | 'year' = 'today';
  
  // Filters
  selectedMedicineId: number | null = null;
  selectedCustomerId: number | null = null;
  selectedCompanyId: number | null = null;
  
  // Data
  medicines: any[] = [];
  customers: any[] = [];
  companies: any[] = [];
  
  // Report data
  salesData: any[] = [];
  stockData: any[] = [];
  expiryData: any[] = [];
  customerData: any[] = [];
  
  // Summary stats
  summary = {
    totalSales: 0,
    totalTransactions: 0,
    totalItems: 0,
    averageSale: 0,
    topProduct: '',
    topCustomer: ''
  };
  
  // Loading
  isLoading = false;
  
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
    this.loadDropdowns();
    this.loadReport();
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

  async loadDropdowns() {
    try {
      const [medicinesRes, customersRes, companiesRes] = await Promise.all([
        this.dbRun('SELECT product_id, name FROM medicines ORDER BY name'),
        this.dbRun('SELECT customer_id, full_name FROM customers ORDER BY full_name'),
        this.dbRun('SELECT company_id, company_name FROM company ORDER BY company_name')
      ]);
      this.medicines = medicinesRes || [];
      this.customers = customersRes || [];
      this.companies = companiesRes || [];
    } catch (error) {
      console.error('Error loading dropdowns:', error);
    }
  }

  setPeriod(preset: string) {
    this.periodPreset = preset as any;
    const today = new Date();
    const end = new Date();
    
    switch(preset) {
      case 'today':
        this.dateRange.start = today.toISOString().split('T')[0];
        this.dateRange.end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        this.dateRange.start = yesterday.toISOString().split('T')[0];
        this.dateRange.end = yesterday.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        this.dateRange.start = weekStart.toISOString().split('T')[0];
        this.dateRange.end = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(1);
        this.dateRange.start = monthStart.toISOString().split('T')[0];
        this.dateRange.end = today.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        this.dateRange.start = yearStart.toISOString().split('T')[0];
        this.dateRange.end = today.toISOString().split('T')[0];
        break;
    }
    this.loadReport();
  }

  async loadReport() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      switch(this.reportType) {
        case 'sales':
          await this.loadSalesReport();
          break;
        case 'stock':
          await this.loadStockReport();
          break;
        case 'expiry':
          await this.loadExpiryReport();
          break;
        case 'customer':
          await this.loadCustomerReport();
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
      this.showToast('Failed to load report', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadSalesReport() {
    let sql = `
      SELECT 
        s.sale_id,
        s.sale_date,
        c.full_name as customer_name,
        COUNT(si.sale_item_id) as item_count,
        s.total_amount,
        s.paid_amount,
        (s.total_amount - s.paid_amount) as due_amount
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN sale_items si ON s.sale_id = si.sale_id
      WHERE date(s.sale_date) BETWEEN ? AND ?
      GROUP BY s.sale_id
      ORDER BY s.sale_date DESC
    `;
    
    let params: any[] = [this.dateRange.start, this.dateRange.end];
    
    if (this.selectedCustomerId) {
      sql = sql.replace('WHERE', 'WHERE s.customer_id = ? AND');
      params = [this.selectedCustomerId, this.dateRange.start, this.dateRange.end];
    }
    
    this.salesData = await this.dbRun(sql, params);
    
    // Calculate summary
    this.summary.totalSales = this.salesData.reduce((sum, s) => sum + s.total_amount, 0);
    this.summary.totalTransactions = this.salesData.length;
    this.summary.averageSale = this.summary.totalTransactions ? 
      this.summary.totalSales / this.summary.totalTransactions : 0;
    
    // Get top product
    const topProductSql = `
      SELECT m.name, SUM(si.quantity) as total_qty
      FROM sale_items si
      JOIN batch_items bi ON si.batch_item_id = bi.batch_item_id
      JOIN medicines m ON bi.product_id = m.product_id
      JOIN sales s ON si.sale_id = s.sale_id
      WHERE date(s.sale_date) BETWEEN ? AND ?
      GROUP BY m.product_id
      ORDER BY total_qty DESC
      LIMIT 1
    `;
    const topProduct = await this.dbRun(topProductSql, [this.dateRange.start, this.dateRange.end]);
    this.summary.topProduct = topProduct[0]?.name || '—';
  }

  async loadStockReport() {
    this.stockData = await this.dbRun(`
      SELECT 
        m.product_id,
        m.name,
        c.company_name,
        cat.category_name,
        m.sale_price,
        m.minimum_threshold,
        COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
        COUNT(DISTINCT bi.batch_item_id) as batch_count,
        MIN(bi.expiry_date) as next_expiry,
        CASE 
          WHEN COALESCE(SUM(bi.quantity_remaining), 0) = 0 THEN 'Out of Stock'
          WHEN COALESCE(SUM(bi.quantity_remaining), 0) <= m.minimum_threshold THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status
      FROM medicines m
      LEFT JOIN batch_items bi ON m.product_id = bi.product_id
      LEFT JOIN company c ON m.company_id = c.company_id
      LEFT JOIN categories cat ON m.category_id = cat.category_id
      GROUP BY m.product_id
      ORDER BY 
        CASE 
          WHEN current_stock = 0 THEN 0
          WHEN current_stock <= m.minimum_threshold THEN 1
          ELSE 2
        END,
        m.name
    `);
  }

  async loadExpiryReport() {
    this.expiryData = await this.dbRun(`
      SELECT 
        m.name as medicine_name,
        c.company_name,
        bi.expiry_date,
        bi.quantity_remaining,
        bi.purchase_price,
        m.sale_price,
        pb.BatchName,
        julianday(bi.expiry_date) - julianday(date('now')) as days_to_expiry
      FROM batch_items bi
      JOIN medicines m ON bi.product_id = m.product_id
      JOIN company c ON m.company_id = c.company_id
      JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
      WHERE bi.quantity_remaining > 0
        AND bi.expiry_date <= date('now', '+90 days')
      ORDER BY bi.expiry_date
    `);
  }

  async loadCustomerReport() {
    this.customerData = await this.dbRun(`
      SELECT 
        c.customer_id,
        c.full_name,
        c.phone,
        c.address,
        COUNT(DISTINCT s.sale_id) as total_purchases,
        COALESCE(SUM(s.total_amount), 0) as total_spent,
        COALESCE(SUM(s.paid_amount), 0) as total_paid,
        COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_due,
        MAX(s.sale_date) as last_purchase
      FROM customers c
      LEFT JOIN sales s ON c.customer_id = s.customer_id
      GROUP BY c.customer_id
      ORDER BY total_spent DESC
    `);
  }

  // Export functions
  async exportPDF() {
    const doc = new jsPDF();
    const title = this.getReportTitle();
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${this.dateRange.start} to ${this.dateRange.end}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    
    let data: any[][] = [];
    let headers: string[] = [];
    
    switch(this.reportType) {
      case 'sales':
        headers = ['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Due'];
        data = this.salesData.map(s => [
          `#${s.sale_id}`,
          this.formatDate(s.sale_date),
          s.customer_name || 'Walk-in',
          s.item_count,
          this.formatCurrencyRaw(s.total_amount),
          this.formatCurrencyRaw(s.paid_amount),
          this.formatCurrencyRaw(s.due_amount)
        ]);
        break;
      case 'stock':
        headers = ['Medicine', 'Company', 'Category', 'Stock', 'Batch Count', 'Status', 'Next Expiry'];
        data = this.stockData.map(s => [
          s.name,
          s.company_name || '—',
          s.category_name || '—',
          s.current_stock,
          s.batch_count,
          s.stock_status,
          this.formatDate(s.next_expiry)
        ]);
        break;
      case 'expiry':
        headers = ['Medicine', 'Batch', 'Company', 'Expiry Date', 'Days Left', 'Quantity'];
        data = this.expiryData.map(e => [
          e.medicine_name,
          e.BatchName,
          e.company_name,
          this.formatDate(e.expiry_date),
          e.days_to_expiry,
          e.quantity_remaining
        ]);
        break;
      case 'customer':
        headers = ['Customer', 'Phone', 'Purchases', 'Total Spent', 'Due Amount', 'Last Purchase'];
        data = this.customerData.map(c => [
          c.full_name,
          c.phone || '—',
          c.total_purchases,
          this.formatCurrencyRaw(c.total_spent),
          this.formatCurrencyRaw(c.total_due),
          this.formatDate(c.last_purchase)
        ]);
        break;
    }
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234] }
    });
    
    doc.save(`${this.getReportTitle().replace(/\s/g, '_')}.pdf`);
    this.showToast('Report exported as PDF');
  }

  async exportExcel() {
    let data: any[] = [];
    
    switch(this.reportType) {
      case 'sales':
        data = this.salesData.map(s => ({
          'Invoice #': s.sale_id,
          'Date': this.formatDate(s.sale_date),
          'Customer': s.customer_name || 'Walk-in',
          'Items': s.item_count,
          'Total': s.total_amount,
          'Paid': s.paid_amount,
          'Due': s.due_amount
        }));
        break;
      case 'stock':
        data = this.stockData.map(s => ({
          'Medicine': s.name,
          'Company': s.company_name || '—',
          'Category': s.category_name || '—',
          'Current Stock': s.current_stock,
          'Min Threshold': s.minimum_threshold,
          'Status': s.stock_status,
          'Next Expiry': this.formatDate(s.next_expiry)
        }));
        break;
      case 'expiry':
        data = this.expiryData.map(e => ({
          'Medicine': e.medicine_name,
          'Batch': e.BatchName,
          'Company': e.company_name,
          'Expiry Date': this.formatDate(e.expiry_date),
          'Days Left': e.days_to_expiry,
          'Quantity': e.quantity_remaining,
          'Purchase Price': e.purchase_price,
          'Sale Price': e.sale_price
        }));
        break;
      case 'customer':
        data = this.customerData.map(c => ({
          'Customer': c.full_name,
          'Phone': c.phone || '—',
          'Address': c.address || '—',
          'Total Purchases': c.total_purchases,
          'Total Spent': c.total_spent,
          'Total Paid': c.total_paid,
          'Due Amount': c.total_due,
          'Last Purchase': this.formatDate(c.last_purchase)
        }));
        break;
    }
    
    // Create CSV
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.getReportTitle().replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Report exported as CSV');
  }

  getReportTitle(): string {
    switch(this.reportType) {
      case 'sales': return 'Sales Report';
      case 'stock': return 'Stock Report';
      case 'expiry': return 'Expiry Report';
      case 'customer': return 'Customer Report';
      default: return 'Report';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatCurrencyRaw(amount: number): string {
    return `PKR ${(amount || 0).toLocaleString()}`;
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Out of Stock': return 'status-out';
      case 'Low Stock': return 'status-low';
      default: return 'status-good';
    }
  }

  getExpiryClass(days: number): string {
    if (days <= 0) return 'expiry-expired';
    if (days <= 30) return 'expiry-critical';
    if (days <= 60) return 'expiry-warning';
    return 'expiry-good';
  }
}