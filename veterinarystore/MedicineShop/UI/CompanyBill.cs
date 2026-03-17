using MedicineShop.BL.Bl;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml.Linq;
using TechStore.UI;

namespace MedicineShop.UI
{
    public partial class CompanyBill : Form
    {
        private int SelectedId = -1;
        private readonly ICompanyBillBl ibl;
        public CompanyBill(ICompanyBillBl ibl)
        {
            InitializeComponent();
            this.ibl = ibl;
            UIHelper.StyleGridView(dataGridView2);
            panelbill.Visible = false;
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == Keys.Enter)
                {
                    if (txtpayement.Focused)
                    {
                        iconButton5.PerformClick();
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("error in event listener", ex.Message);
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void load()
        {
            LoadCompanyBills("");
        }
        private void CompanyBill_Load(object sender, EventArgs e)
        {
            load();
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            string searchTerm = textBox1.Text.Trim();
            LoadCompanyBills(searchTerm);
        }
        private void LoadCompanyBills(string search )
        {
            try
            {
                dataGridView2.DataSource = ibl.GetAllCompanyBills(search);
                dataGridView2.Columns["company_id"].Visible = false;
                UIHelper.AddButtonColumn(dataGridView2, "payment", "payment", "Payment");
                UIHelper.AddButtonColumn(dataGridView2, "Details", "Details", "Details");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void pictureBox10_Click(object sender, EventArgs e)
        {
            
        }

        private void dataGridView2_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || e.ColumnIndex < 0)
                return;
            var row = dataGridView2.Rows[e.RowIndex];
            SelectedId = Convert.ToInt32(row.Cells["company_id"].Value);
            string columnName = dataGridView2.Columns[e.ColumnIndex].Name;
            if (columnName == "payment")
            {
                txtSupplierName.Text = row.Cells["company_name"].Value.ToString();
                txtpaid.Text = row.Cells["paid"].Value.ToString();
                txtTotal.Text = row.Cells["total_price"].Value.ToString();
                txtremaning.Text = row.Cells["remaining"].Value.ToString();
                txtDate.Text = DateTime.Now.ToString();
                panelbill.Visible = true;
                UIHelper.RoundPanelCorners(panelbill, 20);
            }
            if(columnName == "Details")
            {
               
                var f = new CompanyBillDetails(SelectedId, ibl);
                f.ShowDialog();
               
            }
        }

        private void iconButton5_Click(object sender, EventArgs e)
        {
            int company_id = SelectedId;    
            decimal payment =txtpayement.Text.Trim() == "" ? 0 : decimal.Parse(txtpayement.Text.Trim());
            try
            {
                if (payment <= 0)
                {
                    MessageBox.Show("Please enter a valid payment amount.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                if (payment > decimal.Parse(txtremaning.Text.Trim()))
                {
                    MessageBox.Show("Payment exceeds remaining amount.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                bool isSuccess = ibl.AddCompanyPayment(company_id, payment);
                if (isSuccess)
                {
                    MessageBox.Show("Payment added successfully.", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    LoadCompanyBills("");
                    panelbill.Visible = false;
                    txtpayement.Clear();
                }
                else
                {
                    MessageBox.Show("Failed to add payment.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

        }

        private void iconButton4_Click(object sender, EventArgs e)
        {
            panelbill.Visible = false;
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }

        private void txtSupplierName_TextChanged(object sender, EventArgs e)
        {

        }
    }
}
