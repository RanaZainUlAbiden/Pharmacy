    using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.BL.Models
{
    public class Temporarycustomersale
    {
        public string customername { get; set; }
        public string productname { get; set; }
        public decimal totaldiscount { get; set; }
        public decimal finalpriceafterdisc { get; set; }
        public decimal totalprice { get; set; }
        public DateTime date { get; set; }
        public List<saleitems> items { get; set; }
    }

    public class saleitems
    {
        public string productname { get; set; }
        public decimal unitprice { get; set; }
        public DateTime expiry_date { get; set; }
        public int quantity { get; set; }
        public decimal discount { get; set; }
        public decimal total { get; set; }
        public decimal finalprice { get; set; }
    }
}
