using System;
using System.Collections.Generic;

namespace TechStore.Models
{
    // Dashboard Summary Model - UPDATED
    public class DashboardSummary
    {
        public int TotalProducts { get; set; }
        public int TotalCompanies { get; set; }
        public int TotalCategories { get; set; }
        public int LowStockItems { get; set; }
        public int ExpiringItems { get; set; }
        public int OutOfStockItems { get; set; }
        public decimal TotalInventoryValue { get; set; }
        public int PendingPurchases { get; set; }
        public decimal PendingPayments { get; set; }
        public int TodaySales { get; set; }
        public decimal TodayRevenue { get; set; }
        public decimal TodayProfit { get; set; } // NEW
        public decimal TodayCost { get; set; }   // NEW
        public decimal MonthRevenue { get; set; }
        public decimal MonthCost { get; set; }
        public decimal MonthProfit { get; set; }
    }

    // Stock Information Model
    public class StockInfo
    {
        public int ProductId { get; set; }
        public string Name { get; set; }
        public decimal SalePrice { get; set; }
        public string CompanyName { get; set; }
        public string CategoryName { get; set; }
        public string PackingName { get; set; }
        public int CurrentStock { get; set; }
        public int ActiveBatches { get; set; }
        public DateTime? NextExpiry { get; set; }
        public string StockStatus { get; set; }
    }

    // Expiring Items Model
    public class ExpiringItem
    {
        public string Name { get; set; }
        public DateTime ExpiryDate { get; set; }
        public int QuantityRemaining { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public int DaysToExpiry { get; set; }
        public string CompanyName { get; set; }
    }

    // Purchase Summary Model
    public class PurchaseSummary
    {
        public int PurchaseBatchId { get; set; }
        public string BatchName { get; set; }
        public string CompanyName { get; set; }
        public DateTime PurchaseDate { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Paid { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Status { get; set; }
    }

    // Sales Summary Model
    public class SalesSummary
    {
        public DateTime SaleDay { get; set; }
        public int TotalBills { get; set; }
        public decimal TotalSales { get; set; }
    }

    // Top Selling Products Model
    public class TopSellingProduct
    {
        public string ProductName { get; set; }
        public string CompanyName { get; set; }
        public int TotalQuantitySold { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    // Monthly Stats Model - UPDATED
    public class MonthlyStats
    {
        public string Month { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal Profit { get; set; }
        public int ProductsSold { get; set; }
    }
}