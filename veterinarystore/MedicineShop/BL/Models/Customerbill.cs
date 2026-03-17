using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace fertilizesop.BL.Models
{
    public class customerbill
    {
        private int billid;
        private decimal totalamount;
        private decimal paidamount;

        public customerbill(int billid, string customer_name, DateTime date, decimal totalamount, decimal paidamount, decimal pending, int customer_id)
        {
            this.billid = billid;
            this.customer_name = customer_name;
            this.date = date;
            this.totalamount = totalamount;
            this.paidamount = paidamount;
            this.pending = pending;
            this.customer_id = customer_id;
        }

        public customerbill(int bill_id, string customer_name, DateTime date, decimal total_price, decimal paid_price,  decimal pending, int customer_id, string status)
        {
            this.bill_id = bill_id;
            this.customer_name = customer_name;
            this.customer_id = customer_id;
            this.date = date;
            this.total_price = total_price;
            this.paid_price = paid_price;
            this.batch_name = batch_name;
            this.pending = pending;
            this.status = status;
        }

        public int bill_id { get; set; }
        public string customer_name { get; set; }
        public int customer_id { get;  set; }
        public DateTime date { get; set; }
        public decimal total_price { get; set; }
        public decimal paid_price { get; set; }
        public string batch_name { get; set; }
        public decimal pending { get; set; }
        public string status { get; set; }

    }

}
