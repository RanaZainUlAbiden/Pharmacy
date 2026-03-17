using System;
using System.Windows.Forms;

namespace fertilizesop.UI
{
    partial class Customersale
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.dataGridView1 = new System.Windows.Forms.DataGridView();
            this.name = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.sale_price = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.expiry_date = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.quantity = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.discount = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.final = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.total = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.txtproductsearch = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.panel1 = new System.Windows.Forms.Panel();
            this.iconButton4 = new FontAwesome.Sharp.IconButton();
            this.txtcustsearch = new System.Windows.Forms.TextBox();
            this.walking_in = new System.Windows.Forms.RadioButton();
            this.regular = new System.Windows.Forms.RadioButton();
            this.button2 = new System.Windows.Forms.Button();
            this.label7 = new System.Windows.Forms.Label();
            this.txtpaidamount = new System.Windows.Forms.TextBox();
            this.dateTimePicker1 = new System.Windows.Forms.DateTimePicker();
            this.iconButton1 = new FontAwesome.Sharp.IconButton();
            this.label5 = new System.Windows.Forms.Label();
            this.label4 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.totalwithoutdisc = new System.Windows.Forms.TextBox();
            this.txtfinaldiscount = new System.Windows.Forms.TextBox();
            this.txtfinalprice = new System.Windows.Forms.TextBox();
            this.label2 = new System.Windows.Forms.Label();
            this.panel2 = new System.Windows.Forms.Panel();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.panel1.SuspendLayout();
            this.panel2.SuspendLayout();
            this.SuspendLayout();
            // 
            // dataGridView1
            // 
            this.dataGridView1.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.dataGridView1.BackgroundColor = System.Drawing.Color.AliceBlue;
            this.dataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridView1.Columns.AddRange(new System.Windows.Forms.DataGridViewColumn[] {
            this.name,
            this.sale_price,
            this.expiry_date,
            this.quantity,
            this.discount,
            this.final,
            this.total});
            this.dataGridView1.Location = new System.Drawing.Point(6, 235);
            this.dataGridView1.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.dataGridView1.Name = "dataGridView1";
            this.dataGridView1.RowHeadersWidth = 62;
            this.dataGridView1.RowTemplate.Height = 28;
            this.dataGridView1.Size = new System.Drawing.Size(1575, 530);
            this.dataGridView1.TabIndex = 0;
            this.dataGridView1.CellContentClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellContentClick);
            // 
            // name
            // 
            this.name.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.name.DataPropertyName = "name";
            this.name.HeaderText = "Product";
            this.name.MinimumWidth = 8;
            this.name.Name = "name";
            this.name.ReadOnly = true;
            // 
            // sale_price
            // 
            this.sale_price.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.sale_price.DataPropertyName = "sale_price";
            this.sale_price.HeaderText = "Unit Price";
            this.sale_price.MinimumWidth = 8;
            this.sale_price.Name = "sale_price";
            // 
            // expiry_date
            // 
            this.expiry_date.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.expiry_date.DataPropertyName = "expiry_date";
            this.expiry_date.HeaderText = "expiry_date";
            this.expiry_date.MinimumWidth = 8;
            this.expiry_date.Name = "expiry_date";
            this.expiry_date.ReadOnly = true;
            // 
            // quantity
            // 
            this.quantity.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.quantity.DataPropertyName = "quantity";
            this.quantity.HeaderText = "quantity";
            this.quantity.MinimumWidth = 8;
            this.quantity.Name = "quantity";
            // 
            // discount
            // 
            this.discount.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.discount.DataPropertyName = "discount";
            this.discount.HeaderText = "discount";
            this.discount.MinimumWidth = 8;
            this.discount.Name = "discount";
            // 
            // final
            // 
            this.final.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.final.DataPropertyName = "final";
            this.final.HeaderText = "total";
            this.final.MinimumWidth = 8;
            this.final.Name = "final";
            // 
            // total
            // 
            this.total.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.total.DataPropertyName = "total";
            this.total.HeaderText = "final";
            this.total.MinimumWidth = 8;
            this.total.Name = "total";
            // 
            // txtproductsearch
            // 
            this.txtproductsearch.Location = new System.Drawing.Point(34, 134);
            this.txtproductsearch.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.txtproductsearch.Multiline = true;
            this.txtproductsearch.Name = "txtproductsearch";
            this.txtproductsearch.Size = new System.Drawing.Size(272, 45);
            this.txtproductsearch.TabIndex = 1;
            this.txtproductsearch.TextChanged += new System.EventHandler(this.txtproductsearch_TextChanged);
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Font = new System.Drawing.Font("Microsoft Sans Serif", 22F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.label1.ForeColor = System.Drawing.SystemColors.ButtonHighlight;
            this.label1.Location = new System.Drawing.Point(656, 22);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(324, 52);
            this.label1.TabIndex = 2;
            this.label1.Text = "Customer Sale";
            // 
            // panel1
            // 
            this.panel1.BackColor = System.Drawing.SystemColors.Control;
            this.panel1.Controls.Add(this.iconButton4);
            this.panel1.Controls.Add(this.txtcustsearch);
            this.panel1.Controls.Add(this.walking_in);
            this.panel1.Controls.Add(this.regular);
            this.panel1.Controls.Add(this.button2);
            this.panel1.Controls.Add(this.label7);
            this.panel1.Controls.Add(this.txtpaidamount);
            this.panel1.Controls.Add(this.dateTimePicker1);
            this.panel1.Controls.Add(this.iconButton1);
            this.panel1.Controls.Add(this.label5);
            this.panel1.Controls.Add(this.label4);
            this.panel1.Controls.Add(this.label3);
            this.panel1.Controls.Add(this.totalwithoutdisc);
            this.panel1.Controls.Add(this.txtfinaldiscount);
            this.panel1.Controls.Add(this.txtfinalprice);
            this.panel1.Controls.Add(this.dataGridView1);
            this.panel1.Controls.Add(this.label2);
            this.panel1.Controls.Add(this.panel2);
            this.panel1.Controls.Add(this.txtproductsearch);
            this.panel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel1.Location = new System.Drawing.Point(0, 0);
            this.panel1.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.panel1.Name = "panel1";
            this.panel1.Size = new System.Drawing.Size(1583, 904);
            this.panel1.TabIndex = 3;
            this.panel1.Paint += new System.Windows.Forms.PaintEventHandler(this.panel1_Paint);
            // 
            // iconButton4
            // 
            this.iconButton4.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.iconButton4.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(109)))), ((int)(((byte)(148)))), ((int)(((byte)(197)))));
            this.iconButton4.FlatAppearance.BorderColor = System.Drawing.Color.Indigo;
            this.iconButton4.FlatAppearance.BorderSize = 2;
            this.iconButton4.FlatAppearance.MouseDownBackColor = System.Drawing.Color.DodgerBlue;
            this.iconButton4.FlatAppearance.MouseOverBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(5)))), ((int)(((byte)(51)))), ((int)(((byte)(69)))));
            this.iconButton4.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
            this.iconButton4.Font = new System.Drawing.Font("Segoe UI Semibold", 10.2F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.iconButton4.ForeColor = System.Drawing.SystemColors.ButtonFace;
            this.iconButton4.IconChar = FontAwesome.Sharp.IconChar.PlusSquare;
            this.iconButton4.IconColor = System.Drawing.Color.Gainsboro;
            this.iconButton4.IconFont = FontAwesome.Sharp.IconFont.Auto;
            this.iconButton4.IconSize = 35;
            this.iconButton4.ImageAlign = System.Drawing.ContentAlignment.MiddleLeft;
            this.iconButton4.Location = new System.Drawing.Point(901, 136);
            this.iconButton4.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.iconButton4.Name = "iconButton4";
            this.iconButton4.Size = new System.Drawing.Size(54, 51);
            this.iconButton4.TabIndex = 199;
            this.iconButton4.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            this.iconButton4.TextImageRelation = System.Windows.Forms.TextImageRelation.ImageBeforeText;
            this.iconButton4.UseVisualStyleBackColor = false;
            this.iconButton4.Click += new System.EventHandler(this.iconButton4_Click);
            // 
            // txtcustsearch
            // 
            this.txtcustsearch.Location = new System.Drawing.Point(604, 136);
            this.txtcustsearch.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.txtcustsearch.Multiline = true;
            this.txtcustsearch.Name = "txtcustsearch";
            this.txtcustsearch.Size = new System.Drawing.Size(272, 45);
            this.txtcustsearch.TabIndex = 21;
            this.txtcustsearch.TextChanged += new System.EventHandler(this.txtcustsearch_TextChanged_1);
            // 
            // walking_in
            // 
            this.walking_in.AutoSize = true;
            this.walking_in.Location = new System.Drawing.Point(475, 170);
            this.walking_in.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.walking_in.Name = "walking_in";
            this.walking_in.Size = new System.Drawing.Size(107, 24);
            this.walking_in.TabIndex = 20;
            this.walking_in.TabStop = true;
            this.walking_in.Text = "walking_in";
            this.walking_in.UseVisualStyleBackColor = true;
            this.walking_in.CheckedChanged += new System.EventHandler(this.walking_in_CheckedChanged);
            // 
            // regular
            // 
            this.regular.AutoSize = true;
            this.regular.Location = new System.Drawing.Point(475, 134);
            this.regular.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.regular.Name = "regular";
            this.regular.Size = new System.Drawing.Size(83, 24);
            this.regular.TabIndex = 19;
            this.regular.TabStop = true;
            this.regular.Text = "regular";
            this.regular.UseVisualStyleBackColor = true;
            this.regular.CheckedChanged += new System.EventHandler(this.regular_CheckedChanged);
            // 
            // button2
            // 
            this.button2.BackColor = System.Drawing.Color.Black;
            this.button2.ForeColor = System.Drawing.SystemColors.ButtonHighlight;
            this.button2.Location = new System.Drawing.Point(111, 374);
            this.button2.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.button2.Name = "button2";
            this.button2.Size = new System.Drawing.Size(98, 28);
            this.button2.TabIndex = 18;
            this.button2.Text = "remove";
            this.button2.UseVisualStyleBackColor = false;
            this.button2.Click += new System.EventHandler(this.button2_Click);
            // 
            // label7
            // 
            this.label7.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.label7.AutoSize = true;
            this.label7.Font = new System.Drawing.Font("Microsoft Sans Serif", 7.8F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.label7.Location = new System.Drawing.Point(1210, 788);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(110, 20);
            this.label7.TabIndex = 17;
            this.label7.Text = "paid Amount";
            // 
            // txtpaidamount
            // 
            this.txtpaidamount.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.txtpaidamount.Location = new System.Drawing.Point(1214, 811);
            this.txtpaidamount.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.txtpaidamount.Multiline = true;
            this.txtpaidamount.Name = "txtpaidamount";
            this.txtpaidamount.Size = new System.Drawing.Size(276, 63);
            this.txtpaidamount.TabIndex = 16;
            // 
            // dateTimePicker1
            // 
            this.dateTimePicker1.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.dateTimePicker1.Location = new System.Drawing.Point(47, 811);
            this.dateTimePicker1.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.dateTimePicker1.Name = "dateTimePicker1";
            this.dateTimePicker1.Size = new System.Drawing.Size(327, 26);
            this.dateTimePicker1.TabIndex = 15;
            // 
            // iconButton1
            // 
            this.iconButton1.Anchor = System.Windows.Forms.AnchorStyles.Bottom;
            this.iconButton1.BackColor = System.Drawing.SystemColors.Control;
            this.iconButton1.IconChar = FontAwesome.Sharp.IconChar.Print;
            this.iconButton1.IconColor = System.Drawing.Color.Green;
            this.iconButton1.IconFont = FontAwesome.Sharp.IconFont.Auto;
            this.iconButton1.ImageAlign = System.Drawing.ContentAlignment.MiddleLeft;
            this.iconButton1.Location = new System.Drawing.Point(614, 811);
            this.iconButton1.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.iconButton1.Name = "iconButton1";
            this.iconButton1.Size = new System.Drawing.Size(150, 64);
            this.iconButton1.TabIndex = 14;
            this.iconButton1.Text = "print";
            this.iconButton1.UseVisualStyleBackColor = false;
            this.iconButton1.Click += new System.EventHandler(this.iconButton1_Click);
            // 
            // label5
            // 
            this.label5.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(1191, 206);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(82, 20);
            this.label5.TabIndex = 12;
            this.label5.Text = "Final Price";
            // 
            // label4
            // 
            this.label4.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(1191, 156);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(104, 20);
            this.label4.TabIndex = 11;
            this.label4.Text = "total discount";
            // 
            // label3
            // 
            this.label3.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(1191, 102);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(82, 20);
            this.label3.TabIndex = 10;
            this.label3.Text = "Total price";
            // 
            // totalwithoutdisc
            // 
            this.totalwithoutdisc.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.totalwithoutdisc.Location = new System.Drawing.Point(1302, 98);
            this.totalwithoutdisc.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.totalwithoutdisc.Multiline = true;
            this.totalwithoutdisc.Name = "totalwithoutdisc";
            this.totalwithoutdisc.Size = new System.Drawing.Size(276, 33);
            this.totalwithoutdisc.TabIndex = 9;
            // 
            // txtfinaldiscount
            // 
            this.txtfinaldiscount.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.txtfinaldiscount.Location = new System.Drawing.Point(1302, 148);
            this.txtfinaldiscount.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.txtfinaldiscount.Multiline = true;
            this.txtfinaldiscount.Name = "txtfinaldiscount";
            this.txtfinaldiscount.Size = new System.Drawing.Size(276, 30);
            this.txtfinaldiscount.TabIndex = 8;
            this.txtfinaldiscount.Text = "0";
            this.txtfinaldiscount.TextChanged += new System.EventHandler(this.txtfinaldiscount_TextChanged);
            // 
            // txtfinalprice
            // 
            this.txtfinalprice.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.txtfinalprice.Location = new System.Drawing.Point(1305, 195);
            this.txtfinalprice.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.txtfinalprice.Multiline = true;
            this.txtfinalprice.Name = "txtfinalprice";
            this.txtfinalprice.Size = new System.Drawing.Size(276, 33);
            this.txtfinalprice.TabIndex = 7;
            this.txtfinalprice.TextChanged += new System.EventHandler(this.txtfinalprice_TextChanged);
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(30, 102);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(119, 20);
            this.label2.TabIndex = 3;
            this.label2.Text = "Search Product";
            // 
            // panel2
            // 
            this.panel2.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(109)))), ((int)(((byte)(148)))), ((int)(((byte)(197)))));
            this.panel2.Controls.Add(this.label1);
            this.panel2.Dock = System.Windows.Forms.DockStyle.Top;
            this.panel2.Location = new System.Drawing.Point(0, 0);
            this.panel2.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.panel2.Name = "panel2";
            this.panel2.Size = new System.Drawing.Size(1583, 100);
            this.panel2.TabIndex = 0;
            this.panel2.Paint += new System.Windows.Forms.PaintEventHandler(this.panel2_Paint);
            // 
            // Customersale
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(9F, 20F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1583, 904);
            this.Controls.Add(this.panel1);
            this.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.Name = "Customersale";
            this.Text = "Customersale";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.Customersale_FormClosing);
            this.Load += new System.EventHandler(this.Customersale_Load);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.panel1.ResumeLayout(false);
            this.panel1.PerformLayout();
            this.panel2.ResumeLayout(false);
            this.panel2.PerformLayout();
            this.ResumeLayout(false);

        }

        

        #endregion

        private System.Windows.Forms.DataGridView dataGridView1;
        private System.Windows.Forms.TextBox txtproductsearch;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Panel panel1;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Panel panel2;
        private System.Windows.Forms.TextBox txtfinalprice;
        private System.Windows.Forms.TextBox txtfinaldiscount;
        private System.Windows.Forms.TextBox totalwithoutdisc;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label3;
        private FontAwesome.Sharp.IconButton iconButton1;
        private System.Windows.Forms.DateTimePicker dateTimePicker1;
        private TextBox txtpaidamount;
        private Label label7;
        private Button button2;
        private DataGridViewTextBoxColumn name;
        private DataGridViewTextBoxColumn sale_price;
        private DataGridViewTextBoxColumn expiry_date;
        private DataGridViewTextBoxColumn quantity;
        private DataGridViewTextBoxColumn discount;
        private DataGridViewTextBoxColumn final;
        private DataGridViewTextBoxColumn total;
        private TextBox txtcustsearch;
        private RadioButton walking_in;
        private RadioButton regular;
        private FontAwesome.Sharp.IconButton iconButton4;
    }
}