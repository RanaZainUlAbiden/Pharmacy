namespace MedicineShop.Models
{
    public class Medicine
    {
        public int ProductId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int CompanyId { get; set; }
        public int CategoryId { get; set; }
        public int PackingId { get; set; }
        public int minimum_threshold { get; set; }
        public decimal SalePrice { get; set; }
        public string CompanyName { get; set; } // For display purposes
        public string CategoryName { get; set; } // For display purposes
        public string packingName { get; set; } // For display purposes
    }
}
