import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicines.html',
  styleUrls: ['./medicines.scss']
})
export class MedicinesComponent implements OnInit {
  // View mode
  viewMode: 'list' | 'add' | 'edit' | 'details' = 'list';

  // Data
  medicines: any[] = [];
  selectedMedicine: any = null;
  searchTerm: string = '';
  activeFilter: 'all' | 'lowstock' | 'expiring' = 'all';

  // Dropdown options
  companies: any[] = [];
  categories: any[] = [];
  packings: any[] = [];

  // Medicine details
  medicineBatches: any[] = [];

  // Form model
  medicineForm: any = {
    name: '',
    description: '',
    company_id: '',
    packing_id: '',
    category_id: '',
    sale_price: '',
    minimum_threshold: 0
  };

  // Loading states
  loading = {
    medicines: false,
    batches: false
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private db: DatabaseService
  ) {}

  ngOnInit() {
    // Read resolver data if provided, then load dropdowns
    this.route.data.subscribe((data: any) => {
      if (data && data.medicineData) {
        this.medicines = data.medicineData.medicines || [];
      }
    });

    // Read query params for filter (e.g. from dashboard shortcut)
    this.route.queryParams.subscribe(params => {
      if (params['filter'] === 'lowstock') {
        this.activeFilter = 'lowstock';
      } else if (params['filter'] === 'expiring') {
        this.activeFilter = 'expiring';
      }
    });

    this.loadDropdowns();

    // If no resolver data, load manually
    if (this.medicines.length === 0) {
      this.reloadMedicines();
    }
  }

  // ── Data Loaders ──────────────────────────────────────────────────────────

  async reloadMedicines() {
    this.loading.medicines = true;
    try {
      this.medicines = await this.db.getAllMedicines();
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      this.loading.medicines = false;
    }
  }

  async loadDropdowns() {
    try {
      const [companies, categories, packings] = await Promise.all([
        this.db.query('SELECT * FROM company ORDER BY company_name'),
        this.db.query('SELECT * FROM categories ORDER BY category_name'),
        this.db.query('SELECT * FROM packing ORDER BY packing_name')
      ]);
      this.companies = companies || [];
      this.categories = categories || [];
      this.packings = packings || [];
    } catch (error) {
      console.error('Error loading dropdowns:', error);
    }
  }

  async loadMedicineBatches(productId: number) {
    this.loading.batches = true;
    try {
      this.medicineBatches = await this.db.query(
        `SELECT
           bi.*,
           pb.purchase_date,
           pb.BatchName
         FROM batch_items bi
         JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
         WHERE bi.product_id = ?
         ORDER BY bi.expiry_date ASC`,
        [productId]
      );
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      this.loading.batches = false;
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  get filteredMedicines() {
    let list = this.medicines;

    if (this.activeFilter === 'lowstock') {
      list = list.filter(m =>
        (m.current_stock ?? 0) < (m.minimum_threshold ?? 0)
      );
    } else if (this.activeFilter === 'expiring') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 60);
      list = list.filter(m =>
        m.next_expiry && new Date(m.next_expiry) <= cutoff
      );
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(term) ||
        (m.company_name && m.company_name.toLowerCase().includes(term)) ||
        (m.category_name && m.category_name.toLowerCase().includes(term))
      );
    }

    return list;
  }

  setFilter(filter: 'all' | 'lowstock' | 'expiring') {
    this.activeFilter = filter;
  }

  // ── View switching ─────────────────────────────────────────────────────────

  showAddForm() {
    this.resetForm();
    this.viewMode = 'add';
  }

  showEditForm(medicine: any) {
    this.medicineForm = {
      product_id: medicine.product_id,
      name: medicine.name,
      description: medicine.description || '',
      company_id: medicine.company_id,
      packing_id: medicine.packing_id,
      category_id: medicine.category_id,
      sale_price: medicine.sale_price,
      minimum_threshold: medicine.minimum_threshold || 0
    };
    this.viewMode = 'edit';
  }

  async showDetails(medicine: any) {
    this.selectedMedicine = medicine;
    this.viewMode = 'details';
    await this.loadMedicineBatches(medicine.product_id);
  }

  cancelForm() {
    this.resetForm();
    this.viewMode = 'list';
  }

  goBack() {
    this.viewMode = 'list';
    this.selectedMedicine = null;
    this.medicineBatches = [];
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async addMedicine() {
    if (!this.medicineForm.name || !this.medicineForm.company_id ||
        !this.medicineForm.category_id || !this.medicineForm.packing_id ||
        !this.medicineForm.sale_price) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      await this.db.query(
        `INSERT INTO medicines (name, description, company_id, packing_id, category_id, sale_price, minimum_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          this.medicineForm.name,
          this.medicineForm.description || null,
          this.medicineForm.company_id,
          this.medicineForm.packing_id,
          this.medicineForm.category_id,
          this.medicineForm.sale_price,
          this.medicineForm.minimum_threshold || 0
        ],
        'run'
      );
      await this.reloadMedicines();
      this.resetForm();
      this.viewMode = 'list';
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      if (error?.message?.includes('UNIQUE')) {
        alert('A medicine with this name and company already exists.');
      } else {
        alert('Failed to add medicine. Please try again.');
      }
    }
  }

  async updateMedicine() {
    if (!this.medicineForm.name || !this.medicineForm.company_id ||
        !this.medicineForm.category_id || !this.medicineForm.packing_id ||
        !this.medicineForm.sale_price) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      await this.db.query(
        `UPDATE medicines
         SET name = ?, description = ?, company_id = ?, packing_id = ?,
             category_id = ?, sale_price = ?, minimum_threshold = ?
         WHERE product_id = ?`,
        [
          this.medicineForm.name,
          this.medicineForm.description || null,
          this.medicineForm.company_id,
          this.medicineForm.packing_id,
          this.medicineForm.category_id,
          this.medicineForm.sale_price,
          this.medicineForm.minimum_threshold || 0,
          this.medicineForm.product_id
        ],
        'run'
      );
      await this.reloadMedicines();
      this.resetForm();
      this.viewMode = 'list';
    } catch (error: any) {
      console.error('Error updating medicine:', error);
      if (error?.message?.includes('UNIQUE')) {
        alert('A medicine with this name and company already exists.');
      } else {
        alert('Failed to update medicine. Please try again.');
      }
    }
  }

  async deleteMedicine(productId: number) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    try {
      await this.db.query(
        'DELETE FROM medicines WHERE product_id = ?',
        [productId],
        'run'
      );
      await this.reloadMedicines();
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      if (error?.message?.includes('FOREIGN KEY')) {
        alert('Cannot delete: this medicine is used in existing purchases or sales.');
      } else {
        alert('Failed to delete medicine.');
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resetForm() {
    this.medicineForm = {
      name: '',
      description: '',
      company_id: '',
      packing_id: '',
      category_id: '',
      sale_price: '',
      minimum_threshold: 0
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);
    return new Date(expiryDate) <= cutoff;
  }

  getStockBadgeClass(medicine: any): string {
    const stock = medicine.current_stock ?? 0;
    const threshold = medicine.minimum_threshold ?? 0;
    if (stock === 0) return 'badge-out';
    if (stock < threshold * 0.25) return 'badge-critical';
    if (stock < threshold) return 'badge-low';
    return 'badge-ok';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OUT_OF_STOCK': return 'chip-out';
      case 'CRITICAL':     return 'chip-critical';
      case 'LOW':          return 'chip-low';
      default:             return 'chip-ok';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OUT_OF_STOCK': return 'Out of Stock';
      case 'CRITICAL':     return 'Critical';
      case 'LOW':          return 'Low Stock';
      default:             return 'Adequate';
    }
  }

  getRemainingClass(qty: number): string {
    if (qty === 0) return 'badge-out';
    if (qty <= 5) return 'badge-critical';
    return 'badge-ok';
  }

  getBatchStatusClass(batch: any): string {
    if (batch.quantity_remaining === 0) return 'chip-out';
    if (this.isExpiringSoon(batch.expiry_date)) return 'chip-low';
    return 'chip-ok';
  }

  getBatchStatusLabel(batch: any): string {
    if (batch.quantity_remaining === 0) return 'Empty';
    if (this.isExpiringSoon(batch.expiry_date)) return 'Expiring Soon';
    return 'Active';
  }
}