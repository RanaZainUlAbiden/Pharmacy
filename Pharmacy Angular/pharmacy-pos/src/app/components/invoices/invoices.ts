import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import jsPDF from 'jspdf';
import { TaxService } from '../../services/tax.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.html',
  styleUrls: ['./invoices.scss']
})
export class InvoicesComponent implements OnInit, OnDestroy {
  // Data
  invoices: any[] = [];
  filteredInvoices: any[] = [];
  selectedInvoice: any = null;
  invoiceItems: any[] = [];
  
  // Search
  searchTerm = '';
  
  // View mode
  showDetails = false;
  
  // Company settings (from localStorage)
  companySettings: any = {
    name: 'Pharmacy POS',
    address: '123 Main Street, Lahore',
    phone: '0300-1234567',
    email: 'info@pharmacy.com'
  };
  
  // UI
  isLoading = false;
  isBusy = false;
  taxRate=0;
  
  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private taxService: TaxService
  ) {}

  ngOnInit() {

     // Get current tax rate
    this.taxRate = this.taxService.getTaxRate();

    // Optional: subscribe to changes if tax can change dynamically
    this.taxService.taxRate$.subscribe(rate => {
      this.taxRate = rate;
    });
    this.loadCompanySettings();
    this.loadInvoices();
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

  loadCompanySettings() {
    const saved = localStorage.getItem('companySettings');
    if (saved) {
      this.companySettings = JSON.parse(saved);
    }
  }

  async loadInvoices() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const sql = `
        SELECT 
          s.sale_id,
          s.invoice_number,
          s.sale_date,
          c.full_name as customer_name,
          COUNT(si.sale_item_id) as item_count,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) as due_amount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN sale_items si ON s.sale_id = si.sale_id
        GROUP BY s.sale_id
        ORDER BY s.sale_date DESC
      `;
      
      this.invoices = await this.dbRun(sql);
      this.applySearch();
      
      console.log('Loaded invoices:', this.invoices.length);
      
    } catch (error) {
      console.error('Error loading invoices:', error);
      this.showToast('Failed to load invoices', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applySearch() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredInvoices = [...this.invoices];
      return;
    }
    
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredInvoices = this.invoices.filter(inv => {
      const invoiceNum = (inv.invoice_number || inv.sale_id?.toString() || '').toLowerCase();
      const customerName = (inv.customer_name || '').toLowerCase();
      return invoiceNum.includes(term) || customerName.includes(term);
    });
  }

  onSearchChange() {
    this.applySearch();
    this.cdr.detectChanges();
  }

  async viewInvoiceDetails(invoice: any) {
    this.isBusy = true;
    this.selectedInvoice = invoice;
    
    try {
      const items = await this.dbRun(`
        SELECT 
          si.*,
          m.name as medicine_name
        FROM sale_items si
        JOIN batch_items b ON si.batch_item_id = b.batch_item_id
        JOIN medicines m ON b.product_id = m.product_id
        WHERE si.sale_id = ?
      `, [invoice.sale_id]);
      
      this.invoiceItems = items || [];
      this.showDetails = true;
      
    } catch (error) {
      console.error('Error loading invoice details:', error);
      this.showToast('Failed to load invoice details', 'error');
    } finally {
      this.isBusy = false;
      this.cdr.detectChanges();
    }
  }

  closeDetails() {
    this.showDetails = false;
    this.selectedInvoice = null;
    this.invoiceItems = [];
  }

  printInvoice() {
  if (!this.selectedInvoice) return;

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200],
    orientation: 'portrait'
  });

  const pageWidth = 80;
  const margin = 5;
  let yPos = 8;

  // ============ HEADER ============
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(this.companySettings.name || 'PHARMACY POS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(this.companySettings.address || '123 Main Street, Lahore', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Phone: ${this.companySettings.phone || '0300-1234567'}`, pageWidth / 2, yPos, { align: 'center' });
  if (this.companySettings.email) {
    yPos += 4;
    doc.text(`Email: ${this.companySettings.email}`, pageWidth / 2, yPos, { align: 'center' });
  }
  yPos += 6;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ============ INVOICE DETAILS ============
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SALE RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Inv No: ${this.selectedInvoice?.invoice_number || this.selectedInvoice?.sale_id}`, margin, yPos);
  yPos += 4;
  doc.text(`Date: ${new Date(this.selectedInvoice?.sale_date).toLocaleString()}`, margin, yPos);
  yPos += 4;
  doc.text(`Customer: ${this.selectedInvoice?.customer_name || 'Walk-in'}`, margin, yPos);
  yPos += 6;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ============ ITEMS TABLE ============
  const colItem = margin;
  const colQty = pageWidth - 50;
  const colPrice = pageWidth - 35;
  const colTotal = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', colItem, yPos);
  doc.text('Qty', colQty, yPos);
  doc.text('Price', colPrice, yPos);
  doc.text('Total', colTotal, yPos, { align: 'right' });
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  doc.setFont('helvetica', 'normal');
  for (const item of this.invoiceItems) {
    let itemName = item.medicine_name;
    if (itemName.length > 18) itemName = itemName.substring(0, 16) + '..';
    doc.text(itemName, colItem, yPos);
    doc.text(item.quantity.toString(), colQty, yPos);
    doc.text(this.formatCurrency(item.price), colPrice, yPos);
    doc.text(this.formatCurrency(item.price * item.quantity), colTotal, yPos, { align: 'right' });
    yPos += 5;
  }

  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ============ TOTALS ============
  const rightX = pageWidth - margin;
  const leftX = rightX - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text('Subtotal:', leftX, yPos);
  doc.text(this.formatCurrency(this.selectedInvoice?.total_amount), rightX, yPos, { align: 'right' });
  yPos += 5;

  doc.text('Discount:', leftX, yPos);
  doc.text(this.formatCurrency(0), rightX, yPos, { align: 'right' });
  yPos += 5;

  // doc.text(`Tax (${this.taxRate}%):`, leftX, yPos);
  //   const taxAmount = this.selectedInvoice?.total_amount! * (this.taxRate / 100);
  //   doc.text(this.formatCurrency(taxAmount), rightX, yPos, { align: 'right' });
  //   yPos += 5;

  //   doc.line(margin, yPos, pageWidth - margin, yPos);
  //   yPos += 4;


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', leftX, yPos);
  const grandTotal = this.selectedInvoice?.total_amount;
  doc.text(this.formatCurrency(grandTotal), rightX, yPos, { align: 'right' });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Paid: ${this.formatCurrency(this.selectedInvoice?.paid_amount)}`, leftX, yPos);
  yPos += 4;
  const due = grandTotal - this.selectedInvoice?.paid_amount;
  doc.text(`Due: ${this.formatCurrency(due)}`, leftX, yPos);
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

  const pdfData = doc.output('dataurlstring');
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html><head><title>Invoice - ${this.selectedInvoice?.invoice_number}</title>
      <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;}
      iframe{border:none;width:400px;height:600px;}</style></head>
      <body><iframe src="${pdfData}"></iframe>
      <script>setTimeout(()=>window.print(),500);</script>
      </body></html>
    `);
    printWindow.document.close();
  }

  this.showToast('Invoice opened for printing');
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
}