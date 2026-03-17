using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using fertilizesop.BL.Models;
using fertilizesop.DL;
using MedicineShop.UI;
using MedicineShop;

namespace TechStore.UI
{
    public partial class Login : Form
    {
        public Login()
        {
            InitializeComponent();
            txtpassword.PasswordChar = '*';
            //txtpassword.UseSystemPasswordChar = true; // hides password
            this.WindowState = FormWindowState.Maximized;   
            this.AutoScaleMode = AutoScaleMode.Dpi;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Font = SystemFonts.DefaultFont;
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            try
            {
                if (keyData == Keys.Enter)
                {
                    if(txtname.Focused)
                    {
                        txtpassword.Focus();
                        return true;
                    }
                    else if(txtpassword.Focused)
                    {
                        btnlogin.PerformClick();
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

        private void txtname_TextChanged(object sender, EventArgs e)
        {

        }

        private void txtpassword_TextChanged(object sender, EventArgs e)
        {

        }

        private void btnlogin_Click(object sender, EventArgs e)
        {
            string username = txtname.Text.Trim();
            string password = txtpassword.Text.Trim();

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                MessageBox.Show("Please enter both username and password.");
                return;
            }

            if (!LoginDL.ValidateUser(username, password))
            {
                MessageBox.Show("Invalid credentials.");
                return;
            }

            // Just set DialogResult and close - Dashboard will be shown by Program.cs
            this.DialogResult = DialogResult.OK;
            //var dashboard = Program.ServiceProvider.GetRequiredService<Dashboard>();
            //dashboard.Show();
            this.Close();
        }


        private void Login_Load(object sender, EventArgs e)
        {

        }

        private void panel2_Paint(object sender, PaintEventArgs e)
        {

        }

        private void panel1_Paint(object sender, PaintEventArgs e)
        {

        }
        private bool passwordVisible = false;
        private void pictureBox1_Click(object sender, EventArgs e)
        {
            passwordVisible = !passwordVisible;

            if (passwordVisible)
            {
                // Show password
                txtpassword.PasswordChar = '\0'; // Show characters
                                                 // OR if using system password char:
                                                 // txtpassword.UseSystemPasswordChar = false;
            }
            else
            {
                // Hide password
                txtpassword.PasswordChar = '*'; // Hide with asterisks
                                                // OR if using system password char:
                                                // txtpassword.UseSystemPasswordChar = true;
            }
        }
    }
  

}
