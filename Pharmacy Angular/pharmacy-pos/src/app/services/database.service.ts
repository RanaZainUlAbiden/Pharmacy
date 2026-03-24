import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  
  constructor() { 
    console.log('DatabaseService initialized');
    // @ts-ignore
    console.log('window.electronAPI exists?', !!window.electronAPI);
  }

  /**
   * Execute any SQL query
   */
  async query(sql: string, params: any[] = [], method: string = 'all'): Promise<any> {
    try {
      // @ts-ignore - electronAPI is added via preload script
      const result = await window.electronAPI.database.query(sql, params, method);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await this.query('SELECT * FROM users', [], 'all');
      console.log('✅ Database connected! Users:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return { success: false, error };
    }
  }

  // ============ MEDICINE METHODS ============

  /**
   * Get all medicines (updated - removed company and category)
   */
  async getAllMedicines() {
    return this.query(`
      SELECT m.*, p.packing_name 
      FROM medicines m
      LEFT JOIN packing p ON m.packing_id = p.packing_id
      ORDER BY m.name
    `);
  }

  /**
   * Get medicine by ID
   */
  async getMedicineById(id: number) {
    return this.query('SELECT * FROM medicines WHERE product_id = ?', [id], 'get');
  }

  /**
   * Add new medicine (updated - removed company_id and category_id)
   */
  async addMedicine(medicine: any) {
    const sql = `INSERT INTO medicines 
      (name, description, packing_id, sale_price, minimum_threshold) 
      VALUES (?, ?, ?, ?, ?)`;
    
    return this.query(sql, [
      medicine.name,
      medicine.description || '',
      medicine.packing_id,
      medicine.sale_price,
      medicine.minimum_threshold || 0
    ], 'run');
  }

  /**
   * Update medicine (updated - removed company_id and category_id)
   */
  async updateMedicine(id: number, medicine: any) {
    const sql = `UPDATE medicines 
      SET name = ?, description = ?, packing_id = ?, 
          sale_price = ?, minimum_threshold = ?
      WHERE product_id = ?`;
    
    return this.query(sql, [
      medicine.name,
      medicine.description || '',
      medicine.packing_id,
      medicine.sale_price,
      medicine.minimum_threshold || 0,
      id
    ], 'run');
  }

  /**
   * Delete medicine
   */
  async deleteMedicine(id: number) {
    return this.query('DELETE FROM medicines WHERE product_id = ?', [id], 'run');
  }

  // ============ STOCK METHODS ============

  /**
   * Get current stock with batch info (updated - removed company and category)
   */
  async getCurrentStock() {
    // @ts-ignore
    return window.electronAPI.database.getCurrentStock();
  }

  /**
   * Get low stock items (updated - removed company)
   */
  async getLowStock() {
    // @ts-ignore
    return window.electronAPI.database.getLowStock();
  }

  /**
   * Get expiring items (updated - removed company)
   */
  async getExpiringItems(days: number = 60) {
    // @ts-ignore
    return window.electronAPI.database.getExpiringItems(days);
  }

  // ============ BATCH METHODS ============

  /**
   * Get batches for a medicine
   */
  async getBatchesByMedicine(medicineId: number) {
    return this.query(`
      SELECT b.*, pb.BatchName, pb.company_id, c.company_name
      FROM batch_items b
      JOIN purchase_batches pb ON b.purchase_batch_id = pb.purchase_batch_id
      JOIN company c ON pb.company_id = c.company_id
      WHERE b.product_id = ? AND b.quantity_remaining > 0
      ORDER BY b.expiry_date
    `, [medicineId]);
  }

  // ============ COMPANY METHODS ============

  /**
   * Get all companies (suppliers)
   */
  async getAllCompanies() {
    return this.query('SELECT * FROM company ORDER BY company_name');
  }

  // ============ CATEGORY METHODS ============

  /**
   * Get all categories
   */
  async getAllCategories() {
    return this.query('SELECT * FROM categories ORDER BY category_name');
  }

  // ============ PACKING METHODS ============

  /**
   * Get all packing types
   */
  async getAllPacking() {
    return this.query('SELECT * FROM packing ORDER BY packing_name');
  }

  // ============ CUSTOMER METHODS ============

  /**
   * Get all customers
   */
  async getAllCustomers() {
    return this.query('SELECT * FROM customers ORDER BY full_name');
  }

  /**
   * Add new customer
   */
  async addCustomer(customer: any) {
    const sql = `INSERT INTO customers (full_name, phone, address) VALUES (?, ?, ?)`;
    return this.query(sql, [customer.full_name, customer.phone, customer.address], 'run');
  }

  // ============ SALE METHODS ============

  /**
   * Get daily sales
   */
  async getDailySales() {
    // @ts-ignore
    return window.electronAPI.database.getDailySales();
  }

  /**
   * Create new sale
   */
  async createSale(saleData: any, items: any[]) {
    // @ts-ignore
    return window.electronAPI.database.createSale(saleData, items);
  }

  /**
   * Get sales history
   */
  async getSalesHistory(limit: number = 50) {
    return this.query(`
      SELECT s.*, c.full_name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      ORDER BY s.sale_date DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Get sale details with items
   */
  async getSaleDetails(saleId: number) {
    const sale = await this.query(`
      SELECT s.*, c.full_name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `, [saleId], 'get');

    const items = await this.query(`
      SELECT si.*, m.name as medicine_name, b.expiry_date
      FROM sale_items si
      JOIN batch_items b ON si.batch_item_id = b.batch_item_id
      JOIN medicines m ON b.product_id = m.product_id
      WHERE si.sale_id = ?
    `, [saleId]);

    return { sale, items };
  }
}