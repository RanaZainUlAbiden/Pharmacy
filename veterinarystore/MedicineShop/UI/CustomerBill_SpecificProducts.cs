using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using fertilizesop.BL.Bl;
using fertilizesop.DL;
using FontAwesome.Sharp;
using Microsoft.Extensions.DependencyInjection;

namespace fertilizesop.UI
{
    public partial class CustomerBill_SpecificProducts : Form
    {
        private IconButton currentBtn;
        private readonly CustomerBill_SpecificProductsBL _billBL;
        private int _currentBillId;


        private readonly Color[] sidebarColors = new Color[]
        {
            Color.FromArgb(0, 126, 250),   // Tech Blue
            Color.FromArgb(0, 207, 255),   // Sky Cyan
            Color.FromArgb(26, 188, 156),  // Lime Mint
            Color.FromArgb(255, 140, 66),  // Coral Orange
            Color.FromArgb(155, 89, 182),  // Soft Purple
            Color.FromArgb(46, 204, 113),  // Leaf Green
            Color.FromArgb(231, 76, 60)    // Rose Red
        };

        public CustomerBill_SpecificProducts(int billId)
        {
            InitializeComponent();
            _billBL = new CustomerBill_SpecificProductsBL();
            _currentBillId = billId;
            this.Load += CustomerBill_SpecificProducts_Load;
            btnBack.Click += BtnBack_Click;
        }

        private async void CustomerBill_SpecificProducts_Load(object sender, EventArgs e)
        {
            try
            {
                await LoadBillDataAsync();
                await LoadPaymentsAsync();
                StyleDataGridView();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading bill data: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async Task LoadBillDataAsync()
        {
            // Load bill summary
            DataTable billSummary = await Task.Run(() => _billBL.GetBillSummary(_currentBillId));
            if (billSummary.Rows.Count > 0)
            {
                DataRow row = billSummary.Rows[0];
                lblname.Invoke((MethodInvoker)(() => lblname.Text = row["CustomerName"].ToString()));
                lbltotal.Invoke((MethodInvoker)(() => lbltotal.Text = _billBL.FormatCurrency(
                    Convert.ToDecimal(row["TotalAmount"]))));
                lblpaid.Invoke((MethodInvoker)(() => lblpaid.Text = _billBL.FormatCurrency(
                    Convert.ToDecimal(row["PaidAmount"]))));
                lblpending.Invoke((MethodInvoker)(() => lblpending.Text = _billBL.FormatCurrency(
                    Convert.ToDecimal(row["PendingAmount"]))));
            }

            // Load bill details
            DataTable billDetails = await Task.Run(() => _billBL.GetBillDetails(_currentBillId));
            dataGridView2.Invoke((MethodInvoker)(() =>
            {
                dataGridView2.DataSource = billDetails;
                StyleDataGridView();
            }));
        }

        private async Task LoadPaymentsAsync()
        {
            var list = await Task.Run(() => BillingRecordsOverviewDL.getrecord(_currentBillId));
            dataGridView1.Invoke((MethodInvoker)(() =>
            {
                dataGridView1.DataSource = list;
                StylePaymentsGrid();

                // Hide internal columns
                if (dataGridView1.Columns.Contains("name")) dataGridView1.Columns["name"].Visible = false;
                if (dataGridView1.Columns.Contains("suppid")) dataGridView1.Columns["suppid"].Visible = false;
                if (dataGridView1.Columns.Contains("bill_id")) dataGridView1.Columns["bill_id"].Visible = false;
                if (dataGridView1.Columns.Contains("id")) dataGridView1.Columns["id"].Visible = false;
            }));
        }

        private void StyleDataGridView()
        {
            dataGridView2.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridView2.RowHeadersVisible = false;
            dataGridView2.AllowUserToAddRows = false;
            dataGridView2.ReadOnly = true;
            dataGridView2.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridView2.DefaultCellStyle.Font = new Font("Segoe UI", 10);
            dataGridView2.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            dataGridView2.AlternatingRowsDefaultCellStyle.BackColor = Color.LightGray;

            // Format currency columns
            dataGridView2.CellFormatting += (sender, e) =>
            {
                if (e.Value == null) return;

                string[] currencyColumns = { "UnitPrice", "TotalPrice" };
                if (Array.Exists(currencyColumns, col => col == dataGridView2.Columns[e.ColumnIndex].Name))
                {
                    if (decimal.TryParse(e.Value.ToString(), out decimal amount))
                    {
                        e.Value = _billBL.FormatCurrency(amount);
                        e.CellStyle.Alignment = DataGridViewContentAlignment.MiddleRight;
                    }
                }
            };
        }
        //private void StyleDataGridView()
        //{
        //    dgvBillDetails.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        //    dgvBillDetails.RowHeadersVisible = false;
        //    dgvBillDetails.AllowUserToAddRows = false;
        //    dgvBillDetails.ReadOnly = true;
        //    dgvBillDetails.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        //    dgvBillDetails.DefaultCellStyle.Font = new Font("Segoe UI", 10);
        //    dgvBillDetails.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
        //    dgvBillDetails.AlternatingRowsDefaultCellStyle.BackColor = Color.LightGray;

        //    // Remove currency formatting from DataGridView since we're doing it in the DataTable
        //    // The values will already be formatted as strings with "Rs." prefix
        //}

        //private void StyleDataGridView()
        //{
        //    dgvBillDetails.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        //    dgvBillDetails.RowHeadersVisible = false;
        //    dgvBillDetails.AllowUserToAddRows = false;
        //    dgvBillDetails.ReadOnly = true;
        //    dgvBillDetails.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        //    dgvBillDetails.DefaultCellStyle.Font = new Font("Segoe UI", 10);
        //    dgvBillDetails.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
        //    dgvBillDetails.AlternatingRowsDefaultCellStyle.BackColor = Color.LightGray;

        //    // Format currency columns
        //    if (dgvBillDetails.Columns.Contains("UnitPrice"))
        //        dgvBillDetails.Columns["UnitPrice"].DefaultCellStyle.Format = "C";
        //    if (dgvBillDetails.Columns.Contains("TotalPrice"))
        //        dgvBillDetails.Columns["TotalPrice"].DefaultCellStyle.Format = "C";
        //}

        private void BtnBack_Click(object sender, EventArgs e)
        {
            this.Close();
        }

        private void activebutton(object senderbtn, Color color)
        {
            disablebutton();
            currentBtn = (IconButton)senderbtn;
            currentBtn.BackColor = Color.FromArgb(5, 51, 69);
            currentBtn.ForeColor = color;
            currentBtn.TextAlign = ContentAlignment.MiddleCenter;
            currentBtn.IconColor = color;
            currentBtn.TextImageRelation = TextImageRelation.TextBeforeImage;
            currentBtn.ImageAlign = ContentAlignment.MiddleRight;
        }

        private void disablebutton()
        {
            if (currentBtn != null)
            {
                currentBtn.BackColor = Color.Transparent;
                currentBtn.ForeColor = Color.White;
                currentBtn.TextAlign = ContentAlignment.MiddleLeft;
                currentBtn.IconColor = Color.White;
                currentBtn.TextImageRelation = TextImageRelation.ImageBeforeText;
                currentBtn.ImageAlign = ContentAlignment.MiddleLeft;
            }
        }

        #region Navigation Methods
       

        private void btnreport_Click(object sender, EventArgs e)
        {
            activebutton(sender, sidebarColors[5]);
            //var f = Program.ServiceProvider.GetRequiredService<Reportform>();
            //f.Show();
            this.Close();
        }

        private void btnlogout_Click(object sender, EventArgs e)
        {
            activebutton(sender, sidebarColors[6]);
            if (MessageBox.Show("Are you sure you want to logout?", "Confirm Logout",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            {
                //var login = Program.ServiceProvider.GetRequiredService<Login>();
                this.Hide();
                //login.Show();
            }
        }
        #endregion

        private async Task FadeOutFormAsync(Form form)
        {
            if (form == null || form.IsDisposed || !form.IsHandleCreated)
                return;

            try
            {
                while (form.Opacity > 0)
                {
                    if (form.IsDisposed) return;
                    form.Opacity -= 0.05;
                    await Task.Delay(10);
                }
                form.Opacity = 0;
            }
            catch (ObjectDisposedException) { /* Safe exit */ }
        }

        private async Task FadeInFormAsync(Form form)
        {
            if (form == null || form.IsDisposed || !form.IsHandleCreated)
                return;

            try
            {
                while (form.Opacity < 1)
                {
                    if (form.IsDisposed) return;
                    form.Opacity += 0.05;
                    await Task.Delay(10);
                }
                form.Opacity = 1;
            }
            catch (ObjectDisposedException) { /* Safe exit */ }
        }
        private void StylePaymentsGrid()
        {
            dataGridView1.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridView1.RowHeadersVisible = false;
            dataGridView1.AllowUserToAddRows = false;
            dataGridView1.ReadOnly = true;
            dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;

            dataGridView1.DefaultCellStyle.Font = new Font("Segoe UI", 10);
            dataGridView1.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            dataGridView1.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridView1.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(5, 51, 69);
            dataGridView1.EnableHeadersVisualStyles = false;

            dataGridView1.DefaultCellStyle.SelectionBackColor = Color.FromArgb(0, 126, 250);
            dataGridView1.DefaultCellStyle.SelectionForeColor = Color.White;

            dataGridView1.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(245, 245, 245);
        }

        private void btnBack_Click_1(object sender, EventArgs e)
        {

        }

        private void dataGridView1_CellContentClick_1(object sender, DataGridViewCellEventArgs e)
        {

        }

        private void dataGridView2_CellContentClick_1(object sender, DataGridViewCellEventArgs e)
        {
                
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }
    }
}
