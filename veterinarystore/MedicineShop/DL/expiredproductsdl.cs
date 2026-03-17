using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;

namespace MedicineShop.DL
{
    internal class expiredproductsdl
    {
        private readonly DatabaseHelper db = DatabaseHelper.Instance;

        public  DataTable GetAllCustomers(string search = "")
        {
            string query = @"
                               SELECT 
                            pr.product_id,
                            pr.name AS product_name,
                            c.category_name,
                            pk.packing_name,
                            pd.batch_item_id,
                            comp.company_name,
                            pd.purchase_batch_id,
                            pd.quantity_remaining,
                            pd.expiry_date
                        FROM batch_items pd
                        JOIN medicines pr ON pd.product_id = pr.product_id
                        JOIN categories c ON pr.category_id = c.category_id
                        JOIN packing pk ON pr.packing_id = pk.packing_id
                        JOIN company comp ON pr.company_id = comp.company_id
                        WHERE pd.expiry_date < CURDATE()
                          AND pd.quantity_remaining > 0;
                            ";
            var parameters = new[]
            {
                new MySqlParameter("@search", "%" + search + "%")
            };
            return db.ExecuteDataTable(query, parameters);
        }

        public DataTable GetExpiredProducts(string search = "")
        {
            string query = @"
                               SELECT 
                            pr.product_id,
                            pr.name AS product_name,
                            c.category_name,
                            pk.packing_name,
                            comp.company_name,
                            pd.batch_item_id,
                            pd.purchase_batch_id,
                            pd.quantity_remaining,
                            pd.expiry_date
                        FROM batch_items pd
                        JOIN medicines pr ON pd.product_id = pr.product_id
                        JOIN categories c ON pr.category_id = c.category_id
                        JOIN packing pk ON pr.packing_id = pk.packing_id
                        JOIN company comp ON pr.company_id = comp.company_id
                        WHERE pd.expiry_date < CURDATE()
                          AND pd.quantity_remaining > 0
                          AND (
                                 pr.name LIKE @search
                                OR c.category_name LIKE @search
                                OR pk.packing_name LIKE @search
                                OR comp.company_name LIKE @search
                            );
                            ";

            var parameters = new[]
            {
                    new MySqlParameter("@search", "%" + search + "%")
            };

            return db.ExecuteDataTable(query, parameters);
        }

        public bool MarkAsZero(int batchItemId)
        {
            string query = "UPDATE batch_items SET quantity_remaining = 0 WHERE batch_item_id = @id";
            var parameters = new[]
            {
        new MySqlParameter("@id", batchItemId)
    };
            return db.ExecuteNonQuery(query, parameters) > 0;
        }



    }
}