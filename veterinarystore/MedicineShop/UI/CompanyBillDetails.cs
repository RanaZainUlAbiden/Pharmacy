using MedicineShop.BL.Bl;
using MedicineShop.BL.Models;
using MedicineShop.DL;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Documents;
using System.Windows.Forms;
using TechStore.UI;

namespace MedicineShop.UI
{
    public partial class CompanyBillDetails : Form
    {
        private int companyId; // Changed from billId to companyId for clarity
        private readonly ICompanyBillBl ibl;

        public CompanyBillDetails(int companyId, ICompanyBillBl ibl)
        {
            InitializeComponent();
            this.companyId = companyId;
            this.ibl = ibl;
            UIHelper.StyleGridView(dataGridView1);
            UIHelper.StyleGridView(dataGridView2);
        }

        private void CompanyBillDetails_Load(object sender, EventArgs e)
        {
            LoadBillDetails(companyId);
            LoadHeaderInfo();
        }

        private void LoadBillDetails(int companyId)
        {
            // Load payment records for dataGridView1
            var billDetails = ibl.GetPaymentRecords(companyId);
            dataGridView1.DataSource = billDetails.Select(p => new { p.Amount, p.PaymentDate }).ToList();

            // Load batch information for dataGridView2 - one row per batch
            var batchesdetails = GetCompanyBatches(companyId);
            dataGridView2.DataSource = batchesdetails.Select(batch => new
            {
                BatchId = batch.BatchId,
                PurchaseDate = batch.PurchaseDate.ToString("dd/MM/yyyy"),
                BatchName = batch.BatchName,
                TotalPrice = batch.TotalPrice,
                Paid = batch.Paid,
                Status = batch.Status
            }).ToList();

            // Configure columns
            ConfigureGridView2Columns();

            // Hide the BatchId column but keep it accessible
            if (dataGridView2.Columns["BatchId"] != null)
                dataGridView2.Columns["BatchId"].Visible = false;

            UIHelper.AddButtonColumn(dataGridView2, "Details", "Details", "Details");
        }

        private void ConfigureGridView2Columns()
        {
            // Configure column headers and formatting
            if (dataGridView2.Columns["PurchaseDate"] != null)
                dataGridView2.Columns["PurchaseDate"].HeaderText = "Purchase Date";

            if (dataGridView2.Columns["BatchName"] != null)
                dataGridView2.Columns["BatchName"].HeaderText = "Batch Name";

            if (dataGridView2.Columns["TotalPrice"] != null)
            {
                dataGridView2.Columns["TotalPrice"].HeaderText = "Total Price";
                dataGridView2.Columns["TotalPrice"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["Paid"] != null)
            {
                dataGridView2.Columns["Paid"].HeaderText = "Paid Amount";
                dataGridView2.Columns["Paid"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["Status"] != null)
                dataGridView2.Columns["Status"].HeaderText = "Payment Status";
        }

        private List<BatchInfo> GetCompanyBatches(int companyId)
        {
            var batches = new List<BatchInfo>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = @"
                        SELECT DISTINCT
                            pb.purchase_batch_id,
                            pb.purchase_date,
                            pb.BatchName,
                            pb.total_price,
                            pb.paid,
                            CASE 
                                WHEN pb.paid >= pb.total_price THEN 'Paid'
                                WHEN pb.paid > 0 THEN 'Partial'
                                ELSE 'Unpaid'
                            END as status
                        FROM purchase_batches pb
                        WHERE pb.company_id = @CompanyId
                        ORDER BY pb.purchase_date DESC";

                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@CompanyId", companyId);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                batches.Add(new BatchInfo
                                {
                                    BatchId = reader.GetInt32("purchase_batch_id"),
                                    PurchaseDate = reader.GetDateTime("purchase_date"),
                                    BatchName = reader.GetString("BatchName"),
                                    TotalPrice = reader.GetDecimal("total_price"),
                                    Paid = reader.GetDecimal("paid"),
                                    Status = reader.GetString("status")
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading batch information: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            return batches;
        }

        // Helper class for batch information
        public class BatchInfo
        {
            public int BatchId { get; set; }
            public DateTime PurchaseDate { get; set; }
            public string BatchName { get; set; }
            public decimal TotalPrice { get; set; }
            public decimal Paid { get; set; }
            public string Status { get; set; }
        }

        private void LoadHeaderInfo()
        {
            var billList = ibl.GetCompanyBillById(companyId);
            if (billList != null && billList.Count > 0)
            {
                var bill = billList.First();
                lblname.Text = " " + bill.company_name;
                lbltotal.Text = " Rs. " + bill.total_price.ToString("N2");
                lblpaid.Text = " Rs. " + bill.paid.ToString("N2");
                lblpending.Text = " Rs. " + bill.remaining.ToString("N2");
            }
        }

        private void iconButton1_Click(object sender, EventArgs e)
        {
            //var f = new CompanyBill(SelectedId, ibl);
            //this.Close();
            //f.ShowDialog();
        }

        private void dataGridView2_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            // Check if the clicked cell is in the "Details" button column
            if (e.ColumnIndex >= 0 && e.RowIndex >= 0)
            {
                var columnName = dataGridView2.Columns[e.ColumnIndex].Name;

                if (columnName == "Details")
                {
                    try
                    {
                        // Get the BatchId from the selected row
                        // Since BatchId column is hidden, we need to access it by name
                        var batchId = Convert.ToInt32(dataGridView2.Rows[e.RowIndex].Cells["BatchId"].Value);

                        // Create and show the BatchDetailsform
                        var batchDetailsForm = new BatchDetailsform();
                        batchDetailsForm.BatchId = batchId;

                        // Load the batch details in the form
                        batchDetailsForm.LoadBatchDetails();

                        batchDetailsForm.ShowDialog();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error opening batch details: {ex.Message}", "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {

        }
    }
}