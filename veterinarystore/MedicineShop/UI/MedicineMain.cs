using System;
using System.Data;
using System.Windows.Forms;
using MedicineShop.BL;
using MedicineShop.Models;
using MedicineShop.UI;
using TechStore.UI;

namespace MedicineShop
{
    public partial class MedicineMain : Form
    {
        private readonly MedicineBL _medicineBL = new MedicineBL();
        private int SelectedId = -1;
        public MedicineMain()
        {
            InitializeComponent();
            LoadMedicines();
            CustomizeGrid();
            panelEdit.Visible = false;
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
                    dataGridView1_CellContentClick(this, new DataGridViewCellEventArgs(dataGridView1.Columns["Edit"].Index, dataGridView1.CurrentRow.Index));
                    return true;
                }

                else if (keyData == Keys.Delete)
                {
                    btnDelete.PerformClick();
                    return true;
                }
                else if (keyData == Keys.Escape && panelEdit.Visible)
                {
                    panelEdit.Visible = false;
                    return true;
                }

            }
            catch (Exception ex)
            {
                MessageBox.Show("error in event listener", ex.Message);
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void LoadMedicines()
        {
            dataGridView1.DataSource = _medicineBL.GetMedicines();
            UIHelper.AddButtonColumn(dataGridView1, "Edit", "Edit", "Edit");
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            AddMedicine form = new AddMedicine();
            if (form.ShowDialog() == DialogResult.OK)
            {
                LoadMedicines();
            }
        }

        private void btnEdit_Click(object sender, EventArgs e)
        {
            //if (dataGridView1.CurrentRow == null)
            //{
            //    MessageBox.Show("Select a medicine to edit.");
            //    return;
            //}

            //Medicine med = new Medicine
            //{
            //    ProductId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["product_id"].Value),
            //    Name = dataGridView1.CurrentRow.Cells["name"].Value.ToString(),
            //    Description = dataGridView1.CurrentRow.Cells["description"].Value.ToString(),
            //    PackingId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["packing_id"].Value),
            //    SalePrice = Convert.ToDecimal(dataGridView1.CurrentRow.Cells["sale_price"].Value),
            //    CategoryId = Convert.ToInt32(dataGridView1.CurrentRow.Cells["Category_id"].Value)

            //};

            //AddMedicine form = new AddMedicine(med);
            //if (form.ShowDialog() == DialogResult.OK)
            //{
            //    LoadMedicines();
            //}
        }

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (dataGridView1.CurrentRow == null)
            {
                MessageBox.Show("Select a medicine to delete.");
                return;
            }

            int id = Convert.ToInt32(dataGridView1.CurrentRow.Cells["product_id"].Value);
            DialogResult confirm = MessageBox.Show("Are you sure?", "Delete",
                MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

            if (confirm == DialogResult.Yes)
            {
                int rows = _medicineBL.DeleteMedicine(id);
                if (rows > 0) LoadMedicines();
            }
        }

        private void CustomizeGrid()
        {
            var grid = dataGridView1;
            grid.BorderStyle = BorderStyle.None;
            grid.AlternatingRowsDefaultCellStyle.BackColor = System.Drawing.Color.FromArgb(238, 239, 249);
            grid.CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal;
            grid.DefaultCellStyle.SelectionBackColor = System.Drawing.Color.SeaGreen;
            grid.DefaultCellStyle.SelectionForeColor = System.Drawing.Color.WhiteSmoke;
            grid.BackgroundColor = System.Drawing.Color.White;

            grid.EnableHeadersVisualStyles = false;
            grid.ColumnHeadersBorderStyle = DataGridViewHeaderBorderStyle.None;
            grid.ColumnHeadersDefaultCellStyle.BackColor = System.Drawing.Color.FromArgb(20, 25, 72);
            grid.ColumnHeadersDefaultCellStyle.ForeColor = System.Drawing.Color.White;
            grid.ColumnHeadersDefaultCellStyle.Font = new System.Drawing.Font("Segoe UI", 10, System.Drawing.FontStyle.Bold);

            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            grid.DefaultCellStyle.Font = new System.Drawing.Font("Segoe UI", 10);
            grid.RowTemplate.Height = 35;
            grid.AllowUserToAddRows = false;
            grid.ReadOnly = true;

            if (grid.Columns.Contains("company_id")) grid.Columns["company_id"].Visible = false;
            if (grid.Columns.Contains("Category_id")) grid.Columns["Category_id"].Visible = false;
            if (grid.Columns.Contains("packing_id")) grid.Columns["packing_id"].Visible = false;
            if (grid.Columns.Contains("product_id")) grid.Columns["product_id"].Visible = false;
        }



        private void MedicineMain_Load(object sender, EventArgs e)
        {
            BindCompanies();
            BindCategories();
            BindPackings();
        }


        private void txtSearch_TextChanged(object sender, EventArgs e)
        {
            // Live search as user types
            string keyword = txtSearch.Text.Trim();
            if (string.IsNullOrEmpty(keyword))
                LoadMedicines();
            else
            {
                dataGridView1.DataSource = _medicineBL.SearchMedicines(keyword);
                UIHelper.AddButtonColumn(dataGridView1, "Edit", "Edit", "Edit");
            }
        }

        private void iconButton1_Click(object sender, EventArgs e)
        {
            AddCategory addCategory = new AddCategory();
            addCategory.ShowDialog();
        }

        private void iconButton2_Click(object sender, EventArgs e)
        {
            AddPacking addPacking = new AddPacking();
            addPacking.ShowDialog();
        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || e.ColumnIndex < 0)
                return;
            var row = dataGridView1.Rows[e.RowIndex];
            SelectedId = Convert.ToInt32(row.Cells["product_id"].Value);
            string columnName = dataGridView1.Columns[e.ColumnIndex].Name;
            if (columnName == "Edit")
            {
                txtName.Text = row.Cells["name"].Value.ToString();
                cmbCompany.Text = row.Cells["company_name"].Value.ToString();
                txtPrice.Text = row.Cells["sale_price"].Value.ToString();
                threshold.Text = row.Cells["minimum_threshold"].Value.ToString();
                cmbCategory.Text = row.Cells["category_name"].Value.ToString();
                pckcmb.Text = row.Cells["packing_name"].Value.ToString();
                txtDesc.Text= row.Cells["description"].Value.ToString();
                panelEdit.Visible = true;
                UIHelper.RoundPanelCorners(panelEdit, 20);
            }
        }

        private void btnUpdate_Click(object sender, EventArgs e)
        {
            string company_name = cmbCompany.Text;
            string category_name = cmbCategory.Text;
            string packing_name = pckcmb.Text;
            string description = txtDesc.Text.Trim();
            string name = txtName.Text.Trim();
            decimal sale_price = decimal.TryParse(txtPrice.Text.Trim(), out var sp) ? sp : 0;
            int min_threshold = int.TryParse(threshold.Text.Trim(), out var mt) ? mt : 0;
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(company_name) || string.IsNullOrWhiteSpace(category_name) || string.IsNullOrWhiteSpace(packing_name) || sale_price <= 0 || min_threshold <= 0)
            {
                MessageBox.Show("Please fill all required fields with valid data.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            try
            {
                var medicine=new Medicine
                {
                    ProductId = SelectedId,
                    Name = name,
                    Description = description,
                    SalePrice = sale_price,
                    minimum_threshold = min_threshold,
                    CompanyId =DatabaseHelper.Instance.getcompany_id(company_name),
                    CategoryId=DatabaseHelper.Instance.getcategory_id(category_name),
                    PackingId=DatabaseHelper.Instance.getpacking_id(packing_name)


                };
                int rows = _medicineBL.UpdateMedicine(medicine);
                if (rows > 0)
                {
                    MessageBox.Show("Medicine updated successfully.", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    LoadMedicines();
                    panelEdit.Visible = false;
                }
                else
                {
                    MessageBox.Show("Failed to update medicine.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }

            }
            catch (Exception ex)
            {
                MessageBox.Show("Error updating medicine: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

        }
        private void BindCompanies()
        {
            var names = DatabaseHelper.Instance.getcomapnynames("");
            cmbCompany.Items.Clear();
            cmbCompany.Items.AddRange(names.ToArray());

            cmbCompany.AutoCompleteMode = AutoCompleteMode.SuggestAppend;
            cmbCompany.AutoCompleteSource = AutoCompleteSource.ListItems;
            cmbCompany.SelectedIndex = -1;
        }

        private void BindCategories()
        {
            var names = DatabaseHelper.Instance.getcategories("");
            cmbCategory.Items.Clear();
            cmbCategory.Items.AddRange(names.ToArray());

            cmbCategory.AutoCompleteMode = AutoCompleteMode.SuggestAppend;
            cmbCategory.AutoCompleteSource = AutoCompleteSource.ListItems;
            cmbCategory.SelectedIndex = -1;
        }

        private void BindPackings()
        {
            var names = DatabaseHelper.Instance.Getpacking("");
            pckcmb.Items.Clear();
            pckcmb.Items.AddRange(names.ToArray());

            pckcmb.AutoCompleteMode = AutoCompleteMode.SuggestAppend;
            pckcmb.AutoCompleteSource = AutoCompleteSource.ListItems;
            pckcmb.SelectedIndex = -1;
        }

        private void loadbatches()
        {
            var batchNames = DatabaseHelper.Instance.getcomapnynames("");
            if (batchNames != null && batchNames.Count > 0)
            {
                cmbCompany.Items.Clear();
                cmbCompany.Items.AddRange(batchNames.ToArray());

                var autoSource = new AutoCompleteStringCollection();
                autoSource.AddRange(batchNames.ToArray());
                cmbCompany.AutoCompleteCustomSource = autoSource;
                cmbCompany.AutoCompleteMode = AutoCompleteMode.Suggest;
                cmbCompany.SelectedIndex = -1;
            }
        }
        private void iconButton4_Click(object sender, EventArgs e)
        {
            
            panelEdit.Visible = false;
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }
    }
    } 

