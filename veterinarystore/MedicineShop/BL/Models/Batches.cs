using System;

namespace MedicineShop.BL
{
    public class Batches
    {
        public int PurchaseBatchID { get; set; }
        public string BatchName { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Paid { get; set; }
        public DateTime PurchaseDate { get; set; }
        public int CompanyID { get; set; }
        public string CompanyName { get; set; }   // from join with company
        public string Status { get; set; }        // read-only purpose
    }
}
