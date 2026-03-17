using FontAwesome.Sharp;
using MedicineShop.BL;
using MedicineShop.BL.Models;
using MedicineShop.DL;
using MedicineShop.Models;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using TechStore.UI;

namespace MedicineShop.UI
{
    // ✅ Simplified Session Data - Only batch basic info

    public partial class AddBatchdetailsform : Form
    {
        private IBatchesBl batchesBl;
        private IBatchItemsBl batchItemsBl;
        private DatabaseHelper dbHelper;
        private int selectedCompanyId = 0;
        private int selectedProductId = 0;
        private string currentBatchName = "";
        private int editingBatchItemId = 0;
        private bool isEditing = false;
        private bool batchSavedToDatabase = false;
        private DataTable batchItemsTable;
        private bool suppressTextChanged = false;

        public AddBatchdetailsform(IBatchItemsBl batchItemsBl, IBatchesBl batchesBl)
        {
            InitializeComponent();
            this.batchesBl = batchesBl;
            this.batchItemsBl = batchItemsBl;
            dbHelper = DatabaseHelper.Instance;

            this.KeyPreview = true;
            paneldetails.Visible = true;

            UIHelper.StyleGridView(dgvbatches);
            UIHelper.StyleGridView(dgvcompany);
            UIHelper.StyleGridView(dgvmedicines);

            InitializeBatchItemsTable();

            this.Load += AddBatchdetailsform_Load;
            this.FormClosing += AddBatchdetailsform_FormClosing;
            this.VisibleChanged += AddBatchdetailsform_VisibleChanged;
        }

        private string GetSessionFilePath()
        {
            string folder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MedicineShop",
                "Sessions"
            );

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            return Path.Combine(folder, "BatchSession.json");
        }

        // ✅ Save only batch basic info to JSON
        private void SaveSession()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(txtBnames.Text))
                    return;

                var sessionInfo = new BatchSessionInfo
                {
                    BatchName = txtBnames.Text.Trim(),
                    CompanyID = selectedCompanyId,
                    CompanyName = txtcompany.Text.Trim(),
                    TotalAmount = decimal.TryParse(txttotalamont.Text, out decimal total) ? total : 0,
                    PaidAmount = decimal.TryParse(txtpaid.Text, out decimal paid) ? paid : 0,
                    BatchSaved = batchSavedToDatabase,
                    SessionDate = DateTime.Now
                };

                string json = JsonConvert.SerializeObject(sessionInfo, Formatting.Indented);
                File.WriteAllText(GetSessionFilePath(), json);

                System.Diagnostics.Debug.WriteLine($"✓ Session saved: {sessionInfo.BatchName}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error saving session: {ex.Message}");
            }
        }

        // ✅ Load batch info from JSON, batch items from database
        private void LoadSession()
        {
            try
            {
                string filePath = GetSessionFilePath();
                if (!File.Exists(filePath))
                {
                    System.Diagnostics.Debug.WriteLine("No session file found");
                    return;
                }

                string json = File.ReadAllText(filePath);
                var sessionInfo = JsonConvert.DeserializeObject<BatchSessionInfo>(json);

                if (sessionInfo == null || string.IsNullOrWhiteSpace(sessionInfo.BatchName))
                    return;

                System.Diagnostics.Debug.WriteLine($"Found session: {sessionInfo.BatchName}");

                DialogResult result = MessageBox.Show(
                    $"Found unsaved batch: '{sessionInfo.BatchName}'\n" +
                    $"Company: {sessionInfo.CompanyName}\n" +
                    $"Created: {sessionInfo.SessionDate:yyyy-MM-dd HH:mm}\n\n" +
                    "Would you like to restore this session?",
                    "Restore Session",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (result == DialogResult.No)
                {
                    File.Delete(filePath);
                    return;
                }

                // Restore batch basic info
                txtBnames.Text = sessionInfo.BatchName;
                txtcompany.Text = sessionInfo.CompanyName;
                txttotalamont.Text = sessionInfo.TotalAmount.ToString("F2");
                txtpaid.Text = sessionInfo.PaidAmount.ToString("F2");
                selectedCompanyId = sessionInfo.CompanyID;
                currentBatchName = sessionInfo.BatchName;
                batchSavedToDatabase = sessionInfo.BatchSaved;

                // ✅ Load batch items from DATABASE
                int batchId = DatabaseHelper.Instance.getbatchid(sessionInfo.BatchName);

                if (batchId > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"Loading batch items from database (ID: {batchId})");
                    LoadBatchItemsFromDatabase(batchId);
                    SetBatchFormEnabled(false);
                    txtproduct.Focus();
                    this.Text = $"Add Batch Details - {sessionInfo.BatchName} ({batchItemsTable.Rows.Count} items)";
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("Batch not in database yet");
                    SetBatchFormEnabled(!sessionInfo.BatchSaved);
                    txtBnames.Focus();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading session: {ex.Message}");
                MessageBox.Show($"Error restoring session: {ex.Message}\n\nStarting fresh.",
                    "Session Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == Keys.Enter)
                {
                    if (txtBnames.Focused)
                        txtcompany.Focus();
                    else if (txtcompany.Focused)
                        txttotalamont.Focus();
                    else if (txttotalamont.Focused)
                        txtpaid.Focus();
                    else if (txtpaid.Focused)
                        iconButton1.PerformClick();
                    else if (txtproduct.Focused)
                        txtquantity.Focus();
                    else if (txtquantity.Focused)
                        txtcost.Focus();
                    else if (txtcost.Focused)
                        txtsaleprice.Focus();
                    else if (txtsaleprice.Focused)
                        iconButton2.PerformClick();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error in event listener: " + ex.Message);
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }
        // Add this public method to your AddBatchdetailsform class
        // Place it near the top of the class, after the constructor

        /// <summary>
        /// Loads an existing batch for adding more items
        /// </summary>
        public void LoadExistingBatch(int batchId, string batchName)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"LoadExistingBatch called: ID={batchId}, Name={batchName}");

                // Get batch details from database
                var batch = batchesBl.GetBatchById(batchId);

                if (batch == null)
                {
                    MessageBox.Show("Batch not found!", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Set batch information
                currentBatchName = batchName;
                batchSavedToDatabase = true;

                // Populate batch fields
                txtBnames.Text = batch.BatchName;
                txtcompany.Text = batch.CompanyName;
                txttotalamont.Text = batch.TotalPrice.ToString("F2");
                txtpaid.Text = batch.Paid.ToString("F2");
                selectedCompanyId = batch.CompanyID;

                // Disable batch editing (already saved)
                SetBatchFormEnabled(false);

                // Load batch items from database
                LoadBatchItemsFromDatabase(batchId);

                // Update form title
                this.Text = $"Add Batch Details - {batchName} ({batchItemsTable.Rows.Count} items)";

                // Focus on product field to add more items
                txtproduct.Focus();

                System.Diagnostics.Debug.WriteLine($"✓ Batch loaded successfully with {batchItemsTable.Rows.Count} items");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading existing batch: {ex.Message}");
                MessageBox.Show($"Error loading batch: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void AddBatchdetailsform_Load(object sender, EventArgs e)
        {
            LoadCompanies();
            LoadMedicines();
            SetupDataGridViews();

            dgvcompany.Visible = false;
            dgvmedicines.Visible = false;

            SetupKeyboardHandlers();

            // ✅ Load session after everything is set up
            LoadSession();
        }

        private void AddBatchdetailsform_FormClosing(object sender, FormClosingEventArgs e)
        {
            SaveSession();
        }

        private void AddBatchdetailsform_VisibleChanged(object sender, EventArgs e)
        {
            if (!this.Visible)
                SaveSession();
        }

        private void iconButton1_Click(object sender, EventArgs e)
        {
            AddBatch();
        }

        // ✅ IconButton2 - Add Product DIRECTLY to Database
        private void iconButton2_Click(object sender, EventArgs e)
        {
            AddOrUpdateBatchItemToDatabase();
        }

        private void CancelEdit()
        {
            isEditing = false;
            editingBatchItemId = 0;
            iconButton2.Text = "Add Product";
            iconButton2.IconChar = FontAwesome.Sharp.IconChar.Plus;
            ResetEditingVisuals();
            this.Text = "Add Batch Details";
        }

        private void ResetEditingVisuals()
        {
            iconButton2.BackColor = Color.FromArgb(109, 148, 197);
            iconButton2.ForeColor = Color.White;
        }
        private void ClearFormAndSession()
        {
            try
            {
                // Delete session file
                string sessionFile = GetSessionFilePath();
                if (File.Exists(sessionFile))
                {
                    File.Delete(sessionFile);
                    System.Diagnostics.Debug.WriteLine("✓ Session file deleted");
                }

                // Clear all text fields
                txtBnames.Clear();
                txtcompany.Clear();
                txttotalamont.Clear();
                txtpaid.Clear();
                ClearProductForm();

                // Reset all variables
                selectedCompanyId = 0;
                selectedProductId = 0;
                currentBatchName = "";
                editingBatchItemId = 0;
                isEditing = false;
                batchSavedToDatabase = false;

                // Re-enable batch form
                SetBatchFormEnabled(true);

                // Hide dropdowns
                dgvcompany.Visible = false;
                dgvmedicines.Visible = false;

                // Reload data
                LoadCompanies();
                LoadMedicines();

                // Clear batch items table
                InitializeBatchItemsTable();
                RefreshBatchItemsGrid();

                // Reset form appearance
                this.Text = "Add Batch Details";
                ResetEditingVisuals();

                // Focus on batch name field
                txtBnames.Focus();

                System.Diagnostics.Debug.WriteLine("✓ Form cleared and ready for new batch");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error clearing form: {ex.Message}");
                MessageBox.Show($"Error clearing form: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // ✅ IconButton3 - No longer needed, but keep for compatibility
        private void iconButton3_Click(object sender, EventArgs e)
        {
            try
            {
                // Check if there's a batch to save
                if (string.IsNullOrWhiteSpace(currentBatchName))
                {
                    MessageBox.Show("No batch to save!", "Info",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                // Check if batch has items
                if (batchItemsTable.Rows.Count == 0)
                {
                    MessageBox.Show("Please add at least one product to the batch before saving.",
                        "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                // Confirm save
                DialogResult result = MessageBox.Show(
                    $"Save and complete batch '{currentBatchName}'?\n\n" +
                    $"Total Items: {batchItemsTable.Rows.Count}\n" +
                    $"This will clear the form for a new batch.",
                    "Confirm Save",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (result == DialogResult.Yes)
                {
                    // All items are already saved to database, just need to finalize
                    MessageBox.Show(
                        $"Batch '{currentBatchName}' saved successfully!\n" +
                        $"Total Items: {batchItemsTable.Rows.Count}",
                        "Success",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);

                    // Clear everything and start fresh
                    ClearFormAndSession();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving batch: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        #region Helper Methods

        private void InitializeBatchItemsTable()
        {
            batchItemsTable = new DataTable();
            batchItemsTable.Columns.Add("BatchItemID", typeof(int));
            batchItemsTable.Columns.Add("BatchID", typeof(int));
            batchItemsTable.Columns.Add("MedicineID", typeof(int));
            batchItemsTable.Columns.Add("MedicineName", typeof(string));
            batchItemsTable.Columns.Add("Quantity", typeof(int));
            batchItemsTable.Columns.Add("PurchasePrice", typeof(decimal));
            batchItemsTable.Columns.Add("SalePrice", typeof(decimal));
            batchItemsTable.Columns.Add("ExpiryDate", typeof(DateTime));
            batchItemsTable.Columns.Add("TotalCost", typeof(decimal));
        }

        private void RefreshBatchItemsGrid()
        {
            try
            {
                dgvbatches.SuspendLayout();

                // ✅ Force rebind by setting to null first
                dgvbatches.DataSource = null;
                dgvbatches.DataSource = batchItemsTable;

                // Hide ID columns
                if (dgvbatches.Columns.Contains("BatchItemID"))
                    dgvbatches.Columns["BatchItemID"].Visible = false;
                if (dgvbatches.Columns.Contains("BatchID"))
                    dgvbatches.Columns["BatchID"].Visible = false;
                if (dgvbatches.Columns.Contains("MedicineID"))
                    dgvbatches.Columns["MedicineID"].Visible = false;

                // Format columns
                if (dgvbatches.Columns.Contains("PurchasePrice"))
                    dgvbatches.Columns["PurchasePrice"].DefaultCellStyle.Format = "N2";
                if (dgvbatches.Columns.Contains("SalePrice"))
                    dgvbatches.Columns["SalePrice"].DefaultCellStyle.Format = "N2";
                if (dgvbatches.Columns.Contains("TotalCost"))
                    dgvbatches.Columns["TotalCost"].DefaultCellStyle.Format = "N2";
                if (dgvbatches.Columns.Contains("ExpiryDate"))
                    dgvbatches.Columns["ExpiryDate"].DefaultCellStyle.Format = "dd/MM/yyyy";

                dgvbatches.ResumeLayout();
                dgvbatches.Refresh();

                System.Diagnostics.Debug.WriteLine($"✓ Grid refreshed successfully");
            }
            catch (Exception ex)
            {
                dgvbatches.ResumeLayout();
                System.Diagnostics.Debug.WriteLine($"Error refreshing grid: {ex.Message}");
            }
        }
        private void LoadBatchItemsFromDatabase(int batchId)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"LoadBatchItemsFromDatabase called with BatchID={batchId}");

                // ✅ Clear existing rows but KEEP the table structure and binding
                batchItemsTable.Rows.Clear();

                var batchItemsList = batchItemsBl.GetBatchItemsByBatchId(batchId);

                System.Diagnostics.Debug.WriteLine($"Retrieved {batchItemsList?.Count ?? 0} items from BL");

                if (batchItemsList != null && batchItemsList.Count > 0)
                {
                    foreach (var batchItem in batchItemsList)
                    {
                        DataRow newRow = batchItemsTable.NewRow();
                        newRow["BatchItemID"] = batchItem.BatchItemID;
                        newRow["BatchID"] = batchItem.BatchID;
                        newRow["MedicineID"] = batchItem.MedicineID;
                        newRow["MedicineName"] = batchItem.MedicineName ?? GetMedicineName(batchItem.MedicineID);
                        newRow["Quantity"] = batchItem.Quantity;
                        newRow["PurchasePrice"] = batchItem.PurchasePrice;
                        newRow["SalePrice"] = batchItem.SalePrice;
                        newRow["ExpiryDate"] = batchItem.ExpiryDate;
                        newRow["TotalCost"] = batchItem.Quantity * batchItem.PurchasePrice;

                        batchItemsTable.Rows.Add(newRow);

                        System.Diagnostics.Debug.WriteLine($"  Added: {batchItem.MedicineName} x {batchItem.Quantity}");
                    }
                }

                // Force refresh the grid
                RefreshBatchItemsGrid();

                System.Diagnostics.Debug.WriteLine($"✓ Final: DataTable={batchItemsTable.Rows.Count} rows, Grid={dgvbatches.Rows.Count} rows");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading batch items: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                MessageBox.Show($"Error loading items: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private void SetBatchFormEnabled(bool enabled)
        {
            txtBnames.Enabled = enabled;
            txtcompany.Enabled = enabled;
            txttotalamont.Enabled = enabled;
            txtpaid.Enabled = enabled;
            iconButton1.Enabled = enabled;
        }

        private void SetupDataGridViews()
        {
            dgvcompany.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgvcompany.MultiSelect = false;
            dgvcompany.CellClick += DgvCompany_CellClick;

            dgvmedicines.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgvmedicines.MultiSelect = false;
            dgvmedicines.CellClick += DgvMedicines_CellClick;

            dgvbatches.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgvbatches.MultiSelect = false;
            dgvbatches.CellDoubleClick += DgvBatches_CellDoubleClick;
            dgvbatches.KeyDown += DgvBatches_KeyDown;
        }

        private void LoadCompanies()
        {
            try
            {
                DataTable companies = dbHelper.GetCompany("");
                dgvcompany.DataSource = companies;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading companies: {ex.Message}");
            }
        }

        private void LoadMedicines()
        {
            try
            {
                var batchesDl = new BatchesDl();
                DataTable medicines = batchesDl.GetMedicines();
                dgvmedicines.DataSource = medicines;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading medicines: {ex.Message}");
            }
        }

        // ✅ FIXED: Load batch items from database


        private string GetMedicineName(int medicineId)
        {
            try
            {
                DataTable medicines = (DataTable)dgvmedicines.DataSource;
                if (medicines != null)
                {
                    DataRow[] foundRows = medicines.Select($"product_id = {medicineId}");
                    if (foundRows.Length > 0)
                    {
                        string companyName = foundRows[0]["company_name"].ToString();
                        string categoryName = foundRows[0]["category_name"].ToString();
                        string packingName = foundRows[0]["packing_name"].ToString();
                        return $"{companyName} - {categoryName} - {packingName}";
                    }
                }
                return $"Medicine ID: {medicineId}";
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error getting medicine name: {ex.Message}");
                return $"Medicine ID: {medicineId}";
            }
        }

        private void ClearProductForm()
        {
            txtproduct.Clear();
            txtquantity.Clear();
            txtcost.Clear();
            txtsaleprice.Clear();
            dateTimePicker1.Value = DateTime.Now.AddMonths(6);
            selectedProductId = 0;
        }

        private void ResetForm()
        {
            try
            {
                string sessionFile = GetSessionFilePath();
                if (File.Exists(sessionFile))
                    File.Delete(sessionFile);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error deleting session: {ex.Message}");
            }

            txtBnames.Clear();
            txtcompany.Clear();
            txttotalamont.Clear();
            txtpaid.Clear();
            ClearProductForm();

            selectedCompanyId = 0;
            selectedProductId = 0;
            currentBatchName = "";
            editingBatchItemId = 0;
            isEditing = false;
            batchSavedToDatabase = false;

            SetBatchFormEnabled(true);
            dgvcompany.Visible = false;
            dgvmedicines.Visible = false;

            LoadCompanies();
            LoadMedicines();

            InitializeBatchItemsTable();
            RefreshBatchItemsGrid();

            this.Text = "Add Batch Details";
            ResetEditingVisuals();
            txtBnames.Focus();
        }

        #endregion

        #region Event Handlers

        private void SetupKeyboardHandlers()
        {
            txtcompany.KeyDown += TxtCompany_KeyDown;
            txtcompany.TextChanged += TxtCompany_TextChanged;
            txtcompany.Leave += TxtCompany_Leave;

            txtproduct.KeyDown += TxtProduct_KeyDown;
            txtproduct.TextChanged += TxtProduct_TextChanged;
            txtproduct.Leave += TxtProduct_Leave;

            dgvcompany.KeyDown += DgvCompany_KeyDown;
            dgvmedicines.KeyDown += DgvMedicines_KeyDown;

            this.KeyPreview = true;
            this.KeyDown += AddBatchdetailsform_KeyDown;

            SetupKeyboardShortcutTooltips();
        }

        private void SetupKeyboardShortcutTooltips()
        {
            try
            {
                ToolTip tooltip = new ToolTip();
                tooltip.SetToolTip(iconButton1, "Add Batch (Ctrl+A)");
                tooltip.SetToolTip(iconButton2, "Add Product (Ctrl+A)");
                tooltip.SetToolTip(iconButton3, "Save & New Batch (Ctrl+S)"); // Updated tooltip
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error setting tooltips: {ex.Message}");
            }
        }

        private void AddBatchdetailsform_KeyDown(object sender, KeyEventArgs e)
        {
            try
            {
                if (e.Control)
                {
                    switch (e.KeyCode)
                    {
                        case Keys.A:
                            if (!batchSavedToDatabase)
                                AddBatch();
                            else
                                AddOrUpdateBatchItemToDatabase();
                            e.Handled = true;
                            break;

                        case Keys.S: // NEW: Save shortcut
                            if (batchSavedToDatabase && batchItemsTable.Rows.Count > 0)
                                iconButton3.PerformClick();
                            e.Handled = true;
                            break;

                        case Keys.N:
                            ResetForm();
                            e.Handled = true;
                            break;
                    }
                }
                else if (e.KeyCode == Keys.Escape)
                {
                    if (isEditing)
                    {
                        CancelEdit();
                        ClearProductForm();
                        txtproduct.Focus();
                        e.Handled = true;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private void AddBatch()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(txtBnames.Text))
                {
                    MessageBox.Show("Please enter batch name.", "Validation Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtBnames.Focus();
                    return;
                }

                if (selectedCompanyId == 0)
                {
                    MessageBox.Show("Please select a company.", "Validation Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtcompany.Focus();
                    return;
                }

                if (!decimal.TryParse(txttotalamont.Text, out decimal totalAmount) || totalAmount <= 0)
                {
                    MessageBox.Show("Please enter valid total amount.", "Validation Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txttotalamont.Focus();
                    return;
                }

                decimal paidAmount = 0;
                if (!string.IsNullOrWhiteSpace(txtpaid.Text))
                {
                    if (!decimal.TryParse(txtpaid.Text, out paidAmount) || paidAmount < 0)
                    {
                        MessageBox.Show("Please enter valid paid amount.", "Validation Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        txtpaid.Focus();
                        return;
                    }
                }

                var batch = new Batches
                {
                    BatchName = txtBnames.Text.Trim(),
                    CompanyID = selectedCompanyId,
                    TotalPrice = totalAmount,
                    Paid = paidAmount,
                    PurchaseDate = DateTime.Now,
                    Status = "Active"
                };

                bool success = batchesBl.AddBatch(batch);

                if (success)
                {
                    currentBatchName = batch.BatchName;
                    batchSavedToDatabase = true;

                    SetBatchFormEnabled(false);
                    InitializeBatchItemsTable();
                    RefreshBatchItemsGrid();

                    SaveSession();

                    MessageBox.Show("Batch created! Now add products.", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);

                    txtproduct.Focus();
                }
                else
                {
                    MessageBox.Show("Failed to add batch.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        // ✅ Add or Update Batch Item DIRECTLY to Database
        private void AddOrUpdateBatchItemToDatabase()
        {
            try
            {
                // Validation
                if (selectedProductId == 0)
                {
                    MessageBox.Show("Please select a product.", "Validation",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtproduct.Focus();
                    return;
                }

                if (!int.TryParse(txtquantity.Text, out int quantity) || quantity <= 0)
                {
                    MessageBox.Show("Please enter valid quantity.", "Validation",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtquantity.Focus();
                    return;
                }

                if (!decimal.TryParse(txtcost.Text, out decimal costPrice) || costPrice <= 0)
                {
                    MessageBox.Show("Please enter valid cost price.", "Validation",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtcost.Focus();
                    return;
                }

                if (!decimal.TryParse(txtsaleprice.Text, out decimal salePrice) || salePrice <= 0)
                {
                    MessageBox.Show("Please enter valid sale price.", "Validation",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtsaleprice.Focus();
                    return;
                }

                if (dateTimePicker1.Value <= DateTime.Now)
                {
                    MessageBox.Show("Expiry date must be in future.", "Validation",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    dateTimePicker1.Focus();
                    return;
                }

                // ✅ Get batch ID using the DatabaseHelper method
                int batchId = DatabaseHelper.Instance.getbatchid(currentBatchName);

                System.Diagnostics.Debug.WriteLine($"Getting batch ID for: '{currentBatchName}' => {batchId}");

                if (batchId == 0)
                {
                    MessageBox.Show("Please create batch first!", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                var batchItem = new BatchItems
                {
                    BatchID = batchId,
                    MedicineID = selectedProductId,
                    Quantity = quantity,
                    PurchasePrice = costPrice,
                    SalePrice = salePrice,
                    ExpiryDate = dateTimePicker1.Value
                };

                bool success;

                if (isEditing)
                {
                    // Update existing item
                    batchItem.BatchItemID = editingBatchItemId;
                    success = batchItemsBl.UpdateBatchItem(batchItem);

                    if (success)
                    {
                        System.Diagnostics.Debug.WriteLine($"✓ Item updated: BatchItemID={editingBatchItemId}");

                        isEditing = false;
                        editingBatchItemId = 0;
                        iconButton2.Text = "Add Product";
                        iconButton2.IconChar = FontAwesome.Sharp.IconChar.Plus;
                        ResetEditingVisuals();
                    }
                }
                else
                {
                    // Add new item to database
                    success = batchItemsBl.AddBatchItem(batchItem);

                    if (success)
                    {
                        System.Diagnostics.Debug.WriteLine($"✓ Item added to database for BatchID={batchId}");
                     
                    }
                }

                if (success)
                {
                    // ✅ Reload batch items from database using the same batchId
                    System.Diagnostics.Debug.WriteLine($"Reloading items for BatchID={batchId}...");
                    LoadBatchItemsFromDatabase(batchId);

                    // Debug output
                    System.Diagnostics.Debug.WriteLine($"DataTable has {batchItemsTable.Rows.Count} rows");
                    System.Diagnostics.Debug.WriteLine($"Grid has {dgvbatches.Rows.Count} rows");

                    // ✅ Clear form for next entry
                    ClearProductForm();

                    // ✅ Update form title with item count
                    this.Text = $"Add Batch Details - {currentBatchName} ({batchItemsTable.Rows.Count} items)";

                    // ✅ Scroll to last added item in grid
                    if (dgvbatches.Rows.Count > 0)
                    {
                        dgvbatches.FirstDisplayedScrollingRowIndex = dgvbatches.Rows.Count - 1;
                        dgvbatches.Rows[dgvbatches.Rows.Count - 1].Selected = true;
                    }

                    txtproduct.Focus();
                }
                else
                {
                    MessageBox.Show("Failed to save product!", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in AddOrUpdateBatchItemToDatabase: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                MessageBox.Show($"Error: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }


        #region Company Search

        private void TxtCompany_TextChanged(object sender, EventArgs e)
        {
            try
            {
                string searchTerm = txtcompany.Text.Trim();

                if (!string.IsNullOrEmpty(searchTerm))
                {
                    DataTable companies = dbHelper.GetCompany(searchTerm);
                    dgvcompany.DataSource = companies;
                    dgvcompany.Columns["company_id"].Visible = false;
                    dgvcompany.Visible = true;
                }
                else
                {
                    dgvcompany.Visible = false;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error: {ex.Message}");
            }
        }

        private void TxtCompany_KeyDown(object sender, KeyEventArgs e)
        {
            if (dgvcompany.Visible && dgvcompany.Rows.Count > 0)
            {
                int firstVisibleCol = GetFirstVisibleColumnIndex(dgvcompany);

                switch (e.KeyCode)
                {
                    case Keys.Down:
                        {
                            int currentRow = dgvcompany.CurrentCell?.RowIndex ?? -1;
                            int nextRow = currentRow + 1;

                            if (nextRow < dgvcompany.Rows.Count)
                            {
                                dgvcompany.ClearSelection();
                                dgvcompany.CurrentCell = dgvcompany.Rows[nextRow].Cells[firstVisibleCol];
                                dgvcompany.Rows[nextRow].Selected = true;
                            }
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                            break;
                        }

                    case Keys.Up:
                        {
                            int currentRow = dgvcompany.CurrentCell?.RowIndex ?? -1;
                            int prevRow = currentRow - 1;

                            if (prevRow >= 0)
                            {
                                dgvcompany.ClearSelection();
                                dgvcompany.CurrentCell = dgvcompany.Rows[prevRow].Cells[firstVisibleCol];
                                dgvcompany.Rows[prevRow].Selected = true;
                            }
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                            break;
                        }

                    case Keys.Enter:
                        if (dgvcompany.CurrentRow != null)
                        {
                            SelectCompanyFromGrid(dgvcompany.CurrentRow);
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                        }
                        break;

                    case Keys.Escape:
                        dgvcompany.Visible = false;
                        e.Handled = true;
                        e.SuppressKeyPress = true;
                        break;
                }
            }
        }

        private void TxtCompany_Leave(object sender, EventArgs e)
        {
            Timer timer = new Timer();
            timer.Interval = 200;
            timer.Tick += (s, args) =>
            {
                timer.Stop();
                if (!dgvcompany.Focused)
                    dgvcompany.Visible = false;
            };
            timer.Start();
        }

        private void DgvCompany_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter && dgvcompany.SelectedRows.Count > 0)
            {
                SelectCompanyFromGrid(dgvcompany.SelectedRows[0]);
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.Escape)
            {
                dgvcompany.Visible = false;
                txtcompany.Focus();
                e.Handled = true;
            }
        }

        private void DgvCompany_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            try
            {
                if (e.RowIndex >= 0)
                    SelectCompanyFromGrid(dgvcompany.Rows[e.RowIndex]);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error: {ex.Message}");
            }
        }

        private void SelectCompanyFromGrid(DataGridViewRow row)
        {
            selectedCompanyId = Convert.ToInt32(row.Cells["company_id"].Value);
            string companyName = row.Cells["company_name"].Value.ToString();
            txtcompany.Text = companyName;
            dgvcompany.Visible = false;
            txttotalamont.Focus();
        }

        #endregion

        #region Product Search

        private void TxtProduct_TextChanged(object sender, EventArgs e)
        {
            try
            {
                if (suppressTextChanged) return;

                string searchTerm = txtproduct.Text.Trim();

                if (!string.IsNullOrEmpty(searchTerm) && paneldetails.Visible)
                {
                    var batchesDl = new BatchesDl();
                    DataTable medicines = batchesDl.GetMedicines();

                    DataView dv = medicines.DefaultView;
                    dv.RowFilter = $"company_name LIKE '%{searchTerm}%' OR category_name LIKE '%{searchTerm}%' OR packing_name LIKE '%{searchTerm}%' OR name LIKE '%{searchTerm}%'";

                    if (dv.Count > 0)
                    {
                        dgvmedicines.DataSource = dv.ToTable();
                        dgvmedicines.Columns["company_id"].Visible = false;
                        dgvmedicines.Columns["packing_id"].Visible = false;
                        dgvmedicines.Columns["category_id"].Visible = false;
                        dgvmedicines.Columns["product_id"].Visible = false;
                        dgvmedicines.Visible = true;
                    }
                    else
                    {
                        dgvmedicines.Visible = false;
                    }
                }
                else
                {
                    dgvmedicines.Visible = false;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error: {ex.Message}");
            }
        }

        private void TxtProduct_KeyDown(object sender, KeyEventArgs e)
        {
            if (dgvmedicines.Visible && dgvmedicines.Rows.Count > 0)
            {
                int firstVisibleCol = GetFirstVisibleColumnIndex(dgvmedicines);

                switch (e.KeyCode)
                {
                    case Keys.Down:
                        {
                            int currentRow = dgvmedicines.CurrentCell?.RowIndex ?? -1;
                            int nextRow = currentRow + 1;

                            if (nextRow < dgvmedicines.Rows.Count)
                            {
                                dgvmedicines.ClearSelection();
                                dgvmedicines.CurrentCell = dgvmedicines.Rows[nextRow].Cells[firstVisibleCol];
                                dgvmedicines.Rows[nextRow].Selected = true;
                            }
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                            break;
                        }

                    case Keys.Up:
                        {
                            int currentRow = dgvmedicines.CurrentCell?.RowIndex ?? -1;
                            int prevRow = currentRow - 1;

                            if (prevRow >= 0)
                            {
                                dgvmedicines.ClearSelection();
                                dgvmedicines.CurrentCell = dgvmedicines.Rows[prevRow].Cells[firstVisibleCol];
                                dgvmedicines.Rows[prevRow].Selected = true;
                            }
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                            break;
                        }

                    case Keys.Enter:
                        if (dgvmedicines.CurrentRow != null)
                        {
                            SelectMedicineFromGrid(dgvmedicines.CurrentRow);
                            e.Handled = true;
                            e.SuppressKeyPress = true;
                        }
                        break;

                    case Keys.Escape:
                        dgvmedicines.Visible = false;
                        txtproduct.Focus();
                        e.Handled = true;
                        e.SuppressKeyPress = true;
                        break;
                }
            }
        }

        private void TxtProduct_Leave(object sender, EventArgs e)
        {
            Timer timer = new Timer();
            timer.Interval = 200;
            timer.Tick += (s, args) =>
            {
                timer.Stop();
                if (!dgvmedicines.Focused)
                    dgvmedicines.Visible = false;
            };
            timer.Start();
        }

        private void DgvMedicines_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter && dgvmedicines.SelectedRows.Count > 0)
            {
                SelectMedicineFromGrid(dgvmedicines.SelectedRows[0]);
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.Escape)
            {
                dgvmedicines.Visible = false;
                txtproduct.Focus();
                e.Handled = true;
            }
        }

        private void DgvMedicines_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex >= 0)
                SelectMedicineFromGrid(dgvmedicines.Rows[e.RowIndex]);
        }

        private void SelectMedicineFromGrid(DataGridViewRow row)
        {
            try
            {
                selectedProductId = Convert.ToInt32(row.Cells["product_id"].Value);
                txtsaleprice.Text = row.Cells["sale_price"].Value.ToString();

                string companyName = row.Cells["company_name"].Value.ToString();
                string categoryName = row.Cells["category_name"].Value.ToString();
                string packingName = row.Cells["packing_name"].Value.ToString();
                string productName = row.Cells["name"].Value.ToString();

                suppressTextChanged = true;
                txtproduct.Text = $"{productName}-{companyName} - {categoryName} - {packingName}";
                suppressTextChanged = false;

                dgvmedicines.Visible = false;
                txtquantity.Focus();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error: {ex.Message}");
            }
        }

        #endregion

        private int GetFirstVisibleColumnIndex(DataGridView dgv)
        {
            foreach (DataGridViewColumn col in dgv.Columns)
            {
                if (col.Visible)
                    return col.Index;
            }
            throw new InvalidOperationException("No visible columns found.");
        }

        #region Batch Items Grid Event Handlers

        private void DgvBatches_CellDoubleClick(object sender, DataGridViewCellEventArgs e)
        {
            try
            {
                if (e.RowIndex >= 0)
                {
                    DataRow row = batchItemsTable.Rows[e.RowIndex];

                    // Enter edit mode
                    isEditing = true;
                    editingBatchItemId = Convert.ToInt32(row["BatchItemID"]);

                    selectedProductId = Convert.ToInt32(row["MedicineID"]);
                    txtproduct.Text = row["MedicineName"].ToString();
                    txtquantity.Text = row["Quantity"].ToString();
                    txtcost.Text = row["PurchasePrice"].ToString();
                    txtsaleprice.Text = row["SalePrice"].ToString();
                    dateTimePicker1.Value = Convert.ToDateTime(row["ExpiryDate"]);

                    iconButton2.Text = "Update Product";
                    iconButton2.IconChar = FontAwesome.Sharp.IconChar.Edit;
                    iconButton2.BackColor = Color.Orange;
                    iconButton2.ForeColor = Color.White;

                    this.Text = "Add Batch Details - Editing Item";

                    txtquantity.Focus();
                    txtquantity.SelectAll();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error editing: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DgvBatches_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Delete && dgvbatches.SelectedRows.Count > 0)
            {
                DialogResult result = MessageBox.Show("Delete this item from database?",
                    "Confirm Delete", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

                if (result == DialogResult.Yes)
                {
                    try
                    {
                        int rowIndex = dgvbatches.SelectedRows[0].Index;
                        int batchItemId = Convert.ToInt32(batchItemsTable.Rows[rowIndex]["BatchItemID"]);

                        // Delete from database
                        bool success = batchItemsBl.DeleteBatchItem(batchItemId);

                        if (success)
                        {
                            // Reload from database
                            int batchId = DatabaseHelper.Instance.getbatchid(currentBatchName);
                            LoadBatchItemsFromDatabase(batchId);

                            MessageBox.Show("Item deleted from database!", "Success",
                                MessageBoxButtons.OK, MessageBoxIcon.Information);
                        }
                        else
                        {
                            MessageBox.Show("Failed to delete item!", "Error",
                                MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error: {ex.Message}", "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
            else if (e.KeyCode == Keys.Enter && dgvbatches.SelectedRows.Count > 0)
            {
                DgvBatches_CellDoubleClick(sender, new DataGridViewCellEventArgs(0, dgvbatches.SelectedRows[0].Index));
            }
        }

        #endregion

        #endregion

        private void iconButton4_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<AddCompany>();
            f.ShowDialog(this);
        }

        private void iconButton5_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<AddMedicine>();
            f.ShowDialog(this);
        }

        private void dgvbatches_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
        }
    }
    public class BatchSessionInfo
    {
        public string BatchName { get; set; }
        public int CompanyID { get; set; }
        public string CompanyName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public bool BatchSaved { get; set; }
        public DateTime SessionDate { get; set; }
    }

}
