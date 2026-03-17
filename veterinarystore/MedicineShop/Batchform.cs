using MedicineShop.BL;
using MedicineShop.UI;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using TechStore.UI;

namespace MedicineShop
{
    public partial class Batchform : Form
    {
        IBatchesBl bl;
        private int SelectedId;
        int batchid;

        public Batchform(IBatchesBl bl)
        {
            InitializeComponent();
            this.bl = bl;
            panelbill.Visible = false;
        }

        private void Batchform_Load(object sender, EventArgs e)
        {
            load();
        }

        private void load()
        {
            var list = bl.GetAllBatches();
            dataGridView2.DataSource = list;
            dataGridView2.Columns["CompanyID"].Visible = false;
            dataGridView2.Columns["PurchaseBatchID"].Visible = false;
            UIHelper.StyleGridView(dataGridView2);

            // Add both Edit and Add Details buttons
            UIHelper.AddButtonColumn(dataGridView2, "Edit", "Edit", "Edit");
            UIHelper.AddButtonColumn(dataGridView2, "AddDetails", "Add Details", "Add Details");
        }

        private void iconButton1_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<AddBatchdetailsform>();
            Dashboard.Instance.LoadFormIntoPanel(f);
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            string searchTerm = textBox1.Text.Trim();
            var filteredList = bl.SearchBatches(searchTerm);
            dataGridView2.DataSource = filteredList;
            dataGridView2.Columns["CompanyID"].Visible = false;
            dataGridView2.Columns["PurchaseBatchID"].Visible = false;

            UIHelper.StyleGridView(dataGridView2);
            UIHelper.AddButtonColumn(dataGridView2, "Edit", "Edit", "Edit");
            UIHelper.AddButtonColumn(dataGridView2, "AddDetails", "Add Details", "Add Details");

            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                load();
            }
        }

        private void dataGridView2_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || e.ColumnIndex < 0)
                return;

            var row = dataGridView2.Rows[e.RowIndex];
            SelectedId = Convert.ToInt32(row.Cells["PurchaseBatchID"].Value);
            string columnName = dataGridView2.Columns[e.ColumnIndex].Name;

            if (columnName == "Edit")
            {
                txtSupplierName.Text = row.Cells["CompanyName"].Value.ToString();
                txtbatch.Text = row.Cells["BatchName"].Value.ToString();
                txtTotal.Text = row.Cells["TotalPrice"].Value.ToString();
                txtpayment.Text = row.Cells["Paid"].Value.ToString();
                txtDate.Text = row.Cells["PurchaseDate"].Value.ToString();
                panelbill.Visible = true;
                UIHelper.RoundPanelCorners(panelbill, 20);
            }
            else if (columnName == "AddDetails")
            {
                // Open AddBatchdetailsform with existing batch loaded
                OpenAddDetailsForm(row);
            }
        }

        private void OpenAddDetailsForm(DataGridViewRow row)
        {
            try
            {
                string batchName = row.Cells["BatchName"].Value.ToString();
                int batchId = Convert.ToInt32(row.Cells["PurchaseBatchID"].Value);

                var f = Program.ServiceProvider.GetRequiredService<AddBatchdetailsform>();

                // Load existing batch into the form
                f.LoadExistingBatch(batchId, batchName);

                Dashboard.Instance.LoadFormIntoPanel(f);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error opening batch details: {ex.Message}",
                    "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void iconButton5_Click(object sender, EventArgs e)
        {
            string batchName = txtbatch.Text.Trim();
            string supplierName = txtSupplierName.Text.Trim();
            decimal totalPrice = decimal.TryParse(txtTotal.Text.Trim(), out var tp) ? tp : 0;
            decimal paid = decimal.TryParse(txtpayment.Text.Trim(), out var p) ? p : 0;
            DateTime purchaseDate = DateTime.TryParse(txtDate.Text.Trim(), out var pd) ? pd : DateTime.Now;

            if (string.IsNullOrWhiteSpace(batchName) || string.IsNullOrWhiteSpace(supplierName))
            {
                MessageBox.Show("Batch name and Supplier name cannot be empty.",
                    "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (totalPrice < 0 || paid < 0)
            {
                MessageBox.Show("Price values cannot be negative.",
                    "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            var batch = bl.GetBatchById(SelectedId);
            if (batch == null)
            {
                MessageBox.Show("Batch not found.", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            batch.BatchName = batchName;
            batch.CompanyName = supplierName;
            batch.TotalPrice = totalPrice;
            batch.Paid = paid;
            batch.PurchaseDate = purchaseDate;

            try
            {
                bool success = bl.UpdateBatch(batch);
                if (success)
                {
                    MessageBox.Show("Batch updated successfully.", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    panelbill.Visible = false;
                    load();
                }
                else
                {
                    MessageBox.Show("Failed to update batch.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"An error occurred: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void iconButton4_Click(object sender, EventArgs e)
        {
            panelbill.Visible = false;
        }
    }
}