using System;
using System.Collections.Generic;
using TechStore.Models;

namespace TechStore.Interfaces
{
    public interface IDashboardRepository
    {
        DashboardSummary GetDashboardSummary();
        List<StockInfo> GetLowStockItems();
        List<ExpiringItem> GetExpiringItems();
        List<PurchaseSummary> GetPendingPurchases();
        List<SalesSummary> GetRecentSales(int days = 7);
        List<TopSellingProduct> GetTopSellingProducts(int count = 5);
        List<MonthlyStats> GetMonthlyStats(int months = 6);
    }

    public interface IDashboardService
    {
        DashboardSummary GetDashboardSummary();
        List<StockInfo> GetLowStockItems();
        List<ExpiringItem> GetExpiringItems();
        List<PurchaseSummary> GetPendingPurchases();
        List<SalesSummary> GetRecentSales(int days = 7);
        List<TopSellingProduct> GetTopSellingProducts(int count = 5);
        List<MonthlyStats> GetMonthlyStats(int months = 6);
    }
}