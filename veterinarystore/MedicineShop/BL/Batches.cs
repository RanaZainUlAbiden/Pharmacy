using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.BL
{
    public class Batches
    {
        public int BatchID { get; set; }
        public string BatchName { get; set; }

        public decimal TotalPrice { get; set; }
        public decimal PaidAmount { get; set; }
        public DateTime Purchasedate { get; set; }
        public int company_id { get; set; }

    }

}
