using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using MedicineShop.BL;
using MedicineShop.BL.Bl;
using MedicineShop.DL;
using MedicineShop.Models;

namespace MedicineShop.UI
{
    public partial class Addcustomer : Form
    {
        private readonly CustomerBl customerbl = new CustomerBl();
        private Customer customer;
        public Addcustomer()
        {
            InitializeComponent();
            editbtn.Visible = false;
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == Keys.Enter)
                {
                    if (txtName.Focused)
                    {
                        txtContact.Focus();
                        return true;
                    }

                    else if (txtContact.Focused)
                    {
                        txtAddress.Focus();
                        return true;
                    }

                    else if (txtAddress.Focused)
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

        public Addcustomer(Customer customerToEdit)
        {
            InitializeComponent();
            customer = customerToEdit;
            txtName.Text = customer.full_name;
            txtContact.Text = customer.Contact;
            txtAddress.Text = customer.Address;

            addbtn.Visible = false;   // Edit mode
            editbtn.Visible = true;
        }

        private void editbtn_Click(object sender, EventArgs e)
        {
            try
            {
                customer.full_name = txtName.Text;
                customer.Contact = txtContact.Text;
                customer.Address = txtAddress.Text;

                customerbl.UpdateCustomer(customer);
                MessageBox.Show("Customer updated successfully.");
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void btnAdd_Click(object sender, EventArgs e)
        {
            try
            {
                customer = new Customer
                {
                    full_name = txtName.Text,
                    Contact = txtContact.Text,
                    Address = txtAddress.Text
                };

                customerbl.AddCompany(customer);
                MessageBox.Show("Customer added successfully.");
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
    }
}
