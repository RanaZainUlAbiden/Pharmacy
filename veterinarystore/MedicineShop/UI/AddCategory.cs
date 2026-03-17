using MedicineShop.BL;
using MedicineShop.Models;
using Org.BouncyCastle.Pqc.Crypto.Lms;
using System;
using System.Windows.Forms;

namespace MedicineShop.UI
{
    public partial class AddCategory : Form
    {
        private readonly CategoryBL _categoryBL = new CategoryBL();

        public AddCategory()
        {
            InitializeComponent();
            this.FormBorderStyle = FormBorderStyle.FixedDialog; // Fixed size
            this.MaximizeBox = false;  // disable maximize button
            this.MinimizeBox = false;  // optional
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if(keyData == Keys.Enter)
                {
                    if(txtCategoryName.Focused )
                    {
                        addbtn.PerformClick();
                    }
                }
            }
            catch(Exception ex)
            {
                MessageBox.Show("error in event listener" , ex.Message);
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            try
            {
                Category category = new Category
                {
                    CategoryName = txtCategoryName.Text.Trim()
                };

                int result = _categoryBL.AddCategory(category);
                if (result > 0)
                {
                    MessageBox.Show("Category added successfully!", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    DialogResult = DialogResult.OK;
                    Close();
                }
                else
                {
                    MessageBox.Show("Category not added.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Validation Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void txtCategoryName_TextChanged(object sender, EventArgs e)
        {

        }

        private void lblBatch_Click(object sender, EventArgs e)
        {

        }
    }
}
