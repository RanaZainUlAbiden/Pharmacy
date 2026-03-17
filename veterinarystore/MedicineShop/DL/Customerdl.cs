using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.BL.Models;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.DL
{
    internal class Customerdl
    {
        private readonly DatabaseHelper db = DatabaseHelper.Instance;

        public DataTable GetAllCustomers(string search = "")
        {
            string query = "SELECT * FROM customers WHERE full_name LIKE @search and customer_id != 1";
            var parameters = new[]
            {
                new MySqlParameter("@search", "%" + search + "%")
            };
            return db.ExecuteDataTable(query, parameters);
        }

        public void AddCustomer(Customer cust)
        {
            string query = "INSERT INTO customers (full_name, phone, address) VALUES (@name, @contact, @address)";
            var parameters = new[]
            {
                new MySqlParameter("@name",  cust.full_name),
                new MySqlParameter("@contact", cust.Contact),
                new MySqlParameter("@address", cust.Address)
            };
            db.ExecuteNonQuery(query, parameters);
        }

        public void UpdateCustomer(Customer cust)
        {
            string query = "UPDATE customers SET full_name=@name, phone=@contact, address=@address WHERE customer_id=@id";
            var parameters = new[]
            {
                new MySqlParameter("@id", cust.CustomerId),
                new MySqlParameter("@name", cust.full_name),
                new MySqlParameter("@contact", cust.Contact),
                new MySqlParameter("@address", cust.Address)
            };
            db.ExecuteNonQuery(query, parameters);
        }

        public int DeleteCustomer(int id)
        {
            string query = "DELETE FROM customers WHERE customer_id = @id";
            MySqlParameter[] parameters = {
        new MySqlParameter("@id", id)
    };

            try
            {
                return DatabaseHelper.Instance.ExecuteNonQuery(query, parameters);
            }
            catch (MySqlException ex)
            {
                if (ex.Number == 1451) // Foreign key violation
                {
                    throw; // Let BL handle the user-friendly message
                }
                else
                {
                    throw; // Re-throw other DB errors
                }
            }
        }

    }
}
