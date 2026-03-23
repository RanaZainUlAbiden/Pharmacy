import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
  styleUrls: ['./sales.scss']
})
export class SalesComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;

  // Cart items
  cart: any[] = [];
  cartTotal = 0;
  cartSubtotal = 0;
  cartDiscount = 0;
  cartTax = 0;
  taxRate = 0.17; // 17% tax

  // Customer selection
  customers: any[] = [];
  selectedCustomerId: number | null = null;
  selectedCustomer: any = null;
  showCustomerDropdown = false;
  customerSearchTerm = '';

  // Medicine search
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;

  // Payment
  paymentAmount = 0;
  paymentMethod: 'cash' | 'card' | 'credit' = 'cash';
  change = 0;

  // UI states
  showPaymentDialog = false;
  showSuccessDialog = false;
  currentSale: any = null;
  invoiceNumber = '';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;

  // Busy state
  isBusy = false;

  // Barcode scanning
  barcodeInput = '';
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCustomers();
    this.generateInvoiceNumber();
    // Focus on search input
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
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

  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000);
    this.invoiceNumber = `INV-${year}${month}${day}-${random}`;
  }

  async loadCustomers() {
    try {
      this.customers = await this.dbRun('SELECT * FROM customers ORDER BY full_name');
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  // Search medicines
  async searchMedicines() {
    if (!this.searchQuery.trim() || this.searchQuery.length < 2) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    try {
      const results = await this.dbRun(`
        SELECT m.product_id, m.name, m.sale_price, 
               COALESCE(SUM(bi.quantity_remaining), 0) as current_stock
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id AND bi.quantity_remaining > 0
        WHERE m.name LIKE ? OR m.name LIKE ?
        GROUP BY m.product_id
        HAVING current_stock > 0
        ORDER BY m.name
        LIMIT 10
      `, [`%${this.searchQuery}%`, `${this.searchQuery}%`]);
      
      this.searchResults = results || [];
    } catch (error) {
      console.error('Error searching medicines:', error);
    } finally {
      this.isSearching = false;
    }
  }

  // Add to cart
  async addToCart(medicine: any) {
    // Check stock
    if (medicine.current_stock <= 0) {
      this.showToast('Out of stock!', 'error');
      return;
    }

    // Check if already in cart
    const existing = this.cart.find(item => item.product_id === medicine.product_id);
    
    if (existing) {
      if (existing.quantity + 1 > medicine.current_stock) {
        this.showToast(`Only ${medicine.current_stock} available`, 'error');
        return;
      }
      existing.quantity++;
      existing.total = existing.quantity * existing.price;
    } else {
      this.cart.push({
        product_id: medicine.product_id,
        name: medicine.name,
        price: medicine.sale_price,
        quantity: 1,
        total: medicine.sale_price,
        max_stock: medicine.current_stock
      });
    }

    this.updateCartTotals();
    this.searchQuery = '';
    this.searchResults = [];
    this.showToast(`${medicine.name} added to cart`, 'success');
    
    // Refocus on search
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  // Handle barcode scan
  async onBarcodeScan() {
    if (!this.barcodeInput.trim()) return;
    
    try {
      const medicine = await this.dbRun(`
        SELECT m.product_id, m.name, m.sale_price, 
               COALESCE(SUM(bi.quantity_remaining), 0) as current_stock
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id AND bi.quantity_remaining > 0
        WHERE m.name LIKE ? OR m.product_id = ?
        GROUP BY m.product_id
      `, [`%${this.barcodeInput}%`, this.barcodeInput], 'get');
      
      if (medicine && medicine.current_stock > 0) {
        await this.addToCart(medicine);
      } else {
        this.showToast('Medicine not found or out of stock', 'error');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
    }
    
    this.barcodeInput = '';
  }

  updateCartTotals() {
    this.cartSubtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
    this.cartTax = this.cartSubtotal * this.taxRate;
    this.cartDiscount = 0; // Can add discount functionality later
    this.cartTotal = this.cartSubtotal + this.cartTax - this.cartDiscount;
    
    this.cdr.detectChanges();
  }

  updateQuantity(item: any, change: number) {
    const newQuantity = item.quantity + change;
    if (newQuantity < 1) {
      this.removeFromCart(item);
      return;
    }
    if (newQuantity > item.max_stock) {
      this.showToast(`Only ${item.max_stock} available`, 'error');
      return;
    }
    item.quantity = newQuantity;
    item.total = item.quantity * item.price;
    this.updateCartTotals();
  }

  removeFromCart(item: any) {
    const index = this.cart.indexOf(item);
    if (index > -1) {
      this.cart.splice(index, 1);
      this.updateCartTotals();
    }
  }

  clearCart() {
    if (this.cart.length > 0) {
      this.cart = [];
      this.updateCartTotals();
      this.showToast('Cart cleared', 'success');
    }
  }

  // Customer selection
  selectCustomer(customer: any) {
    this.selectedCustomerId = customer.customer_id;
    this.selectedCustomer = customer;
    this.showCustomerDropdown = false;
    this.customerSearchTerm = '';
  }

  get filteredCustomers() {
    if (!this.customerSearchTerm) return this.customers;
    const term = this.customerSearchTerm.toLowerCase();
    return this.customers.filter(c => 
      c.full_name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term))
    );
  }

  // Payment
  openPaymentDialog() {
    if (this.cart.length === 0) {
      this.showToast('Cart is empty', 'error');
      return;
    }
    
    if (!this.selectedCustomerId) {
      // Use walk-in customer (ID 1)
      this.selectedCustomerId = 1;
      this.selectedCustomer = { customer_id: 1, full_name: 'Walk-in Customer' };
    }
    
    this.paymentAmount = this.cartTotal;
    this.change = 0;
    this.showPaymentDialog = true;
  }

  calculateChange() {
    this.change = Math.max(0, this.paymentAmount - this.cartTotal);
  }

  async processPayment() {
    if (this.paymentAmount < this.cartTotal) {
      this.showToast('Insufficient payment amount', 'error');
      return;
    }

    this.isBusy = true;
    this.showPaymentDialog = false;

    try {
      // Get batch items for each medicine (FIFO - oldest expiry first)
      const saleItems = [];
      
      for (const item of this.cart) {
        // Get available batches for this medicine
        const batches = await this.dbRun(`
          SELECT batch_item_id, quantity_remaining, expiry_date, purchase_price
          FROM batch_items
          WHERE product_id = ? AND quantity_remaining > 0
          ORDER BY expiry_date ASC
        `, [item.product_id]);
        
        let remainingQty = item.quantity;
        
        for (const batch of batches) {
          if (remainingQty <= 0) break;
          
          const qtyToTake = Math.min(remainingQty, batch.quantity_remaining);
          saleItems.push({
            batch_item_id: batch.batch_item_id,
            quantity: qtyToTake,
            price: item.price,
            discount: 0
          });
          
          remainingQty -= qtyToTake;
        }
        
        if (remainingQty > 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }

      // Create sale
      const saleData = {
        customer_id: this.selectedCustomerId,
        total_amount: this.cartTotal,
        paid_amount: this.paymentAmount
      };

      // @ts-ignore
      const saleId = await window.electronAPI.database.createSale(saleData, saleItems);
      
      this.currentSale = {
        id: saleId,
        invoice_number: this.invoiceNumber,
        customer: this.selectedCustomer?.full_name || 'Walk-in Customer',
        date: new Date(),
        items: [...this.cart],
        subtotal: this.cartSubtotal,
        tax: this.cartTax,
        total: this.cartTotal,
        paid: this.paymentAmount,
        change: this.change,
        payment_method: this.paymentMethod
      };
      
      this.showSuccessDialog = true;
      
    } catch (error: any) {
      console.error('Error processing sale:', error);
      this.showToast(error.message || 'Failed to process sale', 'error');
    } finally {
      this.isBusy = false;
      this.cdr.detectChanges();
    }
  }

  // Print receipt
  printReceipt() {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${this.currentSale?.invoice_number}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 300px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .items { width: 100%; margin: 10px 0; }
          .items th, .items td { text-align: left; font-size: 12px; }
          .items td:last-child, .items th:last-child { text-align: right; }
          .totals { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
          .totals p { margin: 3px 0; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pharmacy POS</h1>
          <p>${this.currentSale?.invoice_number}</p>
          <p>${new Date().toLocaleString()}</p>
          <p>Customer: ${this.currentSale?.customer}</p>
        </div>
        
        <table class="items">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${this.currentSale?.items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${this.formatCurrency(item.price)}</td>
                <td>${this.formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p>Subtotal: ${this.formatCurrency(this.currentSale?.subtotal)}</p>
          <p>Tax (17%): ${this.formatCurrency(this.currentSale?.tax)}</p>
          <p><strong>Total: ${this.formatCurrency(this.currentSale?.total)}</strong></p>
          <p>Paid: ${this.formatCurrency(this.currentSale?.paid)}</p>
          <p>Change: ${this.formatCurrency(this.currentSale?.change)}</p>
          <p>Payment: ${this.currentSale?.payment_method.toUpperCase()}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Visit us again</p>
        </div>
      </body>
      </html>
    `);
    
    receiptWindow.document.close();
    receiptWindow.print();
  }

  newSale() {
    this.cart = [];
    this.selectedCustomerId = null;
    this.selectedCustomer = null;
    this.cartTotal = 0;
    this.cartSubtotal = 0;
    this.cartTax = 0;
    this.paymentAmount = 0;
    this.change = 0;
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuccessDialog = false;
    this.currentSale = null;
    this.generateInvoiceNumber();
    
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  // Add this method inside the SalesComponent class
hideCustomerDropdown() {
  setTimeout(() => {
    this.showCustomerDropdown = false;
  }, 200);
}
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }
}