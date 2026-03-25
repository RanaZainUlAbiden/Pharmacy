import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock.html',
  styleUrls: ['./stock.scss']
})
export class StockComponent implements OnInit, OnDestroy {
  // View modes
  viewMode: 'current' | 'low' | 'expiring' | 'history' = 'current';
  selectedMedicine: any = null;
  searchTerm = '';

  // Data
  currentStock: any[] = [];
  lowStockItems: any[] = [];
  expiringItems: any[] = [];
  stockHistory: any[] = [];
  medicineBatches: any[] = [];

  // Loading states
  isLoading = false;
  isBusy = false;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAllStockData();
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

  async loadAllStockData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await Promise.all([
        this.loadCurrentStock(),
        this.loadLowStock(),
        this.loadExpiringItems(),
        this.loadStockHistory()
      ]);
    } catch (error) {
      console.error('Error loading stock data:', error);
      this.showToast('Failed to load stock data', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadCurrentStock() {
    try {
     const result = await this.dbRun(`
  SELECT 
    m.product_id, 
    m.name, 
    m.sale_price, 
    m.minimum_threshold,
    p.packing_name,
    SUM(bi.quantity_remaining) as current_stock,
    COUNT(DISTINCT bi.batch_item_id) as batch_count,
    MIN(bi.expiry_date) as earliest_expiry
  FROM medicines m
  INNER JOIN batch_items bi ON m.product_id = bi.product_id
  LEFT JOIN packing p ON m.packing_id = p.packing_id
  WHERE bi.quantity_remaining > 0
  GROUP BY m.product_id
  ORDER BY m.name
`);
      this.currentStock = result || [];
    } catch (error) {
      console.error('Error loading current stock:', error);
    }
  }

  async loadLowStock() {
    try {
      const result = await this.dbRun(`
        SELECT 
          m.product_id, 
          m.name, 
          m.sale_price, 
          m.minimum_threshold,
          p.packing_name,
          COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
          MIN(bi.expiry_date) as earliest_expiry,
          CASE 
            WHEN COALESCE(SUM(bi.quantity_remaining), 0) = 0 THEN 'Out of Stock'
            WHEN COALESCE(SUM(bi.quantity_remaining), 0) <= (m.minimum_threshold * 0.25) THEN 'Critical'
            ELSE 'Low'
          END as severity
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        LEFT JOIN packing p ON m.packing_id = p.packing_id
        GROUP BY m.product_id
        HAVING current_stock <= m.minimum_threshold
        ORDER BY 
          CASE severity
            WHEN 'Out of Stock' THEN 0
            WHEN 'Critical' THEN 1
            ELSE 2
          END,
          current_stock
      `);
      this.lowStockItems = result || [];
    } catch (error) {
      console.error('Error loading low stock:', error);
    }
  }

  async loadExpiringItems() {
    try {
      const result = await this.dbRun(`
        SELECT 
          bi.batch_item_id,
          m.name as medicine_name,
          bi.expiry_date,
          bi.quantity_remaining,
          bi.purchase_price,
          m.sale_price,
          pb.BatchName as batch_name,
          julianday(bi.expiry_date) - julianday(date('now')) as days_to_expiry
        FROM batch_items bi
        JOIN medicines m ON bi.product_id = m.product_id
        JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
        WHERE bi.quantity_remaining > 0
          AND bi.expiry_date <= date('now', '+90 days')
        ORDER BY bi.expiry_date
      `);
      this.expiringItems = result || [];
    } catch (error) {
      console.error('Error loading expiring items:', error);
    }
  }

  async loadStockHistory() {
    try {
      const result = await this.dbRun(`
        SELECT 
          sl.*,
          m.name as medicine_name,
          bi.expiry_date,
          pb.BatchName as batch_name
        FROM stock_log sl
        JOIN batch_items bi ON sl.batch_id = bi.batch_item_id
        JOIN medicines m ON bi.product_id = m.product_id
        JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
        ORDER BY sl.log_date DESC
        LIMIT 100
      `);
      this.stockHistory = result || [];
    } catch (error) {
      console.error('Error loading stock history:', error);
    }
  }

  async viewMedicineBatches(medicine: any) {
    this.selectedMedicine = medicine;
    this.isBusy = true;
    try {
      const result = await this.dbRun(`
        SELECT 
          bi.*,
          pb.BatchName,
          pb.purchase_date,
          pb.company_id
        FROM batch_items bi
        JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
        WHERE bi.product_id = ?
        ORDER BY bi.expiry_date
      `, [medicine.product_id]);
      this.medicineBatches = result || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      this.isBusy = false;
    }
  }

  closeBatches() {
    this.selectedMedicine = null;
    this.medicineBatches = [];
  }

  goToPurchase() {
    this.router.navigate(['/purchases']);
  }

  goToSales() {
    this.router.navigate(['/sales']);
  }

  getStockStatusClass(stock: number, threshold: number): string {
    if (stock === 0) return 'status-out';
    if (stock <= threshold * 0.25) return 'status-critical';
    if (stock <= threshold) return 'status-low';
    return 'status-good';
  }

  getStockStatusText(stock: number, threshold: number): string {
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold * 0.25) return 'Critical';
    if (stock <= threshold) return 'Low';
    return 'Good';
  }

  daysToExpiry(date: string): number {
    if (!date) return 999;
    const today = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getExpiryClass(days: number): string {
    if (days <= 0) return 'expiry-expired';
    if (days <= 30) return 'expiry-critical';
    if (days <= 60) return 'expiry-warning';
    return 'expiry-good';
  }

  getExpiryText(days: number): string {
    if (days <= 0) return 'Expired';
    if (days <= 30) return 'Expiring Soon';
    if (days <= 60) return 'Near Expiry';
    return 'Good';
  }

  getChangeTypeIcon(type: string): string {
    switch(type) {
      case 'PURCHASE': return 'add_shopping_cart';
      case 'SALE': return 'point_of_sale';
      case 'ADJUSTMENT': return 'edit';
      case 'RETURN': return 'undo';
      case 'EXPIRED': return 'event_busy';
      default: return 'info';
    }
  }

  getChangeTypeClass(type: string): string {
    switch(type) {
      case 'PURCHASE': return 'type-purchase';
      case 'SALE': return 'type-sale';
      case 'ADJUSTMENT': return 'type-adjustment';
      case 'RETURN': return 'type-return';
      case 'EXPIRED': return 'type-expired';
      default: return '';
    }
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

  get filteredCurrentStock() {
    if (!this.searchTerm) return this.currentStock;
    const term = this.searchTerm.toLowerCase();
    return this.currentStock.filter(m =>
      m.name.toLowerCase().includes(term)
    );
  }

  get filteredLowStock() {
    if (!this.searchTerm) return this.lowStockItems;
    const term = this.searchTerm.toLowerCase();
    return this.lowStockItems.filter(m =>
      m.name.toLowerCase().includes(term)
    );
  }

  get filteredExpiring() {
    if (!this.searchTerm) return this.expiringItems;
    const term = this.searchTerm.toLowerCase();
    return this.expiringItems.filter(m =>
      m.medicine_name.toLowerCase().includes(term)
    );
  }

  get filteredHistory() {
    if (!this.searchTerm) return this.stockHistory;
    const term = this.searchTerm.toLowerCase();
    return this.stockHistory.filter(h =>
      h.medicine_name.toLowerCase().includes(term) ||
      (h.batch_name && h.batch_name.toLowerCase().includes(term))
    );
  }
}