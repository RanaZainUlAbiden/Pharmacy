import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrls: ['./customers.scss']
})
export class CustomersComponent implements OnInit {
  // View mode: 'list' | 'add' | 'edit' | 'details'
  viewMode: 'list' | 'add' | 'edit' | 'details' = 'list';
  
  // Data
  customers: any[] = [];
  selectedCustomer: any = null;
  searchTerm: string = '';
  
  // Form data for add/edit
  customerForm: any = {
    full_name: '',
    phone: '',
    address: ''
  };
  
  // Customer details with sales history
  customerSales: any[] = [];
  customerPayments: any[] = [];
  totalDue: number = 0;
  
  // Loading states
  loading = {
    customers: false,  // Start false because resolver loads data
    sales: false,
    payments: false
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private db: DatabaseService
  ) {}

  ngOnInit() {
    // Get data from resolver
    this.route.data.subscribe((data: any) => {
      console.log('📦 Received resolver data:', data);
      
      if (data && data.customerData) {
        // Update with resolver data
        this.customers = data.customerData.customers || [];
        this.viewMode = data.customerData.viewMode || 'list';
        this.selectedCustomer = data.customerData.selectedCustomer;
        
        console.log(`✅ Loaded ${this.customers.length} customers in component`);
      }
    });
  }

  // Manual reload method (used after add/edit/delete)
  async reloadCustomers() {
    this.loading.customers = true;
    try {
      this.customers = await this.db.getAllCustomers();
      console.log(`✅ Manually reloaded ${this.customers.length} customers`);
    } catch (error) {
      console.error('Error reloading customers:', error);
    } finally {
      this.loading.customers = false;
    }
  }

  // Search customers
  get filteredCustomers() {
    if (!this.searchTerm) return this.customers;
    
    const term = this.searchTerm.toLowerCase();
    return this.customers.filter(c => 
      c.full_name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  }

  // Switch views
  showAddForm() {
    this.customerForm = {
      full_name: '',
      phone: '',
      address: ''
    };
    this.viewMode = 'add';
  }

  showEditForm(customer: any) {
    this.customerForm = { ...customer };
    this.viewMode = 'edit';
  }

  async showCustomerDetails(customer: any) {
    this.selectedCustomer = customer;
    this.viewMode = 'details';
    
    await Promise.all([
      this.loadCustomerSales(customer.customer_id),
      this.loadCustomerPayments(customer.customer_id)
    ]);
  }

  async loadCustomerSales(customerId: number) {
    this.loading.sales = true;
    try {
      this.customerSales = await this.db.query(
        `SELECT s.*, 
                COUNT(si.sale_item_id) as item_count
         FROM sales s
         LEFT JOIN sale_items si ON s.sale_id = si.sale_id
         WHERE s.customer_id = ?
         GROUP BY s.sale_id
         ORDER BY s.sale_date DESC`,
        [customerId]
      );
      
      this.totalDue = this.customerSales.reduce((sum, sale) => {
        return sum + (sale.total_amount - (sale.paid_amount || 0));
      }, 0);
      
    } catch (error) {
      console.error('Error loading customer sales:', error);
    } finally {
      this.loading.sales = false;
    }
  }

  async loadCustomerPayments(customerId: number) {
    this.loading.payments = true;
    try {
      this.customerPayments = await this.db.query(
        `SELECT cpr.*, s.total_amount, s.sale_date
         FROM customerpricerecord cpr
         JOIN sales s ON cpr.sale_id = s.sale_id
         WHERE cpr.customer_id = ?
         ORDER BY cpr.date DESC`,
        [customerId]
      );
    } catch (error) {
      console.error('Error loading customer payments:', error);
    } finally {
      this.loading.payments = false;
    }
  }

  async addCustomer() {
    if (!this.customerForm.full_name) {
      alert('Customer name is required');
      return;
    }

    try {
      await this.db.addCustomer(this.customerForm);
      await this.reloadCustomers();  // Use manual reload
      this.viewMode = 'list';
      this.customerForm = {
        full_name: '',
        phone: '',
        address: ''
      };
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer');
    }
  }

  async updateCustomer() {
    if (!this.customerForm.full_name) {
      alert('Customer name is required');
      return;
    }

    try {
      await this.db.query(
        'UPDATE customers SET full_name = ?, phone = ?, address = ? WHERE customer_id = ?',
        [this.customerForm.full_name, this.customerForm.phone, this.customerForm.address, this.customerForm.customer_id],
        'run'
      );
      await this.reloadCustomers();  // Use manual reload
      this.viewMode = 'list';
      this.customerForm = {
        full_name: '',
        phone: '',
        address: ''
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    }
  }

  async deleteCustomer(customerId: number) {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await this.db.query('DELETE FROM customers WHERE customer_id = ?', [customerId], 'run');
      await this.reloadCustomers();  // Use manual reload
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  }

  cancelForm() {
    this.viewMode = 'list';
    this.customerForm = {
      full_name: '',
      phone: '',
      address: ''
    };
  }

  goBack() {
    this.viewMode = 'list';
    this.selectedCustomer = null;
    this.customerSales = [];
    this.customerPayments = [];
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

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}