const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        // Store database in user's app data folder
        const userDataPath = process.env.APPDATA || 
            (process.platform === 'darwin' ? 
                process.env.HOME + '/Library/Application Support' : 
                process.env.HOME + '/.config');
        
        const appDataPath = path.join(userDataPath, 'pharmacy-pos');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(appDataPath)) {
            fs.mkdirSync(appDataPath, { recursive: true });
        }
        
        this.dbFile = path.join(appDataPath, 'pharmacy.db');
        this.db = null;
        this.initialized = false;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbFile, (err) => {
                if (err) {
                    console.error('Database opening error:', err);
                    reject(err);
                } else {
                    console.log('Database connected:', this.dbFile);
                    this.createTables()
                        .then(() => {
                            this.initialized = true;
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const schema = `
                -- Categories table
                CREATE TABLE IF NOT EXISTS categories (
                    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_name TEXT NOT NULL
                );

                -- Packing table
                CREATE TABLE IF NOT EXISTS packing (
                    packing_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    packing_name TEXT NOT NULL UNIQUE
                );

                -- Company (suppliers) table
                CREATE TABLE IF NOT EXISTS company (
                    company_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_name TEXT NOT NULL,
                    contact TEXT NOT NULL,
                    address TEXT NOT NULL
                );

                -- Customers table
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    address TEXT
                );

                -- Medicines table (updated - removed company_id and category_id)
                CREATE TABLE IF NOT EXISTS medicines (
                    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    packing_id INTEGER NOT NULL,
                    sale_price DECIMAL(10,2) NOT NULL,
                    minimum_threshold INTEGER DEFAULT 0,
                    FOREIGN KEY (packing_id) REFERENCES packing(packing_id),
                    UNIQUE(name)
                );

                -- Purchase batches table
                CREATE TABLE IF NOT EXISTS purchase_batches (
                    purchase_batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    total_price DECIMAL(10,2) NOT NULL,
                    paid DECIMAL(10,2) NOT NULL DEFAULT 0,
                    BatchName TEXT NOT NULL UNIQUE,
                    status TEXT CHECK(status IN ('pending', 'completed', 'overpaid')) DEFAULT 'pending',
                    FOREIGN KEY (company_id) REFERENCES company(company_id)
                );

                -- Batch items table
                CREATE TABLE IF NOT EXISTS batch_items (
                    batch_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    purchase_batch_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    purchase_price DECIMAL(10,2) NOT NULL,
                    quantity_received INTEGER NOT NULL,
                    expiry_date DATE NOT NULL,
                    quantity_remaining INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (purchase_batch_id) REFERENCES purchase_batches(purchase_batch_id),
                    FOREIGN KEY (product_id) REFERENCES medicines(product_id)
                );

                -- Sales table
                CREATE TABLE IF NOT EXISTS sales (
                    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    total_amount DECIMAL(10,2) NOT NULL,
                    paid_amount DECIMAL(10,2) DEFAULT 0,
                    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
                );

                -- Sale items table
                CREATE TABLE IF NOT EXISTS sale_items (
                    sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_id INTEGER NOT NULL,
                    batch_item_id INTEGER NOT NULL,
                    quantity DECIMAL(10,2) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    discount DECIMAL(10,2) DEFAULT 0,
                    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
                    FOREIGN KEY (batch_item_id) REFERENCES batch_items(batch_item_id)
                );

                -- Customer payment records
                CREATE TABLE IF NOT EXISTS customerpricerecord (
                    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    payment DECIMAL(10,2) NOT NULL,
                    remarks TEXT,
                    sale_id INTEGER NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
                    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
                );

                -- Payment records to suppliers
                CREATE TABLE IF NOT EXISTS payment_records (
                    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
                );

                -- Stock audit log
                CREATE TABLE IF NOT EXISTS stock_log (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id INTEGER NOT NULL,
                    change_type TEXT CHECK(change_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'EXPIRED')) NOT NULL,
                    quantity_change INTEGER NOT NULL,
                    log_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    remarks TEXT,
                    FOREIGN KEY (batch_id) REFERENCES batch_items(batch_item_id) ON DELETE CASCADE
                );

                -- Users table
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                -- Create indexes
                CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
                CREATE INDEX IF NOT EXISTS idx_batch_items_expiry ON batch_items(expiry_date);
                CREATE INDEX IF NOT EXISTS idx_batch_items_product ON batch_items(product_id);
                CREATE INDEX IF NOT EXISTS idx_batch_items_remaining ON batch_items(quantity_remaining);
                CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
                CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
                CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
                CREATE INDEX IF NOT EXISTS idx_customer_payments ON customerpricerecord(customer_id);
                CREATE INDEX IF NOT EXISTS idx_stock_log_date ON stock_log(log_date);

                -- Insert default data
                INSERT OR IGNORE INTO categories (category_name) VALUES 
                    ('Antibiotic'), ('Vaccine'), ('Painkiller'), ('Vitamin'), 
                    ('Antifungal'), ('Antiparasitic'), ('Hormone'), ('Disinfectant'), 
                    ('Supplement'), ('Diagnostic');

                INSERT OR IGNORE INTO packing (packing_name) VALUES 
                    ('Tablet'), ('Capsule'), ('Injection'), ('Syrup'), ('Ointment'), 
                    ('Powder'), ('Spray'), ('Drop'), ('Cream'), ('Solution'), ('bottle');

                INSERT OR IGNORE INTO users (username, password_hash) VALUES 
                    ('admin', 'admin123');

                INSERT OR IGNORE INTO customers (full_name, phone, address) VALUES 
                    ('walkin', '9090909090', 'walkin');
            `;

            // SQLite can only execute one statement at a time
            const statements = schema.split(';').filter(s => s.trim());
            
            const runNext = (index) => {
                if (index >= statements.length) {
                    console.log('Database tables created/verified');
                    resolve();
                    return;
                }
                
                this.db.run(statements[index], (err) => {
                    if (err && !err.message.includes('already exists')) {
                        console.error('Error creating table:', err);
                    }
                    runNext(index + 1);
                });
            };
            
            runNext(0);
        });
    }

    query(sql, params = [], method = 'all') {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            this.db[method](sql, params, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    // Get current stock with batch info
    async getCurrentStock() {
        const sql = `
            SELECT 
                m.product_id,
                m.name,
                m.sale_price,
                p.packing_name,
                COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
                COUNT(CASE WHEN bi.quantity_remaining > 0 THEN 1 END) as active_batches,
                MIN(CASE WHEN bi.quantity_remaining > 0 THEN bi.expiry_date END) as next_expiry
            FROM medicines m
            LEFT JOIN batch_items bi ON m.product_id = bi.product_id
            LEFT JOIN packing p ON m.packing_id = p.packing_id
            GROUP BY m.product_id
        `;
        return this.query(sql);
    }

    // Get low stock items
    async getLowStock() {
        const sql = `
            SELECT 
                m.product_id,
                m.name,
                COALESCE(SUM(bi.quantity_remaining), 0) as current_stock,
                m.sale_price,
                m.minimum_threshold,
                CASE 
                    WHEN COALESCE(SUM(bi.quantity_remaining), 0) = 0 THEN 'OUT_OF_STOCK'
                    WHEN COALESCE(SUM(bi.quantity_remaining), 0) < (m.minimum_threshold * 0.25) THEN 'CRITICAL'
                    WHEN COALESCE(SUM(bi.quantity_remaining), 0) < m.minimum_threshold THEN 'LOW'
                    ELSE 'ADEQUATE'
                END as stock_status,
                MIN(CASE WHEN bi.quantity_remaining > 0 THEN bi.expiry_date END) as next_expiry
            FROM medicines m
            LEFT JOIN batch_items bi ON m.product_id = bi.product_id
            GROUP BY m.product_id
            HAVING current_stock < m.minimum_threshold
            ORDER BY 
                CASE stock_status
                    WHEN 'OUT_OF_STOCK' THEN 1
                    WHEN 'CRITICAL' THEN 2
                    WHEN 'LOW' THEN 3
                END,
                current_stock
        `;
        return this.query(sql);
    }

    // Get expiring items
    async getExpiringItems(days = 60) {
        const sql = `
            SELECT 
                m.name as medicine_name,
                bi.expiry_date,
                bi.quantity_remaining,
                bi.purchase_price,
                m.sale_price,
                pb.BatchName as batch_name,
                julianday(bi.expiry_date) - julianday(date('now')) as days_to_expiry
            FROM batch_items bi
            JOIN medicines m ON bi.product_id = m.product_id
            JOIN purchase_batches pb ON bi.purchase_batch_id = pb.purchase_batch_id
            WHERE bi.quantity_remaining > 0 
                AND bi.expiry_date <= date('now', '+' || ? || ' days')
            ORDER BY bi.expiry_date
        `;
        return this.query(sql, [days]);
    }

    // Get daily sales
    async getDailySales() {
        const sql = `
            SELECT 
                date(sale_date) as sale_day,
                COUNT(DISTINCT sale_id) as total_bills,
                SUM(total_amount) as total_sales
            FROM sales
            GROUP BY date(sale_date)
            ORDER BY sale_day DESC
            LIMIT 30
        `;
        return this.query(sql);
    }

    // Process a sale with items
    async createSale(saleData, items) {
        const db = this.db;
        
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                try {
                    // Insert sale
                    const insertSale = `
                        INSERT INTO sales (customer_id, total_amount, paid_amount)
                        VALUES (?, ?, ?)
                    `;
                    
                    let saleId = null;
                    
                    db.run(insertSale, 
                        [saleData.customer_id, saleData.total_amount, saleData.paid_amount],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            saleId = this.lastID;
                            
                            // Insert sale items and update batch quantities
                            let completed = 0;
                            
                            for (const item of items) {
                                // Insert sale item
                                const insertItem = `
                                    INSERT INTO sale_items (sale_id, batch_item_id, quantity, price, discount)
                                    VALUES (?, ?, ?, ?, ?)
                                `;
                                
                                db.run(insertItem,
                                    [saleId, item.batch_item_id, item.quantity, item.price, item.discount || 0],
                                    function(err) {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }
                                        
                                        // Update batch quantity
                                        const updateBatch = `
                                            UPDATE batch_items 
                                            SET quantity_remaining = quantity_remaining - ?
                                            WHERE batch_item_id = ?
                                        `;
                                        
                                        db.run(updateBatch, [item.quantity, item.batch_item_id], function(err) {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                reject(err);
                                                return;
                                            }
                                            
                                            // Add to stock log
                                            const insertLog = `
                                                INSERT INTO stock_log (batch_id, change_type, quantity_change, remarks)
                                                VALUES (?, 'SALE', ?, ?)
                                            `;
                                            
                                            db.run(insertLog, 
                                                [item.batch_item_id, -item.quantity, `Sale #${saleId}`],
                                                function(err) {
                                                    if (err) {
                                                        db.run('ROLLBACK');
                                                        reject(err);
                                                        return;
                                                    }
                                                    
                                                    completed++;
                                                    if (completed === items.length) {
                                                        // If payment is less than total, add to customer payment record
                                                        if (saleData.paid_amount < saleData.total_amount) {
                                                            const insertPaymentRecord = `
                                                                INSERT INTO customerpricerecord (customer_id, date, payment, remarks, sale_id)
                                                                VALUES (?, date('now'), ?, 'Partial payment', ?)
                                                            `;
                                                            
                                                            db.run(insertPaymentRecord,
                                                                [saleData.customer_id, saleData.paid_amount, saleId],
                                                                function(err) {
                                                                    if (err) {
                                                                        db.run('ROLLBACK');
                                                                        reject(err);
                                                                        return;
                                                                    }
                                                                    db.run('COMMIT');
                                                                    resolve(saleId);
                                                                }
                                                            );
                                                        } else {
                                                            db.run('COMMIT');
                                                            resolve(saleId);
                                                        }
                                                    }
                                                }
                                            );
                                        });
                                    }
                                );
                            }
                        }
                    );
                } catch (error) {
                    db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }
}

module.exports = DatabaseManager;