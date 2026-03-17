using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using MedicineShop.BL.Bl;
using MedicineShop.DL;
using MySql.Data.MySqlClient;
using TechStore.UI;

namespace MedicineShop.UI
{
    public partial class customerbillspecui : Form
    {
        private int customerId; // Changed from billId to customerId for clarity
        private readonly Icustomerbillbl ibl;

        public customerbillspecui(int customerId, Icustomerbillbl ibl)
        {
            InitializeComponent();
            this.ibl = ibl;
            this.customerId = customerId;
            UIHelper.StyleGridView(dataGridView1);
            UIHelper.StyleGridView(dataGridView2);
        }

        private void customerbillspecui_Load(object sender, EventArgs e)
        {
            LoadBillDetails(customerId);
            LoadHeaderInfo();
        }

        private void LoadBillDetails(int customerId)
        {
            // Load payment records for dataGridView1
            var billDetails = ibl.GetcustPaymentRecords(customerId);
            dataGridView1.DataSource = billDetails;
            dataGridView1.Columns["customerId"].Visible = false;
            dataGridView1.Columns["PaymentId"].Visible = false;
            dataGridView1.Columns["Status"].Visible = false;
            dataGridView1.Columns["TotalPrice"].Visible = false;
            dataGridView1.Columns["Paid"].Visible = false;
            dataGridView1.Columns["RemainingBalance"].Visible = false;
            dataGridView1.Columns["CustomerName"].Visible = false;

            // Load customer sales for dataGridView2 - one row per sale
            var salesDetails = GetCustomerSales(customerId);
            dataGridView2.DataSource = salesDetails.Select(sale => new
            {
                SaleId = sale.SaleId,
                SaleDate = sale.SaleDate.ToString("dd/MM/yyyy"),
                TotalAmount = sale.TotalAmount,
                PaidAmount = sale.PaidAmount,
                RemainingAmount = sale.RemainingAmount,
                Status = sale.Status
            }).ToList();

            // Configure columns
            ConfigureGridView2Columns();

            // Hide the SaleId column but keep it accessible
            if (dataGridView2.Columns["SaleId"] != null)
                dataGridView2.Columns["SaleId"].Visible = false;

            UIHelper.AddButtonColumn(dataGridView2, "Details", "Details", "Details");
        }

        private void ConfigureGridView2Columns()
        {
            // Configure column headers and formatting
            if (dataGridView2.Columns["SaleDate"] != null)
                dataGridView2.Columns["SaleDate"].HeaderText = "Sale Date";

            if (dataGridView2.Columns["TotalAmount"] != null)
            {
                dataGridView2.Columns["TotalAmount"].HeaderText = "Total Amount";
                dataGridView2.Columns["TotalAmount"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["PaidAmount"] != null)
            {
                dataGridView2.Columns["PaidAmount"].HeaderText = "Paid Amount";
                dataGridView2.Columns["PaidAmount"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["RemainingAmount"] != null)
            {
                dataGridView2.Columns["RemainingAmount"].HeaderText = "Remaining";
                dataGridView2.Columns["RemainingAmount"].DefaultCellStyle.Format = "N2";
            }

            if (dataGridView2.Columns["Status"] != null)
                dataGridView2.Columns["Status"].HeaderText = "Payment Status";
        }

        private List<CustomerSaleInfo> GetCustomerSales(int customerId)
        {
            var sales = new List<CustomerSaleInfo>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = @"
                        SELECT DISTINCT
                            s.sale_id,
                            s.sale_date,
                            s.total_amount,
                            s.paid_amount,
                            (s.total_amount - s.paid_amount) as remaining_amount,
                            CASE 
                                WHEN s.paid_amount >= s.total_amount THEN 'Paid'
                                WHEN s.paid_amount > 0 THEN 'Partial'
                                ELSE 'Unpaid'
                            END as status
                        FROM sales s
                        WHERE s.customer_id = @CustomerId
                        ORDER BY s.sale_date DESC";

                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@CustomerId", customerId);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                sales.Add(new CustomerSaleInfo
                                {
                                    SaleId = reader.GetInt32("sale_id"),
                                    SaleDate = reader.GetDateTime("sale_date"),
                                    TotalAmount = reader.GetDecimal("total_amount"),
                                    PaidAmount = reader.GetDecimal("paid_amount"),
                                    RemainingAmount = reader.GetDecimal("remaining_amount"),
                                    Status = reader.GetString("status")
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading customer sales: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            return sales;
        }

        private void LoadHeaderInfo()
        {
            var billList = ibl.GetCustomerBillById(customerId);
            if (billList != null && billList.Count > 0)
            {
                var bill = billList.First();
                lblname.Text = " " + bill.full_name;
                lbltotal.Text = " Rs. " + bill.total_amount.ToString("N2");
                lblpaid.Text = " Rs. " + bill.paid.ToString("N2");
                lblpending.Text = " Rs. " + bill.remaining.ToString("N2");
            }
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
                        // Get the SaleId from the selected row
                        var saleId = Convert.ToInt32(dataGridView2.Rows[e.RowIndex].Cells["SaleId"].Value);

                        // Create and show the SaleDetailsform with the specific sale ID
                        var saleDetailsForm = new SaleDetailsform();
                        saleDetailsForm.SaleId = saleId;  // Pass the sale ID instead of customer ID
                        saleDetailsForm.LoadSaleItems();   // Load items for this specific sale

                        saleDetailsForm.ShowDialog();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error opening sale details: {ex.Message}", "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        }

        // Helper class for customer sale information
        public class CustomerSaleInfo
        {
            public int SaleId { get; set; }
            public DateTime SaleDate { get; set; }
            public decimal TotalAmount { get; set; }
            public decimal PaidAmount { get; set; }
            public decimal RemainingAmount { get; set; }
            public string Status { get; set; }
        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {

        }
    }
}