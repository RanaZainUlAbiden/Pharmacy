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

  // Pagination variables for each view
  currentPage = 1;
  lowStockPage = 1;
  expiringPage = 1;
  historyPage = 1;
  pageSize = 100;
  
  totalCurrentItems = 0;
  totalLowStockItems = 0;
  totalExpiringItems = 0;
  totalHistoryItems = 0;
  
  totalCurrentPages = 0;
  totalLowStockPages = 0;
  totalExpiringPages = 0;
  totalHistoryPages = 0;

  // Loading states
  isLoading = false;
  isBusy = false;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  // Add this at the top with other variables
countsLoaded = false;
  // Debounce timer for search
  private searchTimeout: any = null;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
  this.loadAllCounts();  // Load counts first
  this.loadDataByViewMode();  // Then load current view data
}

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
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

  // ==================== LOAD DATA BASED ON VIEW MODE ====================
  async loadDataByViewMode() {
    switch(this.viewMode) {
      case 'current':
        await this.loadCurrentStock();
        break;
      case 'low':
        await this.loadLowStock();
        break;
      case 'expiring':
        await this.loadExpiringItems();
        break;
      case 'history':
        await this.loadStockHistory();
        break;
    }
  }

  onViewModeChange() {
    this.currentPage = 1;
    this.lowStockPage = 1;
    this.expiringPage = 1;
    this.historyPage = 1;
    this.searchTerm = '';
    this.loadDataByViewMode();
  }

  // ==================== CURRENT STOCK WITH PAGINATION ====================
  async loadCurrentStock(resetPage: boolean = true) {
    if (this.isDestroyed) return;
    
    if (resetPage) {
      this.currentPage = 1;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      let countSql = `
        SELECT COUNT(DISTINCT m.product_id) as total
        FROM medicines m
        INNER JOIN batch_items bi ON m.product_id = bi.product_id
        WHERE bi.quantity_remaining > 0
      `;
      
      let dataSql = `
        SELECT 
          m.product_id, 
          m.name, 
          m.sale_price, 
          m.minimum_threshold,
          p.packing_name,
          COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
          COUNT(DISTINCT bi.batch_item_id) as batch_count,
          MIN(bi.expiry_date) as earliest_expiry
        FROM medicines m
        INNER JOIN batch_items bi ON m.product_id = bi.product_id
        LEFT JOIN packing p ON m.packing_id = p.packing_id
        WHERE bi.quantity_remaining > 0
        GROUP BY m.product_id
        ORDER BY m.name
        LIMIT ? OFFSET ?
      `;
      let params: any[] = [];
      
      // Apply search if exists
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const term = `%${this.searchTerm.trim()}%`;
        countSql = `
          SELECT COUNT(DISTINCT m.product_id) as total
          FROM medicines m
          INNER JOIN batch_items bi ON m.product_id = bi.product_id
          WHERE bi.quantity_remaining > 0 AND m.name LIKE ?
        `;
        dataSql = `
          SELECT 
            m.product_id, 
            m.name, 
            m.sale_price, 
            m.minimum_threshold,
            p.packing_name,
            COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
            COUNT(DISTINCT bi.batch_item_id) as batch_count,
            MIN(bi.expiry_date) as earliest_expiry
          FROM medicines m
          INNER JOIN batch_items bi ON m.product_id = bi.product_id
          LEFT JOIN packing p ON m.packing_id = p.packing_id
          WHERE bi.quantity_remaining > 0 AND m.name LIKE ?
          GROUP BY m.product_id
          ORDER BY m.name
          LIMIT ? OFFSET ?
        `;
        params = [term, this.pageSize, (this.currentPage - 1) * this.pageSize];
      } else {
        params = [this.pageSize, (this.currentPage - 1) * this.pageSize];
      }
      
      const countResult = await this.dbRun(countSql, params.slice(0, params.length - 2));
      this.totalCurrentItems = countResult[0]?.total || 0;
      this.totalCurrentPages = Math.ceil(this.totalCurrentItems / this.pageSize);
      
      const result = await this.dbRun(dataSql, params);
      this.currentStock = result || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading current stock:', error);
      this.showToast('Failed to load stock data', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== LOW STOCK WITH PAGINATION ====================
  async loadLowStock(resetPage: boolean = true) {
    if (this.isDestroyed) return;
    
    if (resetPage) {
      this.lowStockPage = 1;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      let countSql = `
        SELECT COUNT(*) as total FROM (
          SELECT m.product_id
          FROM medicines m
          LEFT JOIN batch_items bi ON m.product_id = bi.product_id
          GROUP BY m.product_id
          HAVING COALESCE(SUM(bi.quantity_remaining), 0) <= m.minimum_threshold
        )
      `;
      
      let dataSql = `
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
        LIMIT ? OFFSET ?
      `;
      
      const countResult = await this.dbRun(countSql);
      this.totalLowStockItems = countResult[0]?.total || 0;
      this.totalLowStockPages = Math.ceil(this.totalLowStockItems / this.pageSize);
      
      const offset = (this.lowStockPage - 1) * this.pageSize;
      const result = await this.dbRun(dataSql, [this.pageSize, offset]);
      this.lowStockItems = result || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading low stock:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== EXPIRING ITEMS WITH PAGINATION ====================
  async loadExpiringItems(resetPage: boolean = true) {
    if (this.isDestroyed) return;
    
    if (resetPage) {
      this.expiringPage = 1;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const countSql = `
        SELECT COUNT(*) as total
        FROM batch_items bi
        WHERE bi.quantity_remaining > 0
          AND bi.expiry_date <= date('now', '+90 days')
      `;
      
      const dataSql = `
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
        LIMIT ? OFFSET ?
      `;
      
      const countResult = await this.dbRun(countSql);
      this.totalExpiringItems = countResult[0]?.total || 0;
      this.totalExpiringPages = Math.ceil(this.totalExpiringItems / this.pageSize);
      
      const offset = (this.expiringPage - 1) * this.pageSize;
      const result = await this.dbRun(dataSql, [this.pageSize, offset]);
      this.expiringItems = result || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading expiring items:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== STOCK HISTORY WITH PAGINATION ====================
  async loadStockHistory(resetPage: boolean = true) {
    if (this.isDestroyed) return;
    
    if (resetPage) {
      this.historyPage = 1;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const countSql = `SELECT COUNT(*) as total FROM stock_log`;
      
      const dataSql = `
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
        LIMIT ? OFFSET ?
      `;
      
      const countResult = await this.dbRun(countSql);
      this.totalHistoryItems = countResult[0]?.total || 0;
      this.totalHistoryPages = Math.ceil(this.totalHistoryItems / this.pageSize);
      
      const offset = (this.historyPage - 1) * this.pageSize;
      const result = await this.dbRun(dataSql, [this.pageSize, offset]);
      this.stockHistory = result || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading stock history:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==================== SEARCH WITH DEBOUNCE ====================
  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(() => {
      this.loadDataByViewMode();
    }, 300);
  }

  // ==================== PAGINATION METHODS ====================
  goToPage(page: number) {
    if (this.viewMode === 'current') {
      if (page < 1 || page > this.totalCurrentPages) return;
      this.currentPage = page;
      this.loadCurrentStock(false);
    } else if (this.viewMode === 'low') {
      if (page < 1 || page > this.totalLowStockPages) return;
      this.lowStockPage = page;
      this.loadLowStock(false);
    } else if (this.viewMode === 'expiring') {
      if (page < 1 || page > this.totalExpiringPages) return;
      this.expiringPage = page;
      this.loadExpiringItems(false);
    } else if (this.viewMode === 'history') {
      if (page < 1 || page > this.totalHistoryPages) return;
      this.historyPage = page;
      this.loadStockHistory(false);
    }
  }

  nextPage() {
    if (this.viewMode === 'current') {
      if (this.currentPage < this.totalCurrentPages) {
        this.goToPage(this.currentPage + 1);
      }
    } else if (this.viewMode === 'low') {
      if (this.lowStockPage < this.totalLowStockPages) {
        this.goToPage(this.lowStockPage + 1);
      }
    } else if (this.viewMode === 'expiring') {
      if (this.expiringPage < this.totalExpiringPages) {
        this.goToPage(this.expiringPage + 1);
      }
    } else if (this.viewMode === 'history') {
      if (this.historyPage < this.totalHistoryPages) {
        this.goToPage(this.historyPage + 1);
      }
    }
  }

  prevPage() {
    if (this.viewMode === 'current') {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    } else if (this.viewMode === 'low') {
      if (this.lowStockPage > 1) {
        this.goToPage(this.lowStockPage - 1);
      }
    } else if (this.viewMode === 'expiring') {
      if (this.expiringPage > 1) {
        this.goToPage(this.expiringPage - 1);
      }
    } else if (this.viewMode === 'history') {
      if (this.historyPage > 1) {
        this.goToPage(this.historyPage - 1);
      }
    }
  }

  // ==================== BATCH METHODS ====================
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

  // ==================== NAVIGATION ====================
  goToPurchase() {
    this.router.navigate(['/purchases']);
  }

  goToSales() {
    this.router.navigate(['/sales']);
  }

  // ==================== HELPER METHODS ====================
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

  // ==================== GETTERS FOR FILTERED DATA ====================
  get filteredCurrentStock() {
    return this.currentStock;
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

  // Add this method to load all counts on initialization
async loadAllCounts() {
  try {
    // Get total medicines with stock
    const currentCount = await this.dbRun(`
      SELECT COUNT(DISTINCT m.product_id) as total
      FROM medicines m
      INNER JOIN batch_items bi ON m.product_id = bi.product_id
      WHERE bi.quantity_remaining > 0
    `);
    this.totalCurrentItems = currentCount[0]?.total || 0;
    this.totalCurrentPages = Math.ceil(this.totalCurrentItems / this.pageSize);
    
    // Get low stock count
    const lowCount = await this.dbRun(`
      SELECT COUNT(*) as total FROM (
        SELECT m.product_id
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id
        GROUP BY m.product_id
        HAVING COALESCE(SUM(bi.quantity_remaining), 0) <= m.minimum_threshold
      )
    `);
    this.totalLowStockItems = lowCount[0]?.total || 0;
    this.totalLowStockPages = Math.ceil(this.totalLowStockItems / this.pageSize);
    
    // Get expiring items count
    const expiringCount = await this.dbRun(`
      SELECT COUNT(*) as total
      FROM batch_items bi
      WHERE bi.quantity_remaining > 0
        AND bi.expiry_date <= date('now', '+90 days')
    `);
    this.totalExpiringItems = expiringCount[0]?.total || 0;
    this.totalExpiringPages = Math.ceil(this.totalExpiringItems / this.pageSize);
    
    // Get stock history count
    const historyCount = await this.dbRun(`SELECT COUNT(*) as total FROM stock_log`);
    this.totalHistoryItems = historyCount[0]?.total || 0;
    this.totalHistoryPages = Math.ceil(this.totalHistoryItems / this.pageSize);
    
    this.cdr.detectChanges();
  } catch (error) {
    console.error('Error loading counts:', error);
  }
}
  // ==================== GETTERS FOR PAGINATION VALUES ====================
  get currentTotalPages() {
    switch(this.viewMode) {
      case 'current': return this.totalCurrentPages;
      case 'low': return this.totalLowStockPages;
      case 'expiring': return this.totalExpiringPages;
      case 'history': return this.totalHistoryPages;
      default: return 0;
    }
  }

  get currentPageNumber() {
    switch(this.viewMode) {
      case 'current': return this.currentPage;
      case 'low': return this.lowStockPage;
      case 'expiring': return this.expiringPage;
      case 'history': return this.historyPage;
      default: return 1;
    }
  }

  get currentTotalItems() {
    switch(this.viewMode) {
      case 'current': return this.totalCurrentItems;
      case 'low': return this.totalLowStockItems;
      case 'expiring': return this.totalExpiringItems;
      case 'history': return this.totalHistoryItems;
      default: return 0;
    }
  }
}


