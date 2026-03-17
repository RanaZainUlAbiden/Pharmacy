using System;
using System.Windows.Forms;
using System.Xml.Linq;
using MedicineShop.BL;
using MedicineShop.Models;
using Org.BouncyCastle.Pqc.Crypto.Lms;

namespace MedicineShop.UI
{
    public partial class AddCompany : Form
    {
        private readonly CompanyBL companyBL = new CompanyBL();
        private Company company;

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == Keys.Enter)
                {
                    if (txtName.Focused)
                    {
                        //string name = txtName.Text;
                        txtContact.Focus();
                        //txtName.Text = name;
                        return true;
                    }

                    else if (txtContact.Focused)
                    {
                        txtAddress.Focus();
                        return true;
                    }

                    else  if(txtAddress.Focused)
                    {
                        txtAddress.Focus();
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

        public AddCompany()
        {
            InitializeComponent();
            this.FormBorderStyle = FormBorderStyle.FixedDialog; // Fixed size
            this.MaximizeBox = false;  // disable maximize button
            this.MinimizeBox = false;  // optional
            editbtn.Visible = false;  // Add mode
        }

        public AddCompany(Company companyToEdit)
        {
            InitializeComponent();
            company = companyToEdit;
            txtName.Text = company.CompanyName;
            txtContact.Text = company.Contact;
            txtAddress.Text = company.Address;

            addbtn.Visible = false;   // Edit mode
            editbtn.Visible = true;
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            try
            {
                company = new Company
                {
                    CompanyName = txtName.Text,
                    Contact = txtContact.Text,
                    Address = txtAddress.Text
                };

                companyBL.AddCompany(company);
                MessageBox.Show("Company added successfully.");
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void btnEdit_Click(object sender, EventArgs e)
        {
            try
            {
                company.CompanyName = txtName.Text;
                company.Contact = txtContact.Text;
                company.Address = txtAddress.Text;

                companyBL.UpdateCompany(company);
                MessageBox.Show("Company updated successfully.");
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }

        private void label4_Click(object sender, EventArgs e)
        {

        }

        private void textBox2_TextChanged(object sender, EventArgs e)
        {

        }

        private void label3_Click(object sender, EventArgs e)
        {

        }

        private void txttotalprice_TextChanged(object sender, EventArgs e)
        {

        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void btnsave_Click(object sender, EventArgs e)
        {

        }

        private void txtContact_TextChanged(object sender, EventArgs e)
        {

        }

        private void lblBatch_Click(object sender, EventArgs e)
        {

        }

        private void lblProducts_Click(object sender, EventArgs e)
        {

        }

        private void lblQuantity_Click(object sender, EventArgs e)
        {

        }

        private void textBox3_TextChanged(object sender, EventArgs e)
        {

        }

        private void txtName_TextChanged(object sender, EventArgs e)
        {

        }

        private void txtAddress_TextChanged(object sender, EventArgs e)
        {

        }

        private void panel1_Paint(object sender, PaintEventArgs e)
        {

        }

        private void toplbl_Click(object sender, EventArgs e)
        {

        }
    }
}
