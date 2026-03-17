using System;
using System.Data;
using MySql.Data.MySqlClient;
using MedicineShop.Models;
using MedicineShop.Interfaces.DLInterfaces;

namespace MedicineShop.DL
{
    public class CompanyDL:ICompanyDL
    {
        private readonly DatabaseHelper db = DatabaseHelper.Instance;

        public DataTable GetAllCompanies(string search = "")
        {
            string query = "SELECT * FROM company WHERE company_name LIKE @search";
            var parameters = new[]
            {
                new MySqlParameter("@search", "%" + search + "%")
            };
            return db.ExecuteDataTable(query, parameters);
        }

        public void AddCompany(Company company)
        {
            string query = "INSERT INTO company (company_name, contact, address) VALUES (@name, @contact, @address)";
            var parameters = new[]
            {
                new MySqlParameter("@name", company.CompanyName),
                new MySqlParameter("@contact", company.Contact),
                new MySqlParameter("@address", company.Address)
            };
            db.ExecuteNonQuery(query, parameters);
        }

        public void UpdateCompany(Company company)
        {
            string query = "UPDATE company SET company_name=@name, contact=@contact, address=@address WHERE company_id=@id";
            var parameters = new[]
            {
                new MySqlParameter("@id", company.CompanyId),
                new MySqlParameter("@name", company.CompanyName),
                new MySqlParameter("@contact", company.Contact),
                new MySqlParameter("@address", company.Address)
            };
            db.ExecuteNonQuery(query, parameters);
        }

        public int DeleteCompany(int id)
        {
            string query = "DELETE FROM company WHERE company_id = @id";
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
