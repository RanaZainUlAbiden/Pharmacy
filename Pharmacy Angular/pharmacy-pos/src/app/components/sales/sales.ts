import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesStateService } from '../../services/salesState.service';
import { TaxService } from '../../services/tax.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
  styleUrls: ['./sales.scss']
})
export class SalesComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('quantityInput') quantityInput!: ElementRef;

  // Cart
  cart: any[] = [];
  cartSubtotal = 0;
  cartDiscount = 0;
  cartTax = 0;
  cartTotal = 0;
  taxRate = 0;

  // Product search
  searchQuery = '';
  searchResults: any[] = [];
  selectedIndex = -1;
  isSearching = false;

  // For adding to cart
  selectedProduct: any = null;
  productQuantity = 1;
  showQuantityInput = false;

  // Customer
  customerName = '';
  
  // Payment
  discountPercent = 0;
  paidAmount = 0;
  change = 0;

  // UI states
  showCart = true;
  isProcessing = false;
  showSuccessDialog = false;
  currentSale: any = null;
  invoiceNumber = '';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private salesState: SalesStateService,
    private taxService: TaxService
  ) {}

  ngOnInit() {
    this.generateInvoiceNumber();

    this.taxService.taxRate$.subscribe(rate => {
      this.taxRate = rate;
      this.calculateTax();
    });

    // Restore state
    this.cart = this.salesState.cart;
    this.customerName = this.salesState.customerName;
    this.discountPercent = this.salesState.discountPercent;
    this.paidAmount = this.salesState.paidAmount;

    this.updateCartTotals();

    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 100);
  }

  calculateTax() {
    this.cartTax = (this.cartSubtotal - this.cartDiscount) * (this.taxRate / 100);
    this.cartTotal = this.cartSubtotal - this.cartDiscount + this.cartTax;
    this.calculateChange();
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

  async searchProducts() {
    if (!this.searchQuery.trim() || this.searchQuery.length < 1) {
      this.searchResults = [];
      this.selectedIndex = -1;
      return;
    }

    this.isSearching = true;
    try {
      const results = await this.dbRun(`
        SELECT m.product_id, m.name, m.sale_price, 
               COALESCE(SUM(bi.quantity_remaining), 0) as current_stock
        FROM medicines m
        LEFT JOIN batch_items bi ON m.product_id = bi.product_id AND bi.quantity_remaining > 0
        WHERE m.name LIKE ?
        GROUP BY m.product_id
        HAVING current_stock > 0
        ORDER BY m.name
        LIMIT 10
      `, [`%${this.searchQuery}%`]);
      
      this.searchResults = results || [];
      this.selectedIndex = this.searchResults.length > 0 ? 0 : -1;
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      this.isSearching = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Only handle arrow keys when search input is focused
    if (document.activeElement !== this.searchInput?.nativeElement) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.searchResults.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.searchResults.length;
        this.scrollToSelectedResult();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.searchResults.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.scrollToSelectedResult();
      }
    }
  }

  private scrollToSelectedResult() {
    setTimeout(() => {
      const selectedElement = document.querySelector('.search-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  selectProduct(product: any) {
    if (product.current_stock <= 0) {
      this.showToast('Out of stock!', 'error');
      return;
    }

    this.selectedProduct = product;
    this.productQuantity = 1;
    this.showQuantityInput = true;
    
    // Force change detection and focus quantity input
    this.cdr.detectChanges();
    
    setTimeout(() => {
      if (this.quantityInput) {
        this.quantityInput.nativeElement.focus();
        this.quantityInput.nativeElement.select();
      }
    }, 50);
  }

  onSearchEnter() {
    // When Enter is pressed on search input, select the highlighted product
    if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
      this.selectProduct(this.searchResults[this.selectedIndex]);
    } else if (this.searchResults.length > 0) {
      // If no index selected but results exist, select the first one
      this.selectProduct(this.searchResults[0]);
    }
  }

  onQuantityEnter() {
    // When Enter is pressed on quantity input, add to cart
    this.addToCart();
  }

  addToCart() {
    if (!this.selectedProduct) return;
    
    if (this.productQuantity < 1) {
      this.showToast('Quantity must be at least 1', 'error');
      return;
    }
    
    if (this.productQuantity > this.selectedProduct.current_stock) {
      this.showToast(`Only ${this.selectedProduct.current_stock} available`, 'error');
      return;
    }

    // Check if already in cart
    const existing = this.cart.find(item => item.product_id === this.selectedProduct.product_id);
    
    if (existing) {
      if (existing.quantity + this.productQuantity > this.selectedProduct.current_stock) {
        this.showToast(`Only ${this.selectedProduct.current_stock} available total`, 'error');
        return;
      }
      existing.quantity += this.productQuantity;
      existing.total = existing.quantity * existing.price;
    } else {
      this.cart.push({
        product_id: this.selectedProduct.product_id,
        name: this.selectedProduct.name,
        price: this.selectedProduct.sale_price,
        quantity: this.productQuantity,
        total: this.productQuantity * this.selectedProduct.sale_price,
        max_stock: this.selectedProduct.current_stock
      });
    }

    this.updateCartTotals();
    this.showToast(`${this.selectedProduct.name} added to cart`, 'success');
    
    // Reset and go back to search
    this.selectedProduct = null;
    this.showQuantityInput = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedIndex = -1;
    
    // Force change detection to clear quantity section
    this.cdr.detectChanges();
    
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 50);
  }

  updateCartTotals() {
    this.cartSubtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
    this.cartDiscount = this.cartSubtotal * (this.discountPercent / 100);
    this.cartTax = (this.cartSubtotal - this.cartDiscount) * (this.taxRate / 100);
    this.cartTotal = this.cartSubtotal - this.cartDiscount + this.cartTax;

    this.calculateChange();

    // Save state
    this.salesState.cart = this.cart;
    this.salesState.customerName = this.customerName;
    this.salesState.discountPercent = this.discountPercent;
    this.salesState.paidAmount = this.paidAmount;
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

  onDiscountChange() {
    if (this.discountPercent < 0) this.discountPercent = 0;
    if (this.discountPercent > 100) this.discountPercent = 100;
    this.salesState.discountPercent = this.discountPercent;
    this.updateCartTotals();
  }

  calculateChange() {
    this.change = Math.max(0, this.paidAmount - this.cartTotal);
  }

  async processSale() {
    if (this.cart.length === 0) {
      this.showToast('Cart is empty', 'error');
      return;
    }

    if (this.paidAmount < this.cartTotal) {
      this.showToast('Insufficient payment', 'error');
      return;
    }

    this.isProcessing = true;

    try {
      let customerId = 1;
      
      if (this.customerName.trim()) {
        let existing = await this.dbRun(
          'SELECT customer_id FROM customers WHERE full_name = ?',
          [this.customerName.trim()],
          'get'
        );
        
        if (!existing) {
          const result = await this.dbRun(
            'INSERT INTO customers (full_name, phone, address) VALUES (?, ?, ?)',
            [this.customerName.trim(), '', ''],
            'run'
          );
          customerId = (result as any).lastID;
        } else {
          customerId = existing.customer_id;
        }
      }

      const saleItems = [];
      
      for (const item of this.cart) {
        const batches = await this.dbRun(`
          SELECT batch_item_id, quantity_remaining, expiry_date
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

      const saleData = {
        customer_id: customerId,
        total_amount: this.cartTotal,
        paid_amount: this.paidAmount
      };

      // @ts-ignore
      const saleId = await window.electronAPI.database.createSale(saleData, saleItems);
      
      this.currentSale = {
        id: saleId,
        invoice_number: this.invoiceNumber,
        customer: this.customerName.trim() || 'Walk-in Customer',
        date: new Date(),
        items: [...this.cart],
        subtotal: this.cartSubtotal,
        discount: this.cartDiscount,
        tax: this.cartTax,
        total: this.cartTotal,
        paid: this.paidAmount,
        change: this.change,
        discount_percent: this.discountPercent
      };
      
      this.showSuccessDialog = true;
      this.showToast('Sale completed successfully!');
      
    } catch (error: any) {
      console.error('Error processing sale:', error);
      this.showToast(error.message || 'Failed to process sale', 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  printReceipt() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Pharmacy POS', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(this.currentSale?.invoice_number || '', 105, 28, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 40);
    doc.text(`Customer: ${this.currentSale?.customer}`, 20, 48);
    
    const headers = ['Item', 'Qty', 'Price', 'Total'];
    const data = this.currentSale?.items.map((item: any) => [
      item.name,
      item.quantity,
      `PKR ${item.price}`,
      `PKR ${item.total}`
    ]);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 55,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.text(`Subtotal: PKR ${this.currentSale?.subtotal.toLocaleString()}`, 120, finalY);
    doc.text(`Discount (${this.currentSale?.discount_percent}%): -PKR ${this.currentSale?.discount.toLocaleString()}`, 120, finalY + 7);
    doc.text(`Tax (${this.taxRate}%): PKR ${this.currentSale?.tax.toLocaleString()}`, 120, finalY + 14);
    doc.text(`Total: PKR ${this.currentSale?.total.toLocaleString()}`, 120, finalY + 24);
    doc.text(`Paid: PKR ${this.currentSale?.paid.toLocaleString()}`, 120, finalY + 31);
    doc.text(`Change: PKR ${this.currentSale?.change.toLocaleString()}`, 120, finalY + 38);
    
    doc.text('Thank you for your purchase!', 105, finalY + 50, { align: 'center' });
    
    doc.save(`receipt_${this.currentSale?.invoice_number}.pdf`);
    this.showToast('Receipt printed');
  }

  newSale() {
    this.cart = [];
    this.customerName = '';
    this.discountPercent = 0;
    this.paidAmount = 0;
    this.change = 0;
    this.updateCartTotals();
    this.showSuccessDialog = false;
    this.currentSale = null;
    this.generateInvoiceNumber();
    
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  async saveSaleOnly(showPrint = false) {
    if (this.cart.length === 0) {
      this.showToast('Cart is empty', 'error');
      return;
    }

    if (this.paidAmount < this.cartTotal) {
      this.showToast('Insufficient payment', 'error');
      return;
    }

    this.isProcessing = true;

    try {
      let customerId = 1;

      if (this.customerName.trim()) {
        let existing = await this.dbRun(
          'SELECT customer_id FROM customers WHERE full_name = ?',
          [this.customerName.trim()],
          'get'
        );

        if (!existing) {
          const result = await this.dbRun(
            'INSERT INTO customers (full_name, phone, address) VALUES (?, ?, ?)',
            [this.customerName.trim(), '', ''],
            'run'
          );
          customerId = (result as any).lastID;
        } else {
          customerId = existing.customer_id;
        }
      }

      const saleItems = [];

      for (const item of this.cart) {
        const batches = await this.dbRun(`
          SELECT batch_item_id, quantity_remaining
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
      }

      const saleData = {
        customer_id: customerId,
        total_amount: this.cartTotal,
        paid_amount: this.paidAmount
      };

      // @ts-ignore
      const saleId = await window.electronAPI.database.createSale(saleData, saleItems);

      this.currentSale = {
        id: saleId,
        invoice_number: this.invoiceNumber,
        customer: this.customerName || 'Walk-in Customer',
        date: new Date(),
        items: [...this.cart],
        subtotal: this.cartSubtotal,
        discount: this.cartDiscount,
        tax: this.cartTax,
        total: this.cartTotal,
        paid: this.paidAmount,
        change: this.change,
        discount_percent: this.discountPercent
      };

      this.showToast('Sale saved successfully');

      if (showPrint) {
        this.printReceipt();
      }

      this.newSale();

    } catch (err: any) {
      this.showToast(err.message || 'Error saving sale', 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  saveSale() {
    this.saveSaleOnly(false);
  }

  saveAndPrint() {
    this.saveSaleOnly(true);
  }
}