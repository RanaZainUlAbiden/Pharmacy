using System;
using System.Data;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using MedicineShop.DL;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.BL
{
    public class CompanyBL
    {
        private readonly CompanyDL companyDL = new CompanyDL();

        //private bool IsValidContact(string contact)
        //{
        //    // Format: xxxx-xxxxxxx
        //    //return Regex.IsMatch(contact, @"^\d{4}-\d{7}$");
        //}

        public DataTable GetAllCompanies(string search = "")
        {
            return companyDL.GetAllCompanies(search);
        }

        public void AddCompany(Company company)
        {
            if (string.IsNullOrWhiteSpace(company.CompanyName))
                throw new Exception("Company name is required.");
            //if (!IsValidContact(company.Contact))
            //    throw new Exception("Contact must be in xxxx-xxxxxxx format.");
            if (string.IsNullOrWhiteSpace(company.Address))
                throw new Exception("Address is required.");

            companyDL.AddCompany(company);
        }

        public void UpdateCompany(Company company)
        {
            if (company.CompanyId <= 0)
                throw new Exception("Invalid company ID.");
            if (string.IsNullOrWhiteSpace(company.CompanyName))
                throw new Exception("Company name is required.");
            //if (!IsValidContact(company.Contact))
            //    throw new Exception("Contact must be in xxxx-xxxxxxx format.");
            if (string.IsNullOrWhiteSpace(company.Address))
                throw new Exception("Address is required.");

            companyDL.UpdateCompany(company);
        }

        public int DeleteCompany(int id)
        {
            if (id <= 0)
            {
                MessageBox.Show("❌ Invalid company ID.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 0;
            }

            try
            {
                return companyDL.DeleteCompany(id); // Pass to DL and return rows affected
            }
            catch (MySqlException ex)
            {
                if (ex.Number == 1451) // Foreign key violation
                {
                    MessageBox.Show("⚠️ This company cannot be deleted because medicines are linked to it.",
                        "Delete Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return 0;
                }
                else
                {
                    MessageBox.Show("❌ Database Error: " + ex.Message,
                        "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return 0;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("❌ Unexpected Error: " + ex.Message,
                    "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 0;
            }
        }


    }
}
