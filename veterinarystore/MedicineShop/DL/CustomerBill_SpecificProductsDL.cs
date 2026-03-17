using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
//using KIMS;
using MedicineShop;
using MySql.Data.MySqlClient;

namespace fertilizesop.DL
{
    internal class CustomerBill_SpecificProductsDL
    {
        private readonly DatabaseHelper _dbHelper;

        public CustomerBill_SpecificProductsDL()
        {
            _dbHelper = DatabaseHelper.Instance;
        }

        public DataTable GetBillDetails(int billId)
        {
            DataTable dt = new DataTable();

            try
            {
                string query = @"
            SELECT 
                m.name AS ProductName,
                c.company_name as Company,
                si.quantity,
                si.price AS UnitPrice,
                (si.price * si.quantity) AS TotalPrice,
                si.Discount as discount,
                bi.expiry_date as ExpiryDate
            FROM 
                sale_items si
            JOIN 
                batch_items bi ON si.batch_item_id = bi.batch_item_id
            JOIN
                medicines m ON bi.product_id = m.product_id
            JOIN 
                company c ON m.company_id = c.company_id
            WHERE 
                si.sale_id = @billId;";

                using (var conn = _dbHelper.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@billId", billId);

                        using (var adapter = new MySqlDataAdapter(cmd))
                        {
                            adapter.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving bill details: " + ex.Message);
            }

            return dt;
        }

        public DataTable GetBillSummary(int billId)
        {
            DataTable dt = new DataTable();

            try
            {
                string query = @"
                    SELECT 
                        cb.sale_id,
                        c.full_name AS CustomerName,
                        cb.sale_date,
                        cb.total_amount AS TotalAmount,
                        cb.paid_amount AS PaidAmount,
                        (cb.total_amount - IFNULL(cb.paid_amount, 0)) AS PendingAmount
                    FROM 
                        sales cb    
                    JOIN 
                        customers c ON cb.customer_id = c.customer_id
                    WHERE 
                        cb.sale_id = @billId";

                using (var conn = _dbHelper.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@billId", billId);

                        using (var adapter = new MySqlDataAdapter(cmd))
                        {
                            adapter.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving bill summary: " + ex.Message);
            }

            return dt;
        }
    }
}
