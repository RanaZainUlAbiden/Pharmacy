using System;
using MedicineShop.Interfaces.DLInterfaces;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.DL
{
    public class CategoryDL:ICategoryDL
    {
        private readonly DatabaseHelper _db = DatabaseHelper.Instance;

        public int AddCategory(Category category)
        {
            string query = "INSERT INTO categories (category_name) VALUES (@name)";
            MySqlParameter[] parameters =
            {
                new MySqlParameter("@name", category.CategoryName)
            };

            return _db.ExecuteNonQuery(query, parameters);
        }
    }
}
