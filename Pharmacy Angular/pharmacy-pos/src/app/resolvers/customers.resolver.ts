import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { DatabaseService } from '../services/database.service';

@Injectable({
  providedIn: 'root'
})
export class CustomersResolver implements Resolve<any> {
  constructor(private db: DatabaseService) {}

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.log('🔄 CustomersResolver is running...');
    
    try {
      const customers = await this.db.getAllCustomers();
      console.log(`✅ Resolver loaded ${customers.length} customers`);
      
      return {
        customers: customers,
        viewMode: 'list',
        selectedCustomer: null,
        timestamp: new Date().getTime() // Add timestamp to force refresh
      };
    } catch (error) {
      console.error('❌ Resolver error:', error);
      return {
        customers: [],
        viewMode: 'list',
        selectedCustomer: null,
        timestamp: new Date().getTime()
      };
    }
  }
}