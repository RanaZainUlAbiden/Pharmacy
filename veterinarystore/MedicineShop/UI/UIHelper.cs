using System.Drawing;
using System.Windows.Forms;

namespace TechStore.UI
{
    public static class UIHelper
    {
        public static void AddButtonColumn(DataGridView grid, string columnName, string headerText, string buttonText)
        {
            if (!grid.Columns.Contains(columnName))
            {
                var buttonColumn = new DataGridViewButtonColumn
                {
                    Name = columnName,
                    HeaderText = headerText,
                    Text = buttonText,
                    UseColumnTextForButtonValue = true,
                    AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells
                };

                grid.Columns.Add(buttonColumn);
            }
        }


        public static void StyleGridView(DataGridView grid)
        {
            if (grid == null) return;

            // General layout & restrictions
            grid.BorderStyle = BorderStyle.None;
            grid.BackgroundColor = Color.White;
            grid.ReadOnly = true;
            grid.AllowUserToAddRows = false;
            grid.AllowUserToDeleteRows = false;
            grid.AllowUserToResizeRows = false;
            grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            grid.MultiSelect = false;
            grid.RowTemplate.Height = 35;
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;

            // Alternating row style
            grid.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(238, 239, 249);

            // Cell borders & selection colors
            grid.CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal;
            grid.DefaultCellStyle.SelectionBackColor = Color.SeaGreen;
            grid.DefaultCellStyle.SelectionForeColor = Color.WhiteSmoke;

            // Header styling
            grid.EnableHeadersVisualStyles = false;
            grid.ColumnHeadersBorderStyle = DataGridViewHeaderBorderStyle.None;
            grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(20, 25, 72);
            grid.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 16, FontStyle.Bold);

            // Default cell font
            grid.DefaultCellStyle.Font = new Font("Segoe UI", 10);


        }



        public static void ApplyButtonStyles(DataGridView grid)
        {
            grid.CellPainting += (sender, e) =>
            {
                if (e.RowIndex < 0 || e.ColumnIndex < 0)
                    return;

                string columnName = grid.Columns[e.ColumnIndex].Name;
                if (columnName == "Edit" || columnName == "Delete")
                {
                    e.PaintBackground(e.CellBounds, true);

                    Color backColor = columnName == "Edit" ? Color.SteelBlue : Color.IndianRed;
                    Color textColor = Color.White;

                    using (Brush b = new SolidBrush(backColor))
                        e.Graphics.FillRectangle(b, e.CellBounds);

                    TextRenderer.DrawText(
                        e.Graphics,
                        columnName,
                        grid.Font,
                        e.CellBounds,
                        textColor,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter
                    );

                    e.Handled = true;
                }
            };
        }

        public static void RoundPanelCorners(Panel panel, int radius)
        {
            var bounds = new Rectangle(0, 0, panel.Width, panel.Height);
            int diameter = radius * 2;

            var path = new System.Drawing.Drawing2D.GraphicsPath();
            path.StartFigure();
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();

            panel.Region = new Region(path);
        }

        public static void ShowCenteredPanel(Form form, Panel panel)
        {
            panel.Left = (form.ClientSize.Width - panel.Width) / 2;
            panel.Top = (form.ClientSize.Height - panel.Height) / 2;
            panel.BringToFront();
            panel.Visible = true;
        }
    }
}
