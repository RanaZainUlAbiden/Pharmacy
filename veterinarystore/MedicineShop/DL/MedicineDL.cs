using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using MedicineShop.Interfaces.DLInterfaces;
using MedicineShop.Models;
using MySql.Data.MySqlClient;
using static System.Net.Mime.MediaTypeNames;

namespace MedicineShop.DL
{
    public class MedicineDL:IMedicineDL
    {
        public int AddMedicine(Medicine medicine)
        {
            string query = @"INSERT INTO medicines 
                (name, description, company_id, Category_id, packing_Id, sale_price,minimum_threshold) 
                VALUES (@name, @desc, @companyId, @catId, @packing, @price,@threshold)";

            MySqlParameter[] parameters =
            {
                new MySqlParameter("@name", medicine.Name),
                new MySqlParameter("@desc", medicine.Description),
                new MySqlParameter("@companyId", medicine.CompanyId),
                new MySqlParameter("@catId", medicine.CategoryId),
                new MySqlParameter("@packing", medicine.PackingId),
                new MySqlParameter("@price", medicine.SalePrice),
                new MySqlParameter("@threshold", medicine.minimum_threshold)
            };

            return DatabaseHelper.Instance.ExecuteNonQuery(query, parameters);
        }

        public int UpdateMedicine(Medicine medicine)
        {

            string query = @"UPDATE medicines 
                SET name=@name, description=@desc, company_id=@companyId, category_id=@catId, packing_Id=@packing, sale_price=@price,minimum_threshold=@threshold
                WHERE product_id=@id";

            MySqlParameter[] parameters =
            {
                new MySqlParameter("@id", medicine.ProductId),
                new MySqlParameter("@name", medicine.Name),
                new MySqlParameter("@desc", medicine.Description),
                new MySqlParameter("@companyId", medicine.CompanyId),
                new MySqlParameter("@catId", medicine.CategoryId),
                new MySqlParameter("@packing", medicine.PackingId),
                new MySqlParameter("@price", medicine.SalePrice),
                new MySqlParameter("@threshold", medicine.minimum_threshold)
            };

            return DatabaseHelper.Instance.ExecuteNonQuery(query, parameters);
        }

        public int DeleteMedicine(int id)
        {
            string query = "DELETE FROM medicines WHERE product_id=@id";
            MySqlParameter[] parameters = { new MySqlParameter("@id", id) };

            return DatabaseHelper.Instance.ExecuteNonQuery(query, parameters);
        }

        //public DataTable GetAllMedicines()
        //{
        //    DataTable dt = new DataTable();
        //    using (var con = DatabaseHelper.Instance.GetConnection())
        //    {
        //        con.Open();
        //        string query = @"SELECT 
        //                                m.name, 
        //                                c.company_name, 
        //                                m.sale_price,
        //                                b.quantity_remaining,
        //                                p.packing_name, 
        //                                ca.category_name, 
        //                                b.expiry_date
        //                            FROM batch_items b
        //                            JOIN medicines m ON m.product_id = b.product_id
        //                            JOIN company c ON c.company_id = m.company_id
        //                            JOIN packing p ON m.packing_id = p.packing_id
        //                            JOIN categories ca ON ca.category_id = m.category_id
        //                            ORDER BY m.name, b.expiry_date;
        //                            ";

        //        using (MySqlCommand cmd = new MySqlCommand(query, con))
        //        {
        //            //cmd.Parameters.AddWithValue("@text", "%" + text + "%");

        //            using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
        //            {
        //                adapter.Fill(dt);
        //            }
        //        }
        //    }
        //    return dt;
        //}

        public DataTable GetAllMedicines()
        {
            string query = @"SELECT m.product_id, m.name, m.description, c.company_name,p.packing_name,cat.category_name, m.packing_id, m.sale_price,m.minimum_threshold, m.company_id, m.category_id
                      FROM medicines m
                      JOIN company c ON m.company_id = c.company_id
                      JOIN packing p ON m.packing_id = p.packing_id
                      JOIN categories cat ON m.Category_id = cat.category_id";

            return DatabaseHelper.Instance.ExecuteDataTable(query);
        }

        public DataTable SearchMedicines(string keyword)
        {
            string query = @"SELECT m.product_id, m.name, m.description, c.company_name, cat.category_name, 
                            m.packing_id,p.packing_name,m.sale_price,m.minimum_threshold, m.company_id, m.Category_id
                     FROM medicines m
                     JOIN company c ON m.company_id = c.company_id
                     JOIN packing p ON m.packing_id = p.packing_id
                     JOIN categories cat ON m.Category_id = cat.category_id
                     WHERE m.name LIKE @keyword 
                        OR c.company_name LIKE @keyword
                        OR cat.category_name LIKE @keyword";

            MySqlParameter[] parameters =
            {
        new MySqlParameter("@keyword", "%" + keyword + "%")
    };

            return DatabaseHelper.Instance.ExecuteDataTable(query, parameters);
        }

        //next

        public List<ComboItem> GetCompanyList(string keyword)
        {
            string query = "SELECT company_id, company_name FROM company WHERE company_name LIKE @keyword LIMIT 20";
            MySqlParameter[] parameters = {
        new MySqlParameter("@keyword", "%" + keyword + "%")
    };

            List<ComboItem> companies = new List<ComboItem>();
            using (var reader = DatabaseHelper.Instance.ExecuteReader(query, parameters))
            {
                while (reader.Read())
                {
                    companies.Add(new ComboItem
                    {
                        Id = Convert.ToInt32(reader["company_id"]),
                        Name = reader["company_name"].ToString()
                    });
                }
            }
            return companies;
        }

        public List<ComboItem> GetCategoryList(string keyword)
        {
            string query = "SELECT category_id, category_name FROM categories WHERE category_name LIKE @keyword LIMIT 20";
            MySqlParameter[] parameters = {
        new MySqlParameter("@keyword", "%" + keyword + "%")
    };

            List<ComboItem> categories = new List<ComboItem>();
            using (var reader = DatabaseHelper.Instance.ExecuteReader(query, parameters))
            {
                while (reader.Read())
                {
                    categories.Add(new ComboItem
                    {
                        Id = Convert.ToInt32(reader["category_id"]),
                        Name = reader["category_name"].ToString()
                    });
                }
            }
            return categories;
        }

        public List<ComboItem> GetPackingList(string keyword)
        {
            string query = "SELECT packing_id, packing_name FROM packing WHERE packing_name LIKE @keyword LIMIT 20";
            MySqlParameter[] parameters = {
        new MySqlParameter("@keyword", "%" + keyword + "%")
    };

            List<ComboItem> packing = new List<ComboItem>();
            using (var reader = DatabaseHelper.Instance.ExecuteReader(query, parameters))
            {
                while (reader.Read())
                {
                    packing.Add(new ComboItem
                    {
                        Id = Convert.ToInt32(reader["packing_id"]),
                        Name = reader["packing_name"].ToString()
                    });
                }
            }
            return packing;
        }

       
    }
}
