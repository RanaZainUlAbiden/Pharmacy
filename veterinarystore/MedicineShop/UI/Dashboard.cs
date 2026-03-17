using fertilizesop.UI;
using FontAwesome.Sharp;
using MedicineShop.UI;
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

namespace MedicineShop
{
    public partial class Dashboard : Form
    {
        private Form activeForm = null;
        private IconButton currentBtn;

        public static Dashboard Instance { get; private set; }
        public Dashboard()
        {
            InitializeComponent();
            this.Activated += Dashboard_Activated;
            Instance=this;
            this.FormClosing += Dashboard_FormClosing;

        }

        private void btninventory_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<MedicineMain>();
            LoadFormIntoPanel(f);
        }
        public async void LoadFormIntoPanel(Form newForm)
        {
            if (newForm == null || newForm == activeForm) return;

            if (activeForm != null)
            {
                await FadeOutFormAsync(activeForm);
                panel10.Controls.Remove(activeForm); // <- fix: match the one used below
                activeForm.Dispose();
            }

            activeForm = newForm;
            newForm.TopLevel = false;
            newForm.FormBorderStyle = FormBorderStyle.None;
            newForm.Dock = DockStyle.Fill;
            newForm.Opacity = 0;
            panel10.Controls.Add(newForm); // Use same panel here
            newForm.Show();

            await FadeInFormAsync(newForm);
        }

        private void activebutton(object senderbtn, System.Drawing.Color color)
        {
            // Reset previous button
            disablebutton();

            // Set the new button as current
            currentBtn = (IconButton)senderbtn;
            currentBtn.BackColor = System.Drawing.Color.FromArgb(5, 51, 69);
            currentBtn.ForeColor = color;
            //currentBtn.TextAlign = ContentAlignment.MiddleCenter;
            currentBtn.IconColor = color;
            currentBtn.TextImageRelation = TextImageRelation.TextBeforeImage;
            //currentBtn.ImageAlign = ContentAlignment.MiddleRight;
        }
        private void disablebutton()
        {
            if (currentBtn != null)
            {
                currentBtn.BackColor = System.Drawing.Color.Transparent;
                currentBtn.ForeColor = System.Drawing.Color.White; // Fixed: Assigning a valid color value  
                currentBtn.TextAlign = ContentAlignment.MiddleLeft;
                currentBtn.IconColor = System.Drawing.Color.White; // Fixed: Assigning a valid color value  
                currentBtn.TextImageRelation = TextImageRelation.ImageBeforeText;
                currentBtn.ImageAlign = ContentAlignment.MiddleLeft;
            }
        }

        private async Task FadeOutFormAsync(Form form)
        {
            if (form == null || form.IsDisposed || !form.IsHandleCreated)
                return;

            try
            {
                while (form.Opacity > 0)
                {
                    if (form.IsDisposed) return;

                    form.Opacity -= 0.05;
                    await Task.Delay(10);
                }
                form.Opacity = 0;
            }
            catch (ObjectDisposedException)
            {
                // Safe exit
            }
        }
        private async Task FadeInFormAsync(Form form)
        {
            if (form == null || form.IsDisposed || !form.IsHandleCreated)
                return;

            try
            {
                while (form.Opacity < 1)
                {
                    if (form.IsDisposed) return;

                    form.Opacity += 0.05;
                    await Task.Delay(10);
                }
                form.Opacity = 1;
            }
            catch (ObjectDisposedException)
            {
                // Safe exit
            }
        }

        private void Dashboard_Activated(object sender, EventArgs e)
        {
            this.TopMost = true;   // Push to front
            this.TopMost = false;  // Reset
            this.BringToFront();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<HomeContentform>();
            LoadFormIntoPanel(f);

        }

        private void btnbatches_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<Batchform>();
            LoadFormIntoPanel(f);
            activebutton(sender, Color.FromArgb(253, 138, 114));
        }

        private void btndashboard_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<HomeContentform>();
            LoadFormIntoPanel(f);
        }

        private void btnsale_Click(object sender, EventArgs e)
        {
            var f= Program.ServiceProvider.GetRequiredService<Customersale>();
            LoadFormIntoPanel(f);
        }
        private void ExpandPanel(Panel panel, int expandedHeight)
        {
            panel.Height = expandedHeight;
        }

        private void CollapsePanel(Panel panel, int collapsedHeight)
        {
            panel.Height = collapsedHeight;
        }
        private void CollapseAllTogglePanels()
        {
            CollapsePanel(panelbatch, 60);
            CollapsePanel(panelinventory, 60);
        }
        private void iconPictureBox1_Click(object sender, EventArgs e)
        {
            if (panelinventory.Height == 131)
                CollapsePanel(panelinventory, 60);
            else
            {
                CollapseAllTogglePanels();
                ExpandPanel(panelinventory, 131);
            }
        }

        private void iconPictureBox2_Click(object sender, EventArgs e)
        {
            if (panelbatch.Height == 131)
                CollapsePanel(panelbatch, 60);
            else
            {
                CollapseAllTogglePanels();
                ExpandPanel(panelbatch, 131);
            }
        }

        private void btnrecord_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<AddCategory>();
            f.ShowDialog(this);
        }

        private void btnbatchdetails_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<AddBatchdetailsform>();
            LoadFormIntoPanel(f);
        }

        private void btnbatchdetails_Click_1(object sender, EventArgs e)
        {

        }

        private void btnsuppliers_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<CompanyMain>();
            LoadFormIntoPanel(f);
        }

        private void iconButton2_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<CompanyBill>();
            LoadFormIntoPanel(f);
        }

        private void iconButton3_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<customerbillui>();
            LoadFormIntoPanel(f);

        }

        private void iconButton4_Click(object sender, EventArgs e)
        {
            var f = Program.ServiceProvider.GetRequiredService<Customermain>();
            LoadFormIntoPanel(f);
        }
        private void Dashboard_FormClosing(object sender, FormClosingEventArgs e)
        {
            DialogResult result = MessageBox.Show(
                "Do you want to back up the database before closing?",
                "Backup Database",
                MessageBoxButtons.YesNoCancel,
                MessageBoxIcon.Question);

            if (result == DialogResult.Yes)
            {
                try
                {
                    DatabaseHelper.Instance.BackupDatabase(@"D:\Backups");
                    MessageBox.Show("Backup completed successfully!", "Backup", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch (Exception ex)
                {
                    // Optionally cancel closing if backup fails
                    DialogResult retry = MessageBox.Show(
                        "Backup failed: " + ex.Message + "\nDo you still want to exit?",
                        "Backup Error",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning);

                    if (retry == DialogResult.No)
                    {
                        e.Cancel = true; // stop the app from closing
                    }
                }
            }
            else if (result == DialogResult.Cancel)
            {
                e.Cancel = true; // user pressed Cancel → don’t exit
            }
        }

        private void iconButton5_Click(object sender, EventArgs e)
        {
            var f=Program.ServiceProvider.GetRequiredService<expired_products>();   
            LoadFormIntoPanel(f);
        }

        private void panel10_Paint(object sender, PaintEventArgs e)
        {

        }
    }
}
