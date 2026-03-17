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

namespace MedicineShop.UI
{
    public partial class expired_products : Form
    {
        private readonly expiredproductsdl ex = new expiredproductsdl();
        public expired_products()
        {
            InitializeComponent();
            loadexpiredproduct();
            CustomizeGrid();
        }

        private void loadexpiredproduct()
        {
            try
            {
                dataGridView2.DataSource = ex.GetAllCustomers();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            try
            {
                dataGridView2.DataSource = ex.GetExpiredProducts(textBox1.Text);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }

        private void CustomizeGrid()
        {
            var grid = dataGridView2;

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
            if (grid.Columns.Contains("product_id"))
            {
                grid.Columns["product_id"].Visible = false;
            }

            if (grid.Columns.Contains("purchase_batch_id"))
            {
                grid.Columns["purchase_batch_id"].Visible = false;
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            if (dataGridView2.SelectedRows.Count > 0)
            {
                try
                {
                    int batchItemId = Convert.ToInt32(
                        dataGridView2.SelectedRows[0].Cells["batch_item_id"].Value);

                    if (ex.MarkAsZero(batchItemId))
                    {
                        MessageBox.Show("Quantity set to zero successfully.", "Success",
                                        MessageBoxButtons.OK, MessageBoxIcon.Information);

                        loadexpiredproduct(); // refresh grid
                    }
                    else
                    {
                        MessageBox.Show("Failed to update quantity.", "Error",
                                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error: " + ex.Message, "Exception",
                                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            else
            {
                MessageBox.Show("Please select a row first.");
            }
        }
    }
}