using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.BL.Models
{
    public class custbill
    {
        public string full_name { get; set; }
        public int customer_id { get; set; }
        public decimal total_amount { get; set; }
        public decimal paid { get; set; }
        public decimal remaining { get; set; }
    }
    public class custPaymentRecord
    {
        public int PaymentId { get; set; }
        public int customerId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Paid { get; set; }
        public decimal RemainingBalance { get; set; }
        public string CustomerName { get; set; }
        public decimal AllocatedAmount { get; internal set; }
        public int SaleId { get; internal set; }

    }
}

//public int PaymentId { get; set; }
//public int CompanyId { get; set; }
//public DateTime PaymentDate { get; set; }
//public decimal Amount { get; set; }
//public string Status { get; set; }
//public decimal TotalPrice { get; set; }
//public decimal Paid { get; set; }
//public decimal RemainingBalance { get; set; }
//public string CompanyName { get; set; }
//public string BatchName { get; set; }
//public int BatchId { get; internal set; }
//public decimal AllocatedAmount { get; internal set; }