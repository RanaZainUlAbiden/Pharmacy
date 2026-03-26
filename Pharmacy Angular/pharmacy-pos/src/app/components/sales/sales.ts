import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaxService } from '../../services/tax.service';
import { SalesStateService } from '../../services/salesState.service';

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
  companySettings: any = {
    name: 'Pharmacy POS',
    address: '123 Main Street, Lahore',
    phone: '0300-1234567',
    email: 'info@pharmacy.com'
  };
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
  paidAmount!: number;
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
    private cdr: ChangeDetectorRef,
    private taxService: TaxService,
    public salesState: SalesStateService
  ) {}

  loadCompanySettings() {
    const saved = localStorage.getItem('companySettings');
    if (saved) {
      this.companySettings = JSON.parse(saved);
    }
  }

  // ─── State Persistence ───────────────────────────────────────────────────────

  /** Save current form state into the singleton service */
  saveState() {
    this.salesState.cart = this.cart.map(item => ({ ...item }));
    this.salesState.customerName = this.customerName;
    this.salesState.discountPercent = this.discountPercent;
    this.salesState.paidAmount = this.paidAmount;
  }

  /** Restore form state from the singleton service (called on init) */
  private restoreState() {
    if (this.salesState.cart && this.salesState.cart.length > 0) {
      this.cart = this.salesState.cart.map(item => ({ ...item }));
      this.customerName = this.salesState.customerName || '';
      this.discountPercent = this.salesState.discountPercent || 0;
      this.paidAmount = this.salesState.paidAmount || 0;
    }
  }

  /** Clear persisted state (called after a completed sale) */
  private clearState() {
    this.salesState.cart = [];
    this.salesState.customerName = '';
    this.salesState.discountPercent = 0;
    this.salesState.paidAmount = 0;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadCompanySettings();

    // Restore any previously entered data before doing anything else
    this.restoreState();

    this.generateInvoiceNumber();

    // Listen for tax rate changes
    this.taxService.taxRate$.subscribe(rate => {
      this.taxRate = rate;
      this.updateCartTotals();
    });

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

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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

  // ─── Search ──────────────────────────────────────────────────────────────────

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

  // ─── Keyboard Navigation ─────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.showQuantityInput) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.addToCart();
      }
      return;
    }

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

  // ─── Cart Actions ─────────────────────────────────────────────────────────────

  selectProduct(product: any) {
    if (product.current_stock <= 0) {
      this.showToast('Out of stock!', 'error');
      return;
    }

    this.selectedProduct = product;
    this.productQuantity = 1;
    this.showQuantityInput = true;

    this.searchQuery = '';
    this.searchResults = [];
    this.selectedIndex = -1;

    this.cdr.detectChanges();

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

    this.updateCartTotals(); // saveState() is called inside here

    this.showToast(`${this.selectedProduct.name} added to cart`, 'success');

    this.selectedProduct = null;
    this.showQuantityInput = false;
    this.productQuantity = 1;

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
    this.saveState(); // ✅ persist on every cart/totals change
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
      this.updateCartTotals(); // saveState() called inside
      this.showToast('Cart cleared', 'success');
    }
  }

  onDiscountChange() {
    if (this.discountPercent < 0) this.discountPercent = 0;
    if (this.discountPercent > 100) this.discountPercent = 100;
    this.updateCartTotals(); // saveState() called inside
  }

  /** Called by (ngModelChange) on the paid amount input */
  onPaidAmountChange() {
    this.calculateChange();
    this.saveState(); // ✅ persist when paid amount changes
  }

  calculateChange() {
    this.change = Math.max(0, (this.paidAmount || 0) - this.cartTotal);
  }

  /** Called by (ngModelChange) on the customer name input */
  onCustomerNameChange() {
    this.saveState(); // ✅ persist when customer name changes
  }

  onSearchEnter() {
    if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
      this.selectProduct(this.searchResults[this.selectedIndex]);
    } else if (this.searchResults.length > 0) {
      this.selectProduct(this.searchResults[0]);
    }
  }

  onQuantityEnter() {
    this.addToCart();
  }

  // ─── Save / Print ─────────────────────────────────────────────────────────────

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
        paid_amount: this.paidAmount,
        invoice_number: this.invoiceNumber
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
      console.error('Error saving sale:', err);
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
    if (!this.currentSale) return;

    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200],
      orientation: 'portrait'
    });

    const pageWidth = 80;
    const margin = 5;
    let yPos = 8;

    const company = this.companySettings;

    // ============ HEADER ============
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || 'PHARMACY POS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (company.address) { doc.text(company.address, pageWidth / 2, yPos, { align: 'center' }); yPos += 4; }
    if (company.phone) { doc.text(`Phone: ${company.phone}`, pageWidth / 2, yPos, { align: 'center' }); yPos += 4; }
    if (company.email) { doc.text(`Email: ${company.email}`, pageWidth / 2, yPos, { align: 'center' }); yPos += 4; }

    yPos += 2;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ INVOICE INFO ============
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SALE RECEIPT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Inv: ${this.currentSale.invoice_number}`, margin, yPos);
    yPos += 4;
    doc.text(`Date: ${new Date(this.currentSale.date).toLocaleString()}`, margin, yPos);
    yPos += 4;
    doc.text(`Customer: ${this.currentSale.customer || 'Walk-in'}`, margin, yPos);
    yPos += 4;

    const user = localStorage.getItem('currentUser');
    const cashier = user ? JSON.parse(user).username : 'Admin';
    doc.text(`Cashier: ${cashier}`, margin, yPos);
    yPos += 6;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ ITEMS TABLE ============
    const colItem = margin;
    const colQty = pageWidth - 40;
    const colPrice = pageWidth - 25;
    const colTotal = pageWidth - 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Item', colItem, yPos);
    doc.text('Qty', colQty, yPos);
    doc.text('Price', colPrice, yPos);
    doc.text('Total', colTotal, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    for (const item of this.currentSale.items || []) {
      let name = item.name;
      if (name.length > 18) name = name.substring(0, 16) + '..';
      doc.text(name, colItem, yPos);
      doc.text(item.quantity.toString(), colQty, yPos);
      doc.text(this.formatCurrency(item.price), colPrice, yPos);
      doc.text(this.formatCurrency(item.total), colTotal, yPos);
      yPos += 5;

      if (yPos > 190) { doc.addPage(); yPos = 8; }
    }

    yPos += 2;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ TOTALS ============
    const rightX = pageWidth - margin;
    const leftX = rightX - 35;

    const totals = [
      { label: 'Subtotal:', value: this.currentSale.subtotal },
      { label: `Discount (${this.currentSale.discount_percent || 0}%):`, value: this.currentSale.discount },
      { label: `Tax (${this.taxRate}%):`, value: this.currentSale.tax },
      { label: 'TOTAL:', value: this.currentSale.total, bold: true },
      { label: 'Paid:', value: this.currentSale.paid },
      { label: 'Change:', value: this.currentSale.change }
    ];

    for (const t of totals) {
      doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
      doc.setFontSize(t.bold ? 10 : 8);
      if (t.value !== undefined && t.value !== null) {
        doc.text(t.label, leftX, yPos);
        doc.text(this.formatCurrency(t.value), rightX, yPos, { align: 'right' });
        yPos += t.bold ? 6 : 5;
      }
    }

    if (this.currentSale.payment_method) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Payment: ${this.currentSale.payment_method}`, leftX, yPos);
      yPos += 6;
    }

    // ============ FOOTER ============
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('THANK YOU!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
   
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Made by DevInfantary.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('0332-4645962', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Visit Again', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;

    if (company.gst) {
      doc.text(`GST: ${company.gst}`, pageWidth / 2, yPos, { align: 'center' });
    }

    // ============ PRINT ============
    const pdfData = doc.output('dataurlstring');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${this.currentSale.invoice_number}</title>
            <style>
              body { margin: 0; padding: 0; font-family: monospace; display:flex; justify-content:center; background:#f0f0f0; }
              iframe { width:400px; height:600px; border:none; }
              @media print { body { background:white; } iframe { width:100%; height:100%; } }
            </style>
          </head>
          <body>
            <iframe src="${pdfData}"></iframe>
            <script>setTimeout(()=>{ document.querySelector('iframe').contentWindow.focus(); document.querySelector('iframe').contentWindow.print(); },500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    } else {
      doc.save(`receipt_${this.currentSale.invoice_number}.pdf`);
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

    // ✅ Clear persisted state so navigating back doesn't restore a completed sale
    this.clearState();

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
}