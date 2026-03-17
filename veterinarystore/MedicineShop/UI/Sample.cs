using MedicineShop.BL;
using MedicineShop.DL;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace MedicineShop.UI
{
    public partial class Sample : Form
    {
        BatchItemsDl bl;
        public Sample()
        {
            InitializeComponent();
            bl = new BatchItemsDl();
        }

        private void iconButton1_Click(object sender, EventArgs e)
        {

        }

        private void Sample_Load(object sender, EventArgs e)
        {

        }

        private void Sample_Load_1(object sender, EventArgs e)
        {
            load();
        }
        private void load()
        {
            var list = bl.GetAllBatchItems();
            dataGridView2.DataSource = list;
            //dataGridView2.Columns["CompanyID"].Visible = false;
            //dataGridView2.Columns["PurchaseBatchID"].Visible = false;

        }

    }
}