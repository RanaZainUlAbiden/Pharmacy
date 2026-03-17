using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MedicineShop.DL;
using MedicineShop.Models;
using MySql.Data.MySqlClient;
using System.Windows.Forms;

namespace MedicineShop.BL.Bl
{
    internal class CustomerBl
    {
        private readonly Customerdl companyDL = new Customerdl();

        //private bool IsValidContact(string contact)
        //{
        //    // Format: xxxx-xxxxxxx
        //    return Regex.IsMatch(contact, @"^\d{4}-\d{7}$");
        //}

        public DataTable GetAllCustomers(string search = "")
        {
            return companyDL.GetAllCustomers(search);
        }

        public void AddCompany(Customer cust)
        {
            if (string.IsNullOrWhiteSpace(cust.full_name))
                throw new Exception("customer name is required.");
            //if (!IsValidContact(cust.Contact))
            //    throw new Exception("Contact must be in xxxx-xxxxxxx format.");
            if (string.IsNullOrWhiteSpace(cust.Address))
                throw new Exception("Address is required.");

            companyDL.AddCustomer(cust);
        }

        public void UpdateCustomer(Customer cust)
        {
            if (cust.CustomerId <= 0)
                throw new Exception("Invalid customer ID.");
            if (string.IsNullOrWhiteSpace(cust.full_name))
                throw new Exception("Company name is required.");
            //if (!IsValidContact(cust.Contact))
            //    throw new Exception("Contact must be in xxxx-xxxxxxx format.");
            if (string.IsNullOrWhiteSpace(cust.Address))
                throw new Exception("Address is required.");

            companyDL.UpdateCustomer(cust);
        }

        public int DeleteCustomer(int id)
        {
            if (id <= 0)
            {
                MessageBox.Show("❌ Invalid customer ID.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 0;
            }

            try
            {
                return companyDL.DeleteCustomer(id); // Pass to DL and return rows affected
            }
            catch (MySqlException ex)
            {
                //if (ex.Number == 1451) // Foreign key violation
                //{
                //    MessageBox.Show("⚠️ This company cannot be deleted because medicines are linked to it.",
                //        "Delete Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                //    return 0;
                //}
                //else
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
