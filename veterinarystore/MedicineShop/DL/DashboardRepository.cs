using System;
using System.Collections.Generic;
using System.Data;
using MySql.Data.MySqlClient;
using TechStore.Interfaces;
using TechStore.Models;
using MedicineShop;

namespace TechStore.DataAccess
{
    public class DashboardRepository : IDashboardRepository
    {
        private readonly DatabaseHelper _dbHelper;

        public DashboardRepository()
        {
            _dbHelper = DatabaseHelper.Instance;
        }

        public DashboardSummary GetDashboardSummary()
        {
            var summary = new DashboardSummary();

            try
            {
                // Get all basic counts in a single query for better performance
                var basicStatsTable = _dbHelper.ExecuteDataTable(@"
                    SELECT 
                        (SELECT COUNT(*) FROM medicines) as total_products,
                        (SELECT COUNT(*) FROM company) as total_companies,
                        (SELECT COUNT(*) FROM categories) as total_categories,
                        (SELECT COUNT(*) FROM v_low_stock) as low_stock_items,
                        (SELECT COUNT(*) FROM v_low_stock WHERE stock_status = 'OUT_OF_STOCK') as out_of_stock_items,
                        (SELECT COUNT(*) FROM v_expiring_items WHERE days_to_expiry <= 30) as expiring_items,
                        (SELECT COUNT(*) FROM purchase_batches WHERE status = 'pending') as pending_purchases");

                if (basicStatsTable.Rows.Count > 0)
                {
                    var row = basicStatsTable.Rows[0];
                    summary.TotalProducts = Convert.ToInt32(row["total_products"]);
                    summary.TotalCompanies = Convert.ToInt32(row["total_companies"]);
                    summary.TotalCategories = Convert.ToInt32(row["total_categories"]);
                    summary.LowStockItems = Convert.ToInt32(row["low_stock_items"]);
                    summary.OutOfStockItems = Convert.ToInt32(row["out_of_stock_items"]);
                    summary.ExpiringItems = Convert.ToInt32(row["expiring_items"]);
                    summary.PendingPurchases = Convert.ToInt32(row["pending_purchases"]);
                }

                // Get financial data
                var financialStatsTable = _dbHelper.ExecuteDataTable(@"
                    SELECT 
                        COALESCE(SUM(bi.quantity_remaining * bi.purchase_price), 0) as total_value,
                        (SELECT COALESCE(SUM(total_price - paid), 0) FROM purchase_batches WHERE status = 'pending') as pending_amount
                    FROM batch_items bi 
                    WHERE bi.quantity_remaining > 0");

                if (financialStatsTable.Rows.Count > 0)
                {
                    var row = financialStatsTable.Rows[0];
                    summary.TotalInventoryValue = Convert.ToDecimal(row["total_value"]);
                    summary.PendingPayments = Convert.ToDecimal(row["pending_amount"]);
                }

                // Get today's sales count
                var todaySalesTable = _dbHelper.ExecuteDataTable(@"
                    SELECT COUNT(*) as count
                    FROM sales 
                    WHERE DATE(sale_date) = CURDATE()");

                if (todaySalesTable.Rows.Count > 0)
                {
                    summary.TodaySales = Convert.ToInt32(todaySalesTable.Rows[0]["count"]);
                }

                // Get today's profit data
                var todayProfitTable = _dbHelper.ExecuteDataTable(@"
                       SELECT 
                            COALESCE(SUM(si.quantity * si.price), 0) AS total_revenue,
                            COALESCE(SUM(si.quantity * bi.purchase_price), 0) AS total_cost,
                            COALESCE(
                                SUM(si.quantity * si.price) - 
                                SUM(si.quantity * bi.purchase_price),
                                0
                            ) AS total_profit
                        FROM sales s
                        JOIN sale_items si ON s.sale_id = si.sale_id
                        JOIN batch_items bi ON si.batch_item_id = bi.batch_item_id
                        WHERE DATE(s.sale_date) = CURDATE();
                        ");

                if (todayProfitTable.Rows.Count > 0)
                {
                    var row = todayProfitTable.Rows[0];
                    decimal revenue = Convert.ToDecimal(row["total_revenue"]);
                    decimal cost = Convert.ToDecimal(row["total_cost"]);
                    summary.TodayRevenue = revenue;
                    summary.TodayCost = cost;
                    summary.TodayProfit = revenue - cost;
                }

                // Get current month's profit data
                var monthProfitTable = _dbHelper.ExecuteDataTable(@"
                    SELECT 
                        COALESCE(SUM(si.quantity * si.price), 0) AS total_revenue,
                        COALESCE(SUM(si.quantity * bi.purchase_price), 0) AS total_cost,
                        COALESCE(
                            SUM(si.quantity * si.price) - 
                            SUM(si.quantity * bi.purchase_price),
                            0
                        ) AS total_profit
                    FROM sales s
                    JOIN sale_items si ON s.sale_id = si.sale_id
                    JOIN batch_items bi ON si.batch_item_id = bi.batch_item_id
                    WHERE YEAR(s.sale_date) = YEAR(CURDATE())
                    AND MONTH(s.sale_date) = MONTH(CURDATE());
                    ");

                if (monthProfitTable.Rows.Count > 0)
                {
                    var row = monthProfitTable.Rows[0];
                    decimal revenue = Convert.ToDecimal(row["total_revenue"]);
                    decimal cost = Convert.ToDecimal(row["total_cost"]);
                    summary.MonthRevenue = revenue;
                    summary.MonthCost = cost;
                    summary.MonthProfit = revenue - cost;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetDashboardSummary: {ex.Message}");
                summary = new DashboardSummary();
            }

            return summary;
        }

        public List<StockInfo> GetLowStockItems()
        {
            var stockItems = new List<StockInfo>();

            try
            {
                var stockTable = _dbHelper.ExecuteDataTable(@"
                    SELECT product_id, name, sale_price, company_name, 
                           current_stock, stock_status, minimum_threshold
                    FROM v_low_stock 
                    ORDER BY 
                        CASE stock_status 
                            WHEN 'OUT_OF_STOCK' THEN 1 
                            WHEN 'CRITICAL' THEN 2 
                            WHEN 'LOW' THEN 3 
                            ELSE 4 
                        END,
                        current_stock ASC, 
                        name
                    LIMIT 10");

                foreach (DataRow row in stockTable.Rows)
                {
                    stockItems.Add(new StockInfo
                    {
                        ProductId = Convert.ToInt32(row["product_id"]),
                        Name = row["name"].ToString(),
                        SalePrice = Convert.ToDecimal(row["sale_price"]),
                        CompanyName = row["company_name"].ToString(),
                        CurrentStock = Convert.ToInt32(row["current_stock"]),
                        StockStatus = row["stock_status"].ToString()
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetLowStockItems: {ex.Message}");
            }

            return stockItems;
        }

        public List<ExpiringItem> GetExpiringItems()
        {
            var expiringItems = new List<ExpiringItem>();

            try
            {
                var expiringTable = _dbHelper.ExecuteDataTable(@"
                    SELECT name, expiry_date, quantity_remaining, 
                           purchase_price, sale_price, days_to_expiry, company_name
                    FROM v_expiring_items 
                    WHERE days_to_expiry <= 30 AND quantity_remaining > 0
                    ORDER BY days_to_expiry ASC, name
                    LIMIT 10");

                foreach (DataRow row in expiringTable.Rows)
                {
                    expiringItems.Add(new ExpiringItem
                    {
                        Name = row["name"].ToString(),
                        ExpiryDate = Convert.ToDateTime(row["expiry_date"]),
                        QuantityRemaining = Convert.ToInt32(row["quantity_remaining"]),
                        PurchasePrice = Convert.ToDecimal(row["purchase_price"]),
                        SalePrice = Convert.ToDecimal(row["sale_price"]),
                        DaysToExpiry = Convert.ToInt32(row["days_to_expiry"]),
                        CompanyName = row["company_name"].ToString()
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetExpiringItems: {ex.Message}");
            }

            return expiringItems;
        }

        public List<PurchaseSummary> GetPendingPurchases()
        {
            var purchases = new List<PurchaseSummary>();

            try
            {
                var purchasesTable = _dbHelper.ExecuteDataTable(@"
                    SELECT pb.purchase_batch_id, pb.BatchName, c.company_name,
                           pb.purchase_date, pb.total_price, pb.paid, 
                           (pb.total_price - pb.paid) as remaining_amount, pb.status
                    FROM purchase_batches pb
                    JOIN company c ON pb.company_id = c.company_id
                    WHERE pb.status = 'pending' AND (pb.total_price - pb.paid) > 0
                    ORDER BY (pb.total_price - pb.paid) DESC, pb.purchase_date DESC
                    LIMIT 10");

                foreach (DataRow row in purchasesTable.Rows)
                {
                    purchases.Add(new PurchaseSummary
                    {
                        PurchaseBatchId = Convert.ToInt32(row["purchase_batch_id"]),
                        BatchName = row["BatchName"].ToString(),
                        CompanyName = row["company_name"].ToString(),
                        PurchaseDate = Convert.ToDateTime(row["purchase_date"]),
                        TotalPrice = Convert.ToDecimal(row["total_price"]),
                        Paid = Convert.ToDecimal(row["paid"]),
                        RemainingAmount = Convert.ToDecimal(row["remaining_amount"]),
                        Status = row["status"].ToString()
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPendingPurchases: {ex.Message}");
            }

            return purchases;
        }

        public List<SalesSummary> GetRecentSales(int days = 7)
        {
            var sales = new List<SalesSummary>();

            try
            {
                var salesTable = _dbHelper.ExecuteDataTable(@"
                    SELECT sale_day, total_bills, total_sales
                    FROM v_daily_sales 
                    WHERE sale_day >= DATE_SUB(CURDATE(), INTERVAL @days DAY)
                    ORDER BY sale_day DESC",
                    new MySqlParameter[] { new MySqlParameter("@days", days) });

                foreach (DataRow row in salesTable.Rows)
                {
                    sales.Add(new SalesSummary
                    {
                        SaleDay = Convert.ToDateTime(row["sale_day"]),
                        TotalBills = Convert.ToInt32(row["total_bills"]),
                        TotalSales = Convert.ToDecimal(row["total_sales"])
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRecentSales: {ex.Message}");
            }

            return sales;
        }

        public List<TopSellingProduct> GetTopSellingProducts(int count = 5)
        {
            var products = new List<TopSellingProduct>();

            try
            {
                var productsTable = _dbHelper.ExecuteDataTable(@"
                    SELECT m.name, c.company_name, 
                           SUM(si.quantity) as total_quantity,
                           SUM(si.quantity * si.price) as total_revenue
                    FROM sale_items si
                    JOIN medicines m ON si.product_id = m.product_id
                    JOIN company c ON m.company_id = c.company_id
                    WHERE si.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    GROUP BY m.product_id, m.name, c.company_name
                    ORDER BY total_quantity DESC
                    LIMIT @count",
                    new MySqlParameter[] { new MySqlParameter("@count", count) });

                foreach (DataRow row in productsTable.Rows)
                {
                    products.Add(new TopSellingProduct
                    {
                        ProductName = row["name"].ToString(),
                        CompanyName = row["company_name"].ToString(),
                        TotalQuantitySold = Convert.ToInt32(row["total_quantity"]),
                        TotalRevenue = Convert.ToDecimal(row["total_revenue"])
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetTopSellingProducts: {ex.Message}");
            }

            return products;
        }

        public List<MonthlyStats> GetMonthlyStats(int months = 6)
        {
            var stats = new List<MonthlyStats>();

            try
            {
                var statsTable = _dbHelper.ExecuteDataTable(@"
                    SELECT 
                        DATE_FORMAT(s.sale_date, '%Y-%m') as month,
                        COALESCE(SUM(s.total_amount), 0) as total_sales,
                        COALESCE(SUM(
                            si.quantity * (
                                SELECT AVG(bi.purchase_price) 
                                FROM batch_items bi 
                                WHERE bi.product_id = si.product_id
                            )
                        ), 0) as total_purchases,
                        COUNT(DISTINCT s.sale_id) as products_sold
                    FROM sales s
                    LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                    WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL @months MONTH)
                    GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
                    ORDER BY month DESC",
                    new MySqlParameter[] { new MySqlParameter("@months", months) });

                foreach (DataRow row in statsTable.Rows)
                {
                    decimal totalSales = Convert.ToDecimal(row["total_sales"]);
                    decimal totalPurchases = Convert.ToDecimal(row["total_purchases"]);

                    stats.Add(new MonthlyStats
                    {
                        Month = row["month"].ToString(),
                        TotalSales = totalSales,
                        TotalPurchases = totalPurchases,
                        Profit = totalSales - totalPurchases,
                        ProductsSold = Convert.ToInt32(row["products_sold"])
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMonthlyStats: {ex.Message}");
            }

            return stats;
        }

        public bool TestConnection()
        {
            try
            {
                var testTable = _dbHelper.ExecuteDataTable("SELECT 1");
                return testTable != null;
            }
            catch
            {
                return false;
            }
        }

        public List<string> GetCriticalAlerts()
        {
            var alerts = new List<string>();

            try
            {
                var alertsTable = _dbHelper.ExecuteDataTable(@"
                    SELECT 
                        (SELECT COUNT(*) FROM v_low_stock WHERE stock_status = 'OUT_OF_STOCK') as out_of_stock,
                        (SELECT COUNT(*) FROM v_expiring_items WHERE days_to_expiry <= 3) as expiring_soon,
                        (SELECT COUNT(*) FROM purchase_batches WHERE status = 'pending' AND (total_price - paid) > 100000) as high_pending
                ");

                if (alertsTable.Rows.Count > 0)
                {
                    var row = alertsTable.Rows[0];

                    int outOfStock = Convert.ToInt32(row["out_of_stock"]);
                    int expiringSoon = Convert.ToInt32(row["expiring_soon"]);
                    int highPending = Convert.ToInt32(row["high_pending"]);

                    if (outOfStock > 0)
                        alerts.Add($"{outOfStock} products are completely out of stock");

                    if (expiringSoon > 0)
                        alerts.Add($"{expiringSoon} products expire within 3 days");

                    if (highPending > 0)
                        alerts.Add($"{highPending} purchase batches have high pending payments (>1 lakh)");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCriticalAlerts: {ex.Message}");
                alerts.Add("Unable to fetch critical alerts due to database error");
            }

            return alerts;
        }
    }
}