using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Windows.Forms;
using MedicineShop.BL;
using MedicineShop.Models;

namespace MedicineShop.UI
{
    public partial class AddMedicine : Form
    {
        private readonly MedicineBL _medicineBL = new MedicineBL();
        private readonly Medicine _medicine;
        private readonly bool _isEdit;

        public AddMedicine(Medicine med = null)
        {
            InitializeComponent();
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            BindCompanies();
            BindCategories();
            BindPackings();

            if (med != null)
            {
                _medicine = med;
                _isEdit = true;
                btnAdd.Visible = false;
                
                FillForm();
            }
            else
            {
                _medicine = new Medicine();
                _isEdit = false;
                btnAdd.Visible = true;
               
            }
        }

        // Allow Enter to move focus
        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Enter)
            {
                if (txtName.Focused) { pckcmb.Focus(); return true; }
                if (pckcmb.Focused) { txtPrice.Focus(); return true; }
                if (txtPrice.Focused) { cmbCategory.Focus(); return true; }
                if (cmbCategory.Focused) { cmbCompany.Focus(); return true; }
                if (cmbCompany.Focused) { threshold.Focus(); return true; }
                if (threshold.Focused) { txtDesc.Focus(); return true; }
                if (txtDesc.Focused) { btnAdd.Focus(); return true; }
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void BindCompanies(string search = "")
        {
            var list = _medicineBL.GetCompanyList(search);
            cmbCompany.DisplayMember = "Name";
            cmbCompany.ValueMember = "Id";
            cmbCompany.DataSource = list;
            cmbCompany.SelectedIndex = -1;
        }

        private void BindCategories(string search = "")
        {
            var list = _medicineBL.GetCategoryList(search);
            cmbCategory.DisplayMember = "Name";
            cmbCategory.ValueMember = "Id";
            cmbCategory.DataSource = list;
            cmbCategory.SelectedIndex = -1;
        }

        private void BindPackings(string search = "")
        {
            var list = _medicineBL.GetPackingList(search);
            pckcmb.DisplayMember = "Name";
            pckcmb.ValueMember = "Id";
            pckcmb.DataSource = list;
            pckcmb.SelectedIndex = -1;
        }

        private void FillForm()
        {
            txtName.Text = _medicine.Name;
            txtDesc.Text = _medicine.Description;
            txtPrice.Text = _medicine.SalePrice.ToString();
            threshold.Text = _medicine.minimum_threshold.ToString();

            cmbCompany.SelectedValue = _medicine.CompanyId;
            cmbCategory.SelectedValue = _medicine.CategoryId;
            pckcmb.SelectedValue = _medicine.PackingId;
        }

        private void SetMedicineFromForm()
        {
            _medicine.Name = txtName.Text.Trim();
            _medicine.Description = txtDesc.Text.Trim();
            _medicine.SalePrice = decimal.TryParse(txtPrice.Text, out decimal price) ? price : 0;
            _medicine.minimum_threshold = int.TryParse(threshold.Text, out int thre) ? thre : 0;

            // Simplified parsing for combo values
            _medicine.CompanyId = GetComboValue(cmbCompany);
            _medicine.CategoryId = GetComboValue(cmbCategory);
            _medicine.PackingId = GetComboValue(pckcmb);
        }

        private int GetComboValue(ComboBox combo)
        {
            // First try to get selected value directly
            if (combo.SelectedValue != null && int.TryParse(combo.SelectedValue.ToString(), out int selectedId))
            {
                return selectedId;
            }

            // If no selected value, try to find matching item by text
            if (!string.IsNullOrWhiteSpace(combo.Text) && combo.DataSource != null)
            {
                var dataSource = combo.DataSource as System.Collections.IList;
                if (dataSource != null)
                {
                    foreach (var item in dataSource)
                    {
                        // Use reflection to get Name property (since ComboItem has Name property)
                        var displayValue = item.GetType().GetProperty("Name")?.GetValue(item)?.ToString();
                        if (string.Equals(displayValue, combo.Text.Trim(), StringComparison.OrdinalIgnoreCase))
                        {
                            var idValue = item.GetType().GetProperty("Id")?.GetValue(item);
                            if (idValue != null && int.TryParse(idValue.ToString(), out int foundId))
                            {
                                return foundId;
                            }
                        }
                    }
                }
            }

            return 0; // Return 0 if no valid selection found
        }

        private bool ValidateForm()
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(txtName.Text))
                errors.Add("Medicine name is required");


            if (string.IsNullOrWhiteSpace(txtPrice.Text) || !decimal.TryParse(txtPrice.Text, out _))
                errors.Add("Valid price is required");

            if (string.IsNullOrWhiteSpace(threshold.Text) || !int.TryParse(threshold.Text, out _))
                errors.Add("Valid Threshold is required");

            if (GetComboValue(cmbCompany) == 0)
                errors.Add("Please select a valid company");

            if (GetComboValue(cmbCategory) == 0)
                errors.Add("Please select a valid category");

            if (GetComboValue(pckcmb) == 0)
                errors.Add("Please select a valid packing");

            if (errors.Any())
            {
                MessageBox.Show(string.Join("\n", errors), "Validation Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            return true;
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            if (!ValidateForm()) return;

            SetMedicineFromForm();
            try
            {
                if (_medicineBL.AddMedicine(_medicine) > 0)
                {
                    MessageBox.Show("Medicine added successfully!", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    DialogResult = DialogResult.OK;
                    Close();
                }
                else
                {
                    MessageBox.Show("Failed to add medicine. Please try again.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error adding medicine: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnUpdate_Click(object sender, EventArgs e)
        {
            if (!ValidateForm()) return;

            SetMedicineFromForm();
            try
            {
                if (_medicineBL.UpdateMedicine(_medicine) > 0)
                {
                    MessageBox.Show("Medicine updated successfully!", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    DialogResult = DialogResult.OK;
                    Close();
                }
                else
                {
                    MessageBox.Show("Failed to update medicine. Please try again.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error updating medicine: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        // Improved Universal reusable searchable combo binder
        private void BindSearchableCombo<T>(
            ComboBox combo,
            List<T> list,
            string displayMember,
            string valueMember,
            string typedText)
        {
            try
            {
                combo.BeginUpdate();

                // Store current selection if any
                var previousSelection = combo.SelectedValue;

                // Always bind, even if empty list
                combo.DisplayMember = displayMember;
                combo.ValueMember = valueMember;
                combo.DataSource = list;

                // Try to restore previous selection if it still exists
                if (previousSelection != null && list.Count > 0)
                {
                    combo.SelectedValue = previousSelection;
                }

                // If list has results, show them
                if (list.Count > 0)
                {
                    combo.DroppedDown = true;
                }

                // Restore typed text and cursor position
                combo.Text = typedText;
                combo.SelectionStart = typedText.Length;
                combo.SelectionLength = 0;

                combo.EndUpdate();
            }
            catch (Exception ex)
            {
                // Log error or handle gracefully
                combo.EndUpdate();
                MessageBox.Show($"Error in combo binding: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // Searchable events with improved error handling
        private void cmbCompany_TextUpdate(object sender, EventArgs e)
        {
            try
            {
                string text = cmbCompany.Text.Trim();
                var list = _medicineBL.GetCompanyList(text);
                BindSearchableCombo(cmbCompany, list, "Name", "Id", text);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error searching companies: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void cmbCategory_TextUpdate(object sender, EventArgs e)
        {
            try
            {
                string text = cmbCategory.Text.Trim();
                var list = _medicineBL.GetCategoryList(text);
                BindSearchableCombo(cmbCategory, list, "Name", "Id", text);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error searching categories: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void pckcmb_TextUpdate(object sender, EventArgs e)
        {
            try
            {
                string text = pckcmb.Text.Trim();
                var list = _medicineBL.GetPackingList(text);
                BindSearchableCombo(pckcmb, list, "Name", "Id", text);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error searching packing: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // Additional event handlers for better UX
        private void cmbCompany_SelectionChangeCommitted(object sender, EventArgs e)
        {
            // This ensures the selection is properly committed
            var combo = sender as ComboBox;
            if (combo?.SelectedValue != null)
            {
                // Selection is confirmed
                combo.DroppedDown = false;
            }
        }

        private void cmbCategory_SelectionChangeCommitted(object sender, EventArgs e)
        {
            var combo = sender as ComboBox;
            if (combo?.SelectedValue != null)
            {
                combo.DroppedDown = false;
            }
        }

        private void pckcmb_SelectionChangeCommitted(object sender, EventArgs e)
        {
            var combo = sender as ComboBox;
            if (combo?.SelectedValue != null)
            {
                combo.DroppedDown = false;
            }
        }

        // Handle Leave events to ensure proper selection
        private void cmbCompany_Leave(object sender, EventArgs e)
        {
            var combo = sender as ComboBox;
            if (combo != null && GetComboValue(combo) == 0 && !string.IsNullOrWhiteSpace(combo.Text))
            {
                combo.BackColor = System.Drawing.Color.LightPink;
            }
            else
            {
                combo.BackColor = System.Drawing.SystemColors.Window;
            }
        }

        private void cmbCategory_Leave(object sender, EventArgs e)
        {
            var combo = sender as ComboBox;
            if (combo != null && GetComboValue(combo) == 0 && !string.IsNullOrWhiteSpace(combo.Text))
            {
                combo.BackColor = System.Drawing.Color.LightPink;
            }
            else
            {
                combo.BackColor = System.Drawing.SystemColors.Window;
            }
        }

        private void pckcmb_Leave(object sender, EventArgs e)
        {
            var combo = sender as ComboBox;
            if (combo != null && GetComboValue(combo) == 0 && !string.IsNullOrWhiteSpace(combo.Text))
            {
                combo.BackColor = System.Drawing.Color.LightPink;
            }
            else
            {
                combo.BackColor = System.Drawing.SystemColors.Window;
            }
        }

        // Clean up method for form closing
        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            base.OnFormClosed(e);
            // Any cleanup code if needed
        }
    }
}