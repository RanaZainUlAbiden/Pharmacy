using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.BL.Models
{
    public class CompanyBill
    {
        public string company_name { get; set; }
        public int company_id { get; set; }
        public decimal total_price { get; set; }
        public decimal paid { get; set; }
        public decimal remaining { get; set; }


    }
    
        public class PaymentRecord
        {
            public int PaymentId { get; set; }
            public int CompanyId { get; set; }
            public DateTime PaymentDate { get; set; }
            public decimal Amount { get; set; }
            public string Status { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal Paid { get; set; }
            public decimal RemainingBalance { get; set; }
            public string CompanyName { get; set; }
        public string BatchName { get; set; }
        public int BatchId { get; internal set; }
        public decimal AllocatedAmount { get; internal set; }
    }

    

}
