import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './returns.html',
  styleUrls: ['./returns.scss']
})
export class ReturnsComponent implements OnInit, OnDestroy {
  // Data
  invoiceNumber = '';
  invoiceData: any = null;
  invoiceItems: any[] = [];
  returnItems: any[] = [];
  
  // UI
  isLoading = false;
  isProcessing = false;
  showInvoice = false;
  
  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any = null;
  private isDestroyed = false;

  constructor(
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {}

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

  async searchInvoice() {
    if (!this.invoiceNumber.trim()) {
      this.showToast('Please enter invoice number', 'error');
      return;
    }

    this.isLoading = true;
    this.showInvoice = false;
    this.cdr.detectChanges();

    try {
      // Find invoice
      const invoice = await this.dbRun(`
        SELECT s.*, c.full_name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.invoice_number = ? OR s.sale_id = ?
      `, [this.invoiceNumber, this.invoiceNumber], 'get');

      if (!invoice) {
        this.showToast('Invoice not found', 'error');
        return;
      }

      // Get invoice items
      const items = await this.dbRun(`
        SELECT 
          si.*,
          m.name as medicine_name,
          m.sale_price,
          b.batch_item_id,
          b.quantity_remaining as available_stock
        FROM sale_items si
        JOIN batch_items b ON si.batch_item_id = b.batch_item_id
        JOIN medicines m ON b.product_id = m.product_id
        WHERE si.sale_id = ?
      `, [invoice.sale_id]);

      this.invoiceData = invoice;
      this.invoiceItems = items || [];
      
      // Initialize return items (all quantities set to 0)
      this.returnItems = this.invoiceItems.map(item => ({
        ...item,
        return_qty: 0,
        max_return: item.quantity
      }));

      this.showInvoice = true;
      this.showToast('Invoice loaded successfully');

    } catch (error) {
      console.error('Error searching invoice:', error);
      this.showToast('Failed to load invoice', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  updateReturnQuantity(item: any, value: any) {
    let qty = Number(value);
    if (isNaN(qty)) qty = 0;
    if (qty < 0) qty = 0;
    if (qty > item.max_return) qty = item.max_return;
    item.return_qty = qty;
  }

  clearAllQuantities() {
    if (confirm('Clear all return quantities?')) {
      this.returnItems.forEach(item => item.return_qty = 0);
      this.showToast('All quantities cleared');
      this.cdr.detectChanges();
    }
  }

  getTotalReturnAmount(): number {
    return this.returnItems.reduce((sum, item) => {
      return sum + (item.return_qty * item.price);
    }, 0);
  }

  async processReturn() {
    const itemsToReturn = this.returnItems.filter(item => item.return_qty > 0);
    
    if (itemsToReturn.length === 0) {
      this.showToast('No items selected for return', 'error');
      return;
    }

    if (!confirm(`Process return for ${itemsToReturn.length} item(s)?`)) return;

    this.isProcessing = true;

    try {
      // Start transaction
      for (const item of itemsToReturn) {
        // Update stock - add back to batch
        await this.dbRun(
          `UPDATE batch_items 
           SET quantity_remaining = quantity_remaining + ?
           WHERE batch_item_id = ?`,
          [item.return_qty, item.batch_item_id],
          'run'
        );

        // Log stock movement
        await this.dbRun(
          `INSERT INTO stock_log (batch_id, change_type, quantity_change, remarks)
           VALUES (?, 'RETURN', ?, ?)`,
          [item.batch_item_id, item.return_qty, `Return from invoice ${this.invoiceData.invoice_number}`],
          'run'
        );

        // Update sale - optionally create return record
        // You can create a returns table if needed
      }

      // Update invoice paid amount if needed (if return reduces total)
      const returnAmount = this.getTotalReturnAmount();
      const newPaidAmount = Math.max(0, this.invoiceData.paid_amount - returnAmount);
      
      await this.dbRun(
        `UPDATE sales SET paid_amount = ? WHERE sale_id = ?`,
        [newPaidAmount, this.invoiceData.sale_id],
        'run'
      );

      this.showToast(`Return processed successfully! Amount: ${this.formatCurrency(returnAmount)}`);

      // Reset form
      this.resetForm();

    } catch (error) {
      console.error('Error processing return:', error);
      this.showToast('Failed to process return', 'error');
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  resetForm() {
    this.invoiceNumber = '';
    this.invoiceData = null;
    this.invoiceItems = [];
    this.returnItems = [];
    this.showInvoice = false;
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