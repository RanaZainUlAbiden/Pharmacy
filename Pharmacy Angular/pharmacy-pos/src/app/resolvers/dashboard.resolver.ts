import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { DatabaseService } from '../services/database.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardResolver implements Resolve<any> {
  constructor(private db: DatabaseService) {}

  async resolve() {
    console.log('🔄 DashboardResolver is running...');
    
    try {
      // Load all dashboard data in parallel for better performance
      const [
        medicines,
        lowStock,
        dailySales,
        expiring,
        customers,
        recentSales
      ] = await Promise.all([
        this.db.getAllMedicines(),
        this.db.getLowStock(),
        this.db.getDailySales(),
        this.db.getExpiringItems(30),
        this.db.getAllCustomers(),
        this.db.getSalesHistory(5)
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayData = dailySales.find((d: any) => d.sale_day === today);

      console.log('✅ DashboardResolver loaded all data successfully');

      return {
        totalMedicines: medicines.length,
        lowStockCount: lowStock.length,
        todaySales: todayData?.total_sales || 0,
        todayTransactions: todayData?.total_bills || 0,
        expiringCount: expiring.length,
        totalCustomers: customers.length,
        recentSales: recentSales || [],
        lowStockItems: lowStock.slice(0, 5),
        expiringItems: expiring.slice(0, 5),
        timestamp: new Date().getTime() // Force refresh on each navigation
      };
      
    } catch (error) {
      console.error('❌ DashboardResolver error:', error);
      return {
        totalMedicines: 0,
        lowStockCount: 0,
        todaySales: 0,
        todayTransactions: 0,
        expiringCount: 0,
        totalCustomers: 0,
        recentSales: [],
        lowStockItems: [],
        expiringItems: [],
        timestamp: new Date().getTime()
      };
    }
  }
}