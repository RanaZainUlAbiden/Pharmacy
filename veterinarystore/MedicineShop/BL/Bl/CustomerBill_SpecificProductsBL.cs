using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using fertilizesop.DL;
using fertilizesop.UI;

namespace fertilizesop.BL.Bl
{
    internal class CustomerBill_SpecificProductsBL
    {
        private readonly CustomerBill_SpecificProductsDL _billDetailsDL;

        public CustomerBill_SpecificProductsBL()
        {
            _billDetailsDL = new CustomerBill_SpecificProductsDL();
        }

        public DataTable GetBillDetails(int billId)
        {
            try
            {
                return _billDetailsDL.GetBillDetails(billId);
            }
            catch (Exception ex)
            {
                throw new Exception("Error in business logic while getting bill details: " + ex.Message);
            }
        }

        public DataTable GetBillSummary(int billId)
        {
            try
            {
                return _billDetailsDL.GetBillSummary(billId);
            }
            catch (Exception ex)
            {
                throw new Exception("Error in business logic while getting bill summary: " + ex.Message);
            }
        }

        public decimal CalculatePendingAmount(decimal totalAmount, decimal paidAmount)
        {
            return totalAmount - paidAmount;
        }

        // In CustomerBill_SpecificProductsBL.cs
        public string FormatCurrency(decimal amount)
        {
            // Pakistani Rupees formatting with culture-specific formatting
            return string.Format(new System.Globalization.CultureInfo("ur-PK"),
                               "Rs. {0:N2}", amount);
        }

        // Add this method for parsing currency input
        public decimal ParseCurrency(string currencyString)
        {
            if (string.IsNullOrWhiteSpace(currencyString))
                return 0;

            // Remove Rs. symbol and commas
            string numericString = currencyString.Replace("Rs.", "")
                                              .Replace(",", "")
                                              .Trim();

            if (decimal.TryParse(numericString, out decimal result))
                return result;

            return 0;
        }
        public string FormatDate(DateTime? date)
        {
            return date?.ToString("yyyy-MM-dd") ?? "N/A";
        }
    }
}
