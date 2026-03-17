﻿using System;
using System.Collections.Generic;
using TechStore.Interfaces;
using TechStore.Models;
using TechStore.DataAccess;

namespace TechStore.BusinessLogic
{
    public class DashboardService : IDashboardService
    {
        private readonly IDashboardRepository _repository;

        public DashboardService()
        {
            _repository = new DashboardRepository();
        }

        public DashboardSummary GetDashboardSummary()
        {
            try
            {
                return _repository.GetDashboardSummary();
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving dashboard summary: " + ex.Message, ex);
            }
        }

        public List<StockInfo> GetLowStockItems()
        {
            try
            {
                return _repository.GetLowStockItems();
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving low stock items: " + ex.Message, ex);
            }
        }

        public List<ExpiringItem> GetExpiringItems()
        {
            try
            {
                return _repository.GetExpiringItems();
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving expiring items: " + ex.Message, ex);
            }
        }

        public List<PurchaseSummary> GetPendingPurchases()
        {
            try
            {
                return _repository.GetPendingPurchases();
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving pending purchases: " + ex.Message, ex);
            }
        }

        public List<SalesSummary> GetRecentSales(int days = 7)
        {
            try
            {
                if (days <= 0) days = 7;
                return _repository.GetRecentSales(days);
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving recent sales: " + ex.Message, ex);
            }
        }

        public List<TopSellingProduct> GetTopSellingProducts(int count = 5)
        {
            try
            {
                if (count <= 0) count = 5;
                return _repository.GetTopSellingProducts(count);
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving top selling products: " + ex.Message, ex);
            }
        }

        public List<MonthlyStats> GetMonthlyStats(int months = 6)
        {
            try
            {
                if (months <= 0) months = 6;
                return _repository.GetMonthlyStats(months);
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving monthly stats: " + ex.Message, ex);
            }
        }
    }
}