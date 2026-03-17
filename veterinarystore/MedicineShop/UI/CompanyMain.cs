using System;
using System.Drawing;
using System.Windows.Controls;
using System.Windows.Forms;
using System.Xml.Linq;
using FontAwesome.Sharp;
using MedicineShop.BL;
using MedicineShop.DL;
using MedicineShop.Models;
using MySql.Data.MySqlClient;
using TechStore.UI;

namespace MedicineShop.UI
{
    public partial class CompanyMain : Form
    {
        private readonly CompanyBL companyBL = new CompanyBL();
        public CompanyMain()
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
                else if(keyData == (Keys.Control | Keys.E))
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
            if (grid.Columns.Contains("company_id"))
            {
                grid.Columns["company_id"].Visible = false;
            }
        }


        private void LoadCompanies(string search = "")
        {
            try
            {
                dataGridView1.DataSource = companyBL.GetAllCompanies(search);
                //UIHelper.AddButtonColumn(dataGridView1, "Details", "Details", "Details");
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

        private void btnAdd_Click(object sender, EventArgs e)
        {
            AddCompany form = new AddCompany();
            form.ShowDialog();
            LoadCompanies();
        }

        private void btnEdit_Click(object sender, EventArgs e)
        {
            if (dataGridView1.CurrentRow != null)
            {
                Company company = new Company
                {
                    CompanyId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["company_id"].Value),
                    CompanyName = dataGridView1.CurrentRow.Cells["company_name"].Value.ToString(),
                    Contact = dataGridView1.CurrentRow.Cells["contact"].Value.ToString(),
                    Address = dataGridView1.CurrentRow.Cells["address"].Value.ToString()
                };

                AddCompany form = new AddCompany(company);
                form.ShowDialog();
                LoadCompanies();
            }
            else
            {
                MessageBox.Show("Please select a company to edit.");
            }
        }

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (dataGridView1.CurrentRow != null)
            {
                int companyId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["company_id"].Value);

                DialogResult confirm = MessageBox.Show(
                    "Are you sure you want to delete this company?",
                    "Confirm Delete",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning);

                if (confirm == DialogResult.Yes)
                {
                    try
                    {
                        CompanyBL _companyBL = new CompanyBL();
                        int rowsAffected = _companyBL.DeleteCompany(companyId);

                        if (rowsAffected > 0)
                        {
                            MessageBox.Show("Company deleted successfully.");
                            LoadCompanies();
                        }
                        else
                        {
                            MessageBox.Show("Company not deleted. It might be in use by medicines.");
                        }
                    }
                    catch (MySqlException ex)
                    {
                        if (ex.Number == 1451) // Foreign key violation
                        {
                            MessageBox.Show("❌ Cannot delete this company because medicines are linked to it.\nRemove or update those medicines first.");
                        }
                        else
                        {
                            MessageBox.Show("Error: " + ex.Message);
                        }
                    }
                }
            }
            else
            {
                MessageBox.Show("Please select a company to delete.");
            }
        }


        private void s(object sender, DataGridViewCellEventArgs e)
        {
            
        }

        private void CompanyMain_Load(object sender, EventArgs e)
        {

        }

        private void panel1_Paint(object sender, PaintEventArgs e)
        {

        }
    }
}
