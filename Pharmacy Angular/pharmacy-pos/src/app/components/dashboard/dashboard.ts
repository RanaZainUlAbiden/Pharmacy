import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  // Stats
  totalMedicines: number = 0;
  lowStockCount: number = 0;
  todaySales: number = 0;
  expiringCount: number = 0;
  totalCustomers: number = 0;
  todayTransactions: number = 0;
  
  // Data
  recentSales: any[] = [];
  lowStockItems: any[] = [];
  expiringItems: any[] = [];
  
  // Loading states (start false because resolver loads data)
  loading = {
    stats: false,
    recentSales: false,
    lowStock: false,
    expiring: false
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private db: DatabaseService
  ) {}

  ngOnInit() {
    // Get data from resolver
    this.route.data.subscribe((data: any) => {
      console.log('📦 Dashboard received resolver data:', data);
      
      if (data && data.dashboardData) {
        const dashboardData = data.dashboardData;
        
        // Update all stats
        this.totalMedicines = dashboardData.totalMedicines || 0;
        this.lowStockCount = dashboardData.lowStockCount || 0;
        this.todaySales = dashboardData.todaySales || 0;
        this.todayTransactions = dashboardData.todayTransactions || 0;
        this.expiringCount = dashboardData.expiringCount || 0;
        this.totalCustomers = dashboardData.totalCustomers || 0;
        
        // Update data
        this.recentSales = dashboardData.recentSales || [];
        this.lowStockItems = dashboardData.lowStockItems || [];
        this.expiringItems = dashboardData.expiringItems || [];
        
        console.log('✅ Dashboard updated with resolver data');
      }
    });
  }

  // Manual reload method (if needed)
  async reloadDashboard() {
    this.loading.stats = true;
    this.loading.recentSales = true;
    this.loading.lowStock = true;
    this.loading.expiring = true;
    
    try {
      const [medicines, lowStock, dailySales, expiring, customers, recentSales] = await Promise.all([
        this.db.getAllMedicines(),
        this.db.getLowStock(),
        this.db.getDailySales(),
        this.db.getExpiringItems(30),
        this.db.getAllCustomers(),
        this.db.getSalesHistory(5)
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayData = dailySales.find((d: any) => d.sale_day === today);

      this.totalMedicines = medicines.length;
      this.lowStockCount = lowStock.length;
      this.todaySales = todayData?.total_sales || 0;
      this.todayTransactions = todayData?.total_bills || 0;
      this.expiringCount = expiring.length;
      this.totalCustomers = customers.length;
      this.recentSales = recentSales || [];
      this.lowStockItems = lowStock.slice(0, 5);
      this.expiringItems = expiring.slice(0, 5);
      
      console.log('✅ Dashboard manually reloaded');
    } catch (error) {
      console.error('Error reloading dashboard:', error);
    } finally {
      this.loading.stats = false;
      this.loading.recentSales = false;
      this.loading.lowStock = false;
      this.loading.expiring = false;
    }
  }

  // Navigation methods
  goToSales() {
    this.router.navigate(['/sales']);
  }

  goToMedicines() {
    this.router.navigate(['/medicines']);
  }

  goToReorder() {
    this.router.navigate(['/reorder']);
  }

  goToReports() {
    this.router.navigate(['/reports']);
  }

  goToLowStock() {
    this.router.navigate(['/medicines'], { queryParams: { filter: 'lowstock' } });
  }

  goToExpiring() {
    this.router.navigate(['/medicines'], { queryParams: { filter: 'expiring' } });
  }

  viewSale(saleId: number) {
    this.router.navigate(['/sales', saleId]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getStockStatusClass(status: string): string {
    switch(status) {
      case 'OUT_OF_STOCK': return 'status-critical';
      case 'CRITICAL': return 'status-critical';
      case 'LOW': return 'status-warning';
      default: return 'status-good';
    }
  }
}