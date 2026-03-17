using MedicineShop.BL;
using MedicineShop.BL.Models;
using MedicineShop.DL;
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

namespace MedicineShop.UI
{
    public partial class BatchDetailsform : Form
    {
        public int BatchId { get; set; }
        private List<BatchItems> allBatchItems;

        public BatchDetailsform()
        {
            InitializeComponent();
            UIHelper.StyleGridView(dataGridView2);

            // Add search functionality if you have a search textbox
            // Assuming you have a textbox named txtSearch for searching
            if (this.Controls.Find("txtSearch", true).FirstOrDefault() is TextBox searchBox)
            {
                searchBox.TextChanged += TxtSearch_TextChanged;
            }
        }

        public void LoadBatchDetails()
        {
            try
            {
                // Load all batch items for the specified BatchId using the static method
                allBatchItems = BatchItemsDl.GetBatchItemsByBatchId(BatchId);

                // Bind to DataGridView
                dataGridView2.DataSource = allBatchItems.Select(item => new
                {
                    BatchItemID = item.BatchItemID,
                    BatchName = item.batchname,
                    MedicineName = item.MedicineName,
                    CompanyName = item.CompanyName,
                    Quantity = item.Quantity,
                    PurchasePrice = item.PurchasePrice,
                    SalePrice = item.SalePrice,
                    ExpiryDate = item.ExpiryDate.ToString("dd/MM/yyyy")
                }).ToList();

                // Configure columns
                ConfigureGridColumns();

                // Update form title or label to show batch information
                if (allBatchItems.Any())
                {
                    this.Text = $"Batch Details - {allBatchItems.First().batchname}";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading batch details: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ConfigureGridColumns()
        {
            // Configure column headers and formatting
            if (dataGridView2.Columns["BatchItemID"] != null)
                dataGridView2.Columns["BatchItemID"].HeaderText = "Item ID";

            if (dataGridView2.Columns["BatchName"] != null)
                dataGridView2.Columns["BatchName"].HeaderText = "Batch Name";

            if (dataGridView2.Columns["MedicineName"] != null)
                dataGridView2.Columns["MedicineName"].HeaderText = "Medicine Name";

            if (dataGridView2.Columns["CompanyName"] != null)
                dataGridView2.Columns["CompanyName"].HeaderText = "Company";

            if (dataGridView2.Columns["Quantity"] != null)
                dataGridView2.Columns["Quantity"].HeaderText = "Quantity";

            if (dataGridView2.Columns["PurchasePrice"] != null)
            {
                dataGridView2.Columns["PurchasePrice"].HeaderText = "Purchase Price";
                dataGridView2.Columns["PurchasePrice"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["SalePrice"] != null)
            {
                dataGridView2.Columns["SalePrice"].HeaderText = "Sale Price";
                dataGridView2.Columns["SalePrice"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["ExpiryDate"] != null)
                dataGridView2.Columns["ExpiryDate"].HeaderText = "Expiry Date";
        }

        private void TxtSearch_TextChanged(object sender, EventArgs e)
        {
            var searchBox = sender as TextBox;
            if (searchBox != null && BatchId > 0)
            {
                try
                {
                    List<BatchItems> filteredItems;

                    if (string.IsNullOrWhiteSpace(searchBox.Text))
                    {
                        // Show all items if search is empty
                        filteredItems = allBatchItems ?? new List<BatchItems>();
                    }
                    else
                    {
                        // Use the static search method
                        filteredItems = BatchItemsDl.SearchBatchDetails(BatchId, searchBox.Text);
                    }

                    // Update the DataGridView with filtered results
                    dataGridView2.DataSource = filteredItems.Select(item => new
                    {
                        BatchItemID = item.BatchItemID,
                        BatchName = item.batchname,
                        MedicineName = item.MedicineName,
                        CompanyName = item.CompanyName,
                        Quantity = item.Quantity,
                        PurchasePrice = item.PurchasePrice,
                        SalePrice = item.SalePrice,
                        ExpiryDate = item.ExpiryDate.ToString("dd/MM/yyyy")
                    }).ToList();

                    ConfigureGridColumns();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error searching batch details: {ex.Message}", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        // Method to refresh the data
        public void RefreshData()
        {
            LoadBatchDetails();
        }

        private void BatchDetailsform_Load(object sender, EventArgs e)
        {

        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }
    }
}