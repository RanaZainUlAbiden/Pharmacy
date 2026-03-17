using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using MedicineShop.BL;
using MedicineShop.BL.Bl;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.UI
{
    public partial class Customermain : Form
    {
        private readonly CustomerBl customerbl = new CustomerBl();

        public Customermain()
        {
            InitializeComponent();
            LoadCompanies();
            CustomizeGrid();
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == (Keys.Control | Keys.A))
                {
                    btnAdd.PerformClick();
                    return true;
                }
                else if (keyData == (Keys.Control | Keys.E))
                {
                    btnEdit.PerformClick();
                    return true;
                }

                else if (keyData == Keys.Delete)
                {
                    btnDelete.PerformClick();
                    return true;
                }

            }
            catch (Exception ex)
            {
                MessageBox.Show("error in event listener", ex.Message);
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void CustomizeGrid()
        {
            var grid = dataGridView1;

            grid.BorderStyle = BorderStyle.None;
            grid.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(238, 239, 249);
            grid.CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal;
            grid.DefaultCellStyle.SelectionBackColor = Color.SeaGreen;
            grid.DefaultCellStyle.SelectionForeColor = Color.WhiteSmoke;
            grid.BackgroundColor = Color.White;

            grid.EnableHeadersVisualStyles = false;
            grid.ColumnHeadersBorderStyle = DataGridViewHeaderBorderStyle.None;
            grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(20, 25, 72);
            grid.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 16, FontStyle.Bold);

            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            grid.DefaultCellStyle.Font = new Font("Segoe UI", 10);
            grid.RowTemplate.Height = 35;
            grid.AllowUserToAddRows = false;
            grid.ReadOnly = true;

            // Optional: Hide ID column
            if (grid.Columns.Contains("customer_id"))
            {
                grid.Columns["customer_id"].Visible = false;
            }
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            Addcustomer form = new Addcustomer();
            form.ShowDialog();
            LoadCompanies();
        }

         private void LoadCompanies(string search = "")
        {
            try
            {
                dataGridView1.DataSource = customerbl.GetAllCustomers(search);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void txtSearch_TextChanged(object sender, EventArgs e)
        {
            LoadCompanies(txtSearch.Text);
        }

        private void btnEdit_Click(object sender, EventArgs e)
        {
            if (dataGridView1.CurrentRow != null)
            {
                Customer customer = new Customer
                {
                    CustomerId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["customer_id"].Value),
                    full_name = dataGridView1.CurrentRow.Cells["full_name"].Value.ToString(),
                    Contact = dataGridView1.CurrentRow.Cells["phone"].Value.ToString(),
                    Address = dataGridView1.CurrentRow.Cells["address"].Value.ToString()
                };

                Addcustomer form = new Addcustomer(customer);
                form.ShowDialog();
                LoadCompanies();
            }
            else
            {
                MessageBox.Show("Please select a Customer to edit.");
            }
        }

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (dataGridView1.CurrentRow != null)
            {
                int customerID = Convert.ToInt32(dataGridView1.CurrentRow.Cells["customer_id"].Value);

                DialogResult confirm = MessageBox.Show(
                    "Are you sure you want to delete this customer?",
                    "Confirm Delete",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning);

                if (confirm == DialogResult.Yes)
                {
                    try
                    {
                        CustomerBl _customerBL = new CustomerBl();
                        int rowsAffected = _customerBL.DeleteCustomer(customerID);

                        if (rowsAffected > 0)
                        {
                            MessageBox.Show("customer deleted successfully.");
                            LoadCompanies();
                        }
                        else
                        {
                            MessageBox.Show("customer not deleted. It might be in use by medicines.");
                        }
                    }
                    catch (MySqlException ex)
                    {
                        //if (ex.Number == 1451) // Foreign key violation
                        //{
                        //    MessageBox.Show("❌ Cannot delete this company because medicines are linked to it.\nRemove or update those medicines first.");
                        //}
                        //else
                        {
                            MessageBox.Show("Error: " + ex.Message);
                        }
                    }
                }
            }
            else
            {
                MessageBox.Show("Please select a customer to delete.");
            }
        }

        private void Customermain_Load(object sender, EventArgs e)
        {

        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {

        }
    }
}
