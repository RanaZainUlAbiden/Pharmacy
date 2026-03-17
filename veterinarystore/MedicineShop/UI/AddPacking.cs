using MedicineShop.BL;
using MedicineShop.Models;
using System;
using System.Windows.Forms;

namespace MedicineShop.UI
{
    public partial class AddPacking : Form
    {
        private readonly PackingBL _packingBL = new PackingBL();

        public AddPacking()
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
                if (keyData == Keys.Enter)
                {
                    if (txtName.Focused)
                    {
                        addbtn.Focus();
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


        private void btnAdd_Click(object sender, EventArgs e)
        {
            try
            {
                Packing packing = new Packing
                {
                    PackingName = txtName.Text.Trim()
                };

                int result = _packingBL.AddPacking(packing);
                if (result > 0)
                {
                    MessageBox.Show("Packing added successfully!", "Success",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    DialogResult = DialogResult.OK;
                    Close();
                }
                else
                {
                    MessageBox.Show("Packing not added.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Validation Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }
    }
}
