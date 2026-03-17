using System;
using System.Collections.Generic;
using System.Data;
using System.Windows.Forms;
using MedicineShop.DL;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.BL
{
    public class MedicineBL
    {
        private readonly MedicineDL _medicineDL = new MedicineDL();

        public DataTable GetMedicines() => _medicineDL.GetAllMedicines();        
        public int AddMedicine(Medicine med)
        {
            if (string.IsNullOrWhiteSpace(med.Name))
            {
                MessageBox.Show("Medicine name is required.");
                return 0;
            }
            // validate price
            if (!decimal.TryParse(med.SalePrice.ToString(), out decimal price) || price <= 0)
            {
                MessageBox.Show("Medicine price must be a valid positive number.");
                return 0;
            }
            if (med.CompanyId <= 0 || med.CategoryId <= 0 || med.PackingId<=0)
            {
                MessageBox.Show("Please select valid company and category or Packing.");
                return 0;
            }

            try
            {
                return _medicineDL.AddMedicine(med);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error adding medicine: " + ex.Message);
                return 0;
            }
        }

        public int UpdateMedicine(Medicine med)
        {
            if (med.ProductId <= 0)
            {
                MessageBox.Show("Invalid medicine ID.");
                return 0;
            }
            if (!decimal.TryParse(med.SalePrice.ToString(), out decimal price) || price <= 0)
            {
                MessageBox.Show("Medicine price must be a valid positive number.");
                return 0;
            }
            if (med.CompanyId <= 0 || med.CategoryId <= 0 || med.PackingId <= 0)
            {
                MessageBox.Show("Please select valid company and category or Packing.");
                return 0;
            }
            try
            {
                return _medicineDL.UpdateMedicine(med);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error updating medicine: " + ex.Message);
                return 0;
            }
        }

        public int DeleteMedicine(int id)
        {
            if (id <= 0)
            {
                MessageBox.Show("Invalid medicine ID.");
                return 0;
            }

            try
            {
                return _medicineDL.DeleteMedicine(id);
            }
            catch (MySqlException ex)
            {
                if (ex.Number == 1451) // FK violation
                {
                    MessageBox.Show("❌ Cannot delete this medicine because it is linked with sales or purchases.");
                    return 0;
                }
                else
                {
                    MessageBox.Show("Database Error: " + ex.Message);
                    return 0;
                }
            }
        }

        public DataTable SearchMedicines(string keyword)
        {
            try
            {
                return _medicineDL.SearchMedicines(keyword);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error searching medicines: " + ex.Message);
                return null;
            }
        }


        public List<ComboItem> GetCompanyList(string keyword)
        {
            return _medicineDL.GetCompanyList(keyword);
        }

        public List<ComboItem> GetCategoryList(string keyword)
        {
            return _medicineDL.GetCategoryList(keyword);
        }

        public List<ComboItem> GetPackingList(string keyword)
        {
            return _medicineDL.GetPackingList(keyword);
        }


    }
}
