using System;

namespace MedicineShop.BL.Models
{
    public class BatchItems
    {
        public int BatchItemID { get; set; }
        public int BatchID { get; set; }
        public int MedicineID { get; set; }
        public int Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string batchname { get; set; }  // Added to hold batch name for joins

        // Optional join fields
        public string MedicineName { get; set; }
        public string CompanyName { get;  set; }
    }
}
