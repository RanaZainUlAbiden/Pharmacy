import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  taxRate = 0.17; // 17%

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.generateInvoiceNumber();
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

  // Keyboard navigation
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // If quantity input is visible, only handle Enter to add to cart
    if (this.showQuantityInput) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.addToCart();
      }
      return;
    }

    // Handle arrow keys and Right Shift for search
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
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      // Right Shift (ArrowRight) selects the highlighted product
      if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
        this.selectProduct(this.searchResults[this.selectedIndex]);
      } else if (this.searchResults.length > 0) {
        this.selectProduct(this.searchResults[0]);
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
    
    // Clear search results and query
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedIndex = -1;
    
    this.cdr.detectChanges();
    
    // Focus on quantity input
    setTimeout(() => {
      if (this.quantityInput) {
        this.quantityInput.nativeElement.focus();
        this.quantityInput.nativeElement.select();
      }
    }, 50);
  }

  addToCart() {
    if (!this.selectedProduct) return;
    
    if (this.productQuantity < 1) {
      this.showToast('Quantity must be at least 1', 'error');
      // Keep quantity input focused
      setTimeout(() => {
        if (this.quantityInput) {
          this.quantityInput.nativeElement.focus();
          this.quantityInput.nativeElement.select();
        }
      }, 50);
      return;
    }
    
    if (this.productQuantity > this.selectedProduct.current_stock) {
      this.showToast(`Only ${this.selectedProduct.current_stock} available`, 'error');
      setTimeout(() => {
        if (this.quantityInput) {
          this.quantityInput.nativeElement.focus();
          this.quantityInput.nativeElement.select();
        }
      }, 50);
      return;
    }

    // Check if already in cart
    const existing = this.cart.find(item => item.product_id === this.selectedProduct.product_id);
    
    if (existing) {
      if (existing.quantity + this.productQuantity > this.selectedProduct.current_stock) {
        this.showToast(`Only ${this.selectedProduct.current_stock} available total`, 'error');
        setTimeout(() => {
          if (this.quantityInput) {
            this.quantityInput.nativeElement.focus();
            this.quantityInput.nativeElement.select();
          }
        }, 50);
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
    
    // Reset product selection and go back to search
    this.selectedProduct = null;
    this.showQuantityInput = false;
    this.productQuantity = 1;
    
    // Force change detection
    this.cdr.detectChanges();
    
    // Focus back on search input
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 50);
  }

  updateCartTotals() {
    this.cartSubtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
    this.cartDiscount = this.cartSubtotal * (this.discountPercent / 100);
    this.cartTax = (this.cartSubtotal - this.cartDiscount) * this.taxRate;
    this.cartTotal = this.cartSubtotal - this.cartDiscount + this.cartTax;
    this.calculateChange();
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
    this.updateCartTotals();
  }

  calculateChange() {
    this.change = Math.max(0, this.paidAmount - this.cartTotal);
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
        customer: this.customerName.trim() || 'Walk-in Customer',
        date: new Date(),
        items: [...this.cart],
        subtotal: this.cartSubtotal,
        discount: this.cartDiscount,
        tax: this.cartTax,
        total: this.cartTotal,
        paid: this.paidAmount,
        change: this.change,
        discount_percent: this.discountPercent,
        payment_method: 'Cash'
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

 printReceipt() {
  // Create a small receipt format for thermal printer (80mm width)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200], // 80mm width, auto height
    orientation: 'portrait'
  });
  
  const pageWidth = 80;
  const margin = 5;
  let yPos = 8;
  
  // ============ HEADER SECTION ============
  // Store Name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMACY POS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  // Store Address
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Main Street, Lahore', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Phone: 0300-1234567', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  // Divider Line
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  // ============ INVOICE DETAILS ============
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SALE RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Inv No: ${this.currentSale?.invoice_number}`, margin, yPos);
  yPos += 4;
  doc.text(`Date: ${new Date().toLocaleString()}`, margin, yPos);
  yPos += 4;
  doc.text(`Customer: ${this.currentSale?.customer || 'Walk-in'}`, margin, yPos);
  yPos += 4;
  
  const user = localStorage.getItem('currentUser');
  const cashier = user ? JSON.parse(user).username : 'Admin';
  doc.text(`Cashier: ${cashier}`, margin, yPos);
  yPos += 6;
  
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  // ============ ITEMS TABLE ============
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', margin, yPos);
  doc.text('Qty', pageWidth - 40, yPos);
  doc.text('Price', pageWidth - 25, yPos);
  doc.text('Total', pageWidth - 12, yPos);
  yPos += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  // Table Rows
  for (const item of this.currentSale?.items || []) {
    // Item name (truncate for thermal printer)
    let itemName = item.name;
    if (itemName.length > 20) {
      itemName = itemName.substring(0, 18) + '..';
    }
    doc.text(itemName, margin, yPos);
    doc.text(item.quantity.toString(), pageWidth - 40, yPos);
    doc.text(`${item.price}`, pageWidth - 25, yPos);
    doc.text(`${item.total}`, pageWidth - 12, yPos);
    yPos += 5;
    
    // Add extra space for long names
    if (itemName.length > 15) {
      yPos += 2;
    }
  }
  
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  // ============ TOTALS SECTION ============
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  doc.text('Subtotal:', pageWidth - 30, yPos);
  doc.text(`${this.currentSale?.subtotal.toLocaleString()}`, pageWidth - 8, yPos);
  yPos += 5;
  
  if (this.currentSale?.discount_percent > 0) {
    doc.text(`Discount (${this.currentSale?.discount_percent}%):`, pageWidth - 30, yPos);
    doc.text(`-${this.currentSale?.discount.toLocaleString()}`, pageWidth - 8, yPos);
    yPos += 5;
  }
  
  doc.text(`Tax (17%):`, pageWidth - 30, yPos);
  doc.text(`${this.currentSale?.tax.toLocaleString()}`, pageWidth - 8, yPos);
  yPos += 5;
  
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', pageWidth - 30, yPos);
  doc.text(`${this.currentSale?.total.toLocaleString()}`, pageWidth - 8, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Paid: ${this.currentSale?.paid.toLocaleString()}`, pageWidth - 30, yPos);
  yPos += 4;
  doc.text(`Change: ${this.currentSale?.change.toLocaleString()}`, pageWidth - 30, yPos);
  yPos += 4;
  doc.text(`Payment: ${this.currentSale?.payment_method || 'Cash'}`, pageWidth - 30, yPos);
  yPos += 8;
  
  // ============ FOOTER ============
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('THANK YOU!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Visit Again', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('GST: 12-345678-9', pageWidth / 2, yPos, { align: 'center' });
  
  // ============ OPEN PREVIEW WINDOW WITH PRINT BUTTON ============
  // Get PDF as data URL
  const pdfData = doc.output('dataurlstring');
  
  // Create a new window with preview
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${this.currentSale?.invoice_number}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #f0f0f0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: monospace;
            }
            .container {
              background: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              border-radius: 8px;
              padding: 20px;
              margin: 20px;
            }
            iframe {
              border: none;
              width: 400px;
              height: 600px;
            }
            .print-btn {
              margin-top: 20px;
              padding: 10px 24px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              font-weight: 500;
            }
            .print-btn:hover {
              background: #5a67d8;
            }
            @media print {
              .print-btn {
                display: none;
              }
              body {
                background: white;
              }
              .container {
                box-shadow: none;
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <iframe id="receiptFrame" src="${pdfData}"></iframe>
            <button class="print-btn" onclick="printReceipt()">🖨️ Print Receipt</button>
          </div>
          <script>
            function printReceipt() {
              const iframe = document.getElementById('receiptFrame');
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  } else {
    // Fallback: just save the PDF
    doc.save(`receipt_${this.currentSale?.invoice_number}.pdf`);
    this.showToast('Receipt saved as PDF');
  }
  
  this.showToast('Receipt preview opened');
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
  onSearchEnter() {
  // When Enter is pressed on search input, select the highlighted product
  if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
    this.selectProduct(this.searchResults[this.selectedIndex]);
  } else if (this.searchResults.length > 0) {
    this.selectProduct(this.searchResults[0]);
  }
}

onQuantityEnter() {
  // When Enter is pressed on quantity input, add to cart
  this.addToCart();
}

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }
}