using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using TechStore.BusinessLogic;
using TechStore.Models;
using TechStore.Interfaces;

namespace MedicineShop.UI
{
    public partial class HomeContentform : Form
    {
        private readonly IDashboardService _dashboardService;
        private System.Windows.Forms.Timer refreshTimer;

        // Summary Cards Controls
        private Panel summaryPanel;
        private Label lblTotalProducts, lblTotalCompanies, lblLowStock, lblExpiringItems;
        private Label lblTodaySales, lblTodayRevenue, lblPendingPayments, lblInventoryValue;
        private Label lblTodayProfit; // ADD THIS
        private Label lblMonthProfit;

        // Data Grid Controls
        private DataGridView dgvLowStock, dgvExpiringItems, dgvPendingPurchases;
        private Panel lowStockPanel, expiringPanel, purchasesPanel;

        private Panel mainContentPanel;
        private Label lblWelcome;

        private DateTime lastDataRefresh;
        private bool isRefreshing;

        public HomeContentform()
        {
            InitializeComponent();
            _dashboardService = new DashboardService();
            InitializeDashboard();
            SetupTimers();

            // Load data immediately when form opens
            this.Load += async (s, e) => await LoadDashboardDataAsync();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x02000000; // WS_EX_COMPOSITED for double buffering
                return cp;
            }
        }

        private void InitializeDashboard()
        {
            this.WindowState = FormWindowState.Maximized;
            this.BackColor = Color.FromArgb(245, 248, 250);

            // Enable double buffering for smoother rendering
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.DoubleBuffer, true);

            // Clear and setup main container
            panel4.Controls.Clear();
            panel4.AutoScroll = true;
            panel4.Dock = DockStyle.Fill;
            panel4.Padding = new Padding(0);

            // Create sections in correct visual order
            var welcomeSection = CreateWelcomeSectionPanel();
            var summarySection = CreateSummaryCardsPanel();
            var dataSection = CreateDataGridPanelsSection();
            var footerSection = CreateAdditionalInfoPanelSection();

            // Add in reverse order for proper stacking
            panel4.Controls.Add(footerSection);
            panel4.Controls.Add(dataSection);
            panel4.Controls.Add(summarySection);
            panel4.Controls.Add(welcomeSection);

            // Handle resize events
            this.Resize += HomeContentform_Resize;
            panel4.Resize += Panel4_Resize;
        }

        private Panel CreateWelcomeSectionPanel()
        {
            var welcomePanel = new Panel
            {
                Height = 80,
                Dock = DockStyle.Top,
                BackColor = Color.White,
                Margin = new Padding(0, 0, 0, 15),
                BorderStyle = BorderStyle.None
            };

            welcomePanel.Paint += (s, e) =>
            {
                using (var pen = new Pen(Color.FromArgb(230, 235, 240)))
                {
                    e.Graphics.DrawLine(pen, 0, welcomePanel.Height - 1, welcomePanel.Width, welcomePanel.Height - 1);
                }
            };

            var contentContainer = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                Padding = new Padding(25, 20, 25, 20)
            };

            lblWelcome = new Label
            {
                Text = "Ali Veterinary Clinic",
                Font = new Font("Segoe UI", 24F, FontStyle.Bold),
                ForeColor = Color.FromArgb(44, 62, 80),
                AutoSize = true,
                Location = new Point(0, 10),
                BackColor = Color.Transparent
            };

            contentContainer.Controls.Add(lblWelcome);
            welcomePanel.Controls.Add(contentContainer);

            return welcomePanel;
        }

        private Panel CreateSummaryCardsPanel()
        {
            summaryPanel = new Panel
            {
                Height = 200,
                Dock = DockStyle.Top,
                BackColor = Color.Transparent,
                Padding = new Padding(25, 15, 25, 30),
                Margin = new Padding(0, 0, 0, 30)
            };

            RefreshSummaryCardLayout();
            return summaryPanel;
        }

        private void RefreshSummaryCardLayout()
        {
            if (summaryPanel == null) return;

            summaryPanel.Controls.Clear();

            var containerWidth = summaryPanel.ClientSize.Width - 50;
            var spacing = 10;
            int cardsPerRow = containerWidth < 1200 ? 3 : 5; // Changed to support 9 cards

            // Adjust panel height based on rows needed
            if (cardsPerRow == 3)
                summaryPanel.Height = 480; // 3 rows of 3 cards
            else
                summaryPanel.Height = 320; // 2 rows of 5 and 4 cards

            var cardWidth = (containerWidth - (spacing * (cardsPerRow - 1))) / cardsPerRow;
            var cardHeight = 140;

            if (cardWidth < 180)
            {
                cardWidth = Math.Max(180, (containerWidth - spacing) / 2);
                cardsPerRow = 2;
                summaryPanel.Height = 640; // More rows needed
            }

            var cardData = new[]
            {
        new { Title = "Total Products", Value = "0", Color = Color.FromArgb(52, 152, 219), IsClickable = true },
        new { Title = "Companies", Value = "0", Color = Color.FromArgb(46, 204, 113), IsClickable = true },
        new { Title = "Low Stock Items", Value = "0", Color = Color.FromArgb(231, 76, 60), IsClickable = true },
        new { Title = "Expiring Soon", Value = "0", Color = Color.FromArgb(243, 156, 18), IsClickable = true },
        new { Title = "Today's Sales", Value = "0", Color = Color.FromArgb(155, 89, 182), IsClickable = true },
        new { Title = "Today's Revenue", Value = "Rs 0", Color = Color.FromArgb(52, 73, 94), IsClickable = true },
        new { Title = "Today's Profit", Value = "Rs 0", Color = Color.FromArgb(39, 174, 96), IsClickable = true },
        new { Title = "Month's Profit", Value = "Rs 0", Color = Color.FromArgb(22, 160, 133), IsClickable = true },
        new { Title = "Inventory Value", Value = "Rs 0", Color = Color.FromArgb(41, 128, 185), IsClickable = true }
    };

            var labels = new[] {
        lblTotalProducts, lblTotalCompanies, lblLowStock, lblExpiringItems,
        lblTodaySales, lblTodayRevenue, lblTodayProfit, lblMonthProfit, lblInventoryValue
    };

            for (int i = 0; i < cardData.Length; i++)
            {
                int row = i / cardsPerRow;
                int col = i % cardsPerRow;

                int x = col * (cardWidth + spacing);
                int y = row * (cardHeight + 15);

                var card = cardData[i];
                var label = labels[i] ?? new Label();

                switch (i)
                {
                    case 0: lblTotalProducts = label; break;
                    case 1: lblTotalCompanies = label; break;
                    case 2: lblLowStock = label; break;
                    case 3: lblExpiringItems = label; break;
                    case 4: lblTodaySales = label; break;
                    case 5: lblTodayRevenue = label; break;
                    case 6: lblTodayProfit = label; break;
                    case 7: lblMonthProfit = label; break;
                    case 8: lblInventoryValue = label; break;
                }

                CreateSummaryCard(card.Title, card.Value, card.Color, x, y, cardWidth, cardHeight, label, card.IsClickable, i);
            }
        }

        private void CreateSummaryCard(string title, string value, Color bgColor, int x, int y, int width, int height,
            Label valueLabel, bool isClickable, int cardIndex)
        {
            var card = new Panel
            {
                Size = new Size(width, height),
                Location = new Point(x, y),
                BackColor = bgColor,
                BorderStyle = BorderStyle.None,
                Cursor = isClickable ? Cursors.Hand : Cursors.Default,
                Tag = cardIndex
            };

            card.Paint += (s, e) =>
            {
                var graphics = e.Graphics;
                graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

                var shadowRect = new Rectangle(3, 3, card.Width - 3, card.Height - 3);
                using (var shadowBrush = new SolidBrush(Color.FromArgb(30, 0, 0, 0)))
                {
                    graphics.FillRoundedRectangle(shadowBrush, shadowRect, 10);
                }

                var mainRect = new Rectangle(0, 0, card.Width - 3, card.Height - 3);
                using (var brush = new SolidBrush(bgColor))
                {
                    graphics.FillRoundedRectangle(brush, mainRect, 10);
                }
            };

            var originalColor = bgColor;
            card.MouseEnter += (s, e) =>
            {
                card.BackColor = ChangeColorBrightness(originalColor, -0.15f);
                card.Invalidate();
            };
            card.MouseLeave += (s, e) =>
            {
                card.BackColor = originalColor;
                card.Invalidate();
            };

            var titleLabel = new Label
            {
                Text = title,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 10F, FontStyle.Regular),
                Location = new Point(20, 15),
                AutoSize = true,
                BackColor = Color.Transparent
            };

            valueLabel.Text = value;
            valueLabel.ForeColor = Color.White;
            valueLabel.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
            valueLabel.Location = new Point(20, 40);
            valueLabel.AutoSize = true;
            valueLabel.BackColor = Color.Transparent;

            card.Controls.Add(titleLabel);
            card.Controls.Add(valueLabel);
            summaryPanel.Controls.Add(card);
        }

        private Panel CreateDataGridPanelsSection()
        {
            var dataContainer = new Panel
            {
                Height = 400,
                Dock = DockStyle.Top,
                BackColor = Color.Transparent,
                Padding = new Padding(25, 0, 25, 20),
                Margin = new Padding(0, 0, 0, 20)
            };

            RefreshDataPanelLayout(dataContainer);
            return dataContainer;
        }

        private void RefreshDataPanelLayout(Panel dataContainer)
        {
            dataContainer.Controls.Clear();

            var availableWidth = dataContainer.Width - 50;
            var spacing = 15;
            var panelHeight = 350;

            // Always use the 2+1 layout as requested
            var firstRowPanelWidth = (availableWidth - spacing) / 2;
            var secondRowPanelWidth = (int)(availableWidth * 0.6); // 60% width for centered panel
            var secondRowX = (availableWidth - secondRowPanelWidth) / 2;

            dataContainer.Height = (panelHeight * 2) + spacing + 40;

            // First row - Low Stock and Expiring Items
            lowStockPanel = CreateDataPanel("⚠️ Low Stock Items", 0, 10, firstRowPanelWidth, panelHeight, Color.FromArgb(231, 76, 60));
            dgvLowStock = CreateDataGrid(lowStockPanel);
            SetupLowStockGrid();
            dataContainer.Controls.Add(lowStockPanel);

            expiringPanel = CreateDataPanel("⏰ Items Expiring Soon", firstRowPanelWidth + spacing, 10, firstRowPanelWidth, panelHeight, Color.FromArgb(243, 156, 18));
            dgvExpiringItems = CreateDataGrid(expiringPanel);
            SetupExpiringItemsGrid();
            dataContainer.Controls.Add(expiringPanel);

            // Second row - Pending Purchases (centered)
            var secondRowY = panelHeight + spacing + 20;
            purchasesPanel = CreateDataPanel("💰 Pending Purchases", secondRowX, secondRowY, secondRowPanelWidth, panelHeight, Color.FromArgb(155, 89, 182));
            dgvPendingPurchases = CreateDataGrid(purchasesPanel);
            SetupPendingPurchasesGrid();
            dataContainer.Controls.Add(purchasesPanel);
        }

        private Panel CreateDataPanel(string title, int x, int y, int width, int height, Color headerColor)
        {
            var panel = new Panel
            {
                Location = new Point(x, y),
                Size = new Size(width, height),
                BackColor = Color.White,
                BorderStyle = BorderStyle.None
            };

            panel.Paint += (s, e) =>
            {
                var graphics = e.Graphics;
                graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

                var shadowRect = new Rectangle(3, 3, panel.Width - 3, panel.Height - 3);
                using (var shadowBrush = new SolidBrush(Color.FromArgb(20, 0, 0, 0)))
                {
                    graphics.FillRoundedRectangle(shadowBrush, shadowRect, 8);
                }

                var mainRect = new Rectangle(0, 0, panel.Width - 3, panel.Height - 3);
                using (var brush = new SolidBrush(Color.White))
                {
                    graphics.FillRoundedRectangle(brush, mainRect, 8);
                }

                using (var pen = new Pen(Color.FromArgb(230, 235, 240)))
                {
                    graphics.DrawRoundedRectangle(pen, mainRect, 8);
                }
            };

            var headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 45,
                BackColor = headerColor
            };

            var titleLabel = new Label
            {
                Text = title,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 12F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Dock = DockStyle.Fill,
                Padding = new Padding(20, 0, 0, 0)
            };

            headerPanel.Controls.Add(titleLabel);
            panel.Controls.Add(headerPanel);

            return panel;
        }

        private DataGridView CreateDataGrid(Panel parent)
        {
            var dgv = new DataGridView
            {
                Dock = DockStyle.Fill,
                BackgroundColor = Color.White,
                BorderStyle = BorderStyle.None,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                ReadOnly = true,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                RowHeadersVisible = false,
                ColumnHeadersVisible = true, // Fixed: Ensure headers are visible
                Font = new Font("Segoe UI", 9F),
                GridColor = Color.FromArgb(240, 244, 247),
                ColumnHeadersHeight = 40,
                RowTemplate = { Height = 32 },
                EnableHeadersVisualStyles = false, // Fixed: Disable visual styles to show custom header colors
                DefaultCellStyle = new DataGridViewCellStyle
                {
                    BackColor = Color.White,
                    ForeColor = Color.FromArgb(64, 64, 64),
                    SelectionBackColor = Color.FromArgb(230, 244, 255),
                    SelectionForeColor = Color.FromArgb(44, 62, 80),
                    Padding = new Padding(12, 6, 12, 6),
                    Alignment = DataGridViewContentAlignment.MiddleLeft
                },
                ColumnHeadersDefaultCellStyle = new DataGridViewCellStyle
                {
                    BackColor = Color.FromArgb(248, 250, 252),
                    ForeColor = Color.FromArgb(73, 80, 87),
                    Font = new Font("Segoe UI", 10F, FontStyle.Bold),
                    Alignment = DataGridViewContentAlignment.MiddleLeft,
                    Padding = new Padding(12, 6, 12, 6)
                },
                AlternatingRowsDefaultCellStyle = new DataGridViewCellStyle
                {
                    BackColor = Color.FromArgb(250, 252, 255)
                }
            };

            var containerPanel = new Panel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(2, 0, 2, 2),
                BackColor = Color.White
            };

            containerPanel.Controls.Add(dgv);
            parent.Controls.Add(containerPanel);

            return dgv;
        }

        private void SetupLowStockGrid()
        {
            dgvLowStock.Columns.Add("Name", "Product Name");
            dgvLowStock.Columns.Add("Company", "Company");
            dgvLowStock.Columns.Add("Stock", "Stock");
            dgvLowStock.Columns.Add("Status", "Status");

            dgvLowStock.Columns["Stock"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;
            dgvLowStock.Columns["Status"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;
            dgvLowStock.Columns["Stock"].Width = 80;
            dgvLowStock.Columns["Status"].Width = 100;

            dgvLowStock.CellFormatting += (s, e) =>
            {
                if (e.ColumnIndex == dgvLowStock.Columns["Status"].Index && e.Value != null)
                {
                    string status = e.Value.ToString();
                    switch (status)
                    {
                        case "OUT_OF_STOCK":
                            e.CellStyle.BackColor = Color.FromArgb(254, 226, 226);
                            e.CellStyle.ForeColor = Color.FromArgb(185, 28, 28);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                            break;
                        case "CRITICAL":
                            e.CellStyle.BackColor = Color.FromArgb(255, 237, 213);
                            e.CellStyle.ForeColor = Color.FromArgb(194, 65, 12);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                            break;
                        case "LOW":
                            e.CellStyle.BackColor = Color.FromArgb(254, 249, 195);
                            e.CellStyle.ForeColor = Color.FromArgb(161, 98, 7);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                            break;
                    }
                }

                if (e.ColumnIndex == dgvLowStock.Columns["Stock"].Index && e.Value != null)
                {
                    if (int.TryParse(e.Value.ToString(), out int stock))
                    {
                        if (stock == 0)
                            e.CellStyle.ForeColor = Color.FromArgb(185, 28, 28);
                        else if (stock <= 5)
                            e.CellStyle.ForeColor = Color.FromArgb(194, 65, 12);
                    }
                }
            };
        }

        private void SetupExpiringItemsGrid()
        {
            dgvExpiringItems.Columns.Add("Name", "Product Name");
            dgvExpiringItems.Columns.Add("Company", "Company");
            dgvExpiringItems.Columns.Add("Quantity", "Qty");
            dgvExpiringItems.Columns.Add("ExpiryDate", "Expiry Date");
            dgvExpiringItems.Columns.Add("DaysLeft", "Days Left");

            dgvExpiringItems.Columns["Quantity"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;
            dgvExpiringItems.Columns["DaysLeft"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;
            dgvExpiringItems.Columns["ExpiryDate"].DefaultCellStyle.Format = "dd/MM/yyyy";
            dgvExpiringItems.Columns["Quantity"].Width = 60;
            dgvExpiringItems.Columns["ExpiryDate"].Width = 90;
            dgvExpiringItems.Columns["DaysLeft"].Width = 80;

            dgvExpiringItems.CellFormatting += (s, e) =>
            {
                if (e.ColumnIndex == dgvExpiringItems.Columns["DaysLeft"].Index && e.Value != null)
                {
                    if (int.TryParse(e.Value.ToString(), out int days))
                    {
                        if (days <= 3)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(254, 226, 226);
                            e.CellStyle.ForeColor = Color.FromArgb(185, 28, 28);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                        }
                        else if (days <= 7)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(255, 237, 213);
                            e.CellStyle.ForeColor = Color.FromArgb(194, 65, 12);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                        }
                        else if (days <= 15)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(254, 249, 195);
                            e.CellStyle.ForeColor = Color.FromArgb(161, 98, 7);
                        }
                        else if (days <= 30)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(240, 253, 244);
                            e.CellStyle.ForeColor = Color.FromArgb(22, 101, 52);
                        }
                    }
                }
            };
        }

        private void SetupPendingPurchasesGrid()
        {
            dgvPendingPurchases.Columns.Add("BatchName", "Batch Name");
            dgvPendingPurchases.Columns.Add("Company", "Company");
            dgvPendingPurchases.Columns.Add("TotalPrice", "Total");
            dgvPendingPurchases.Columns.Add("Paid", "Paid");
            dgvPendingPurchases.Columns.Add("Remaining", "Remaining");

            dgvPendingPurchases.Columns["TotalPrice"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight;
            dgvPendingPurchases.Columns["Paid"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight;
            dgvPendingPurchases.Columns["Remaining"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight;

            dgvPendingPurchases.Columns["TotalPrice"].DefaultCellStyle.Format = "Rs #,##0";
            dgvPendingPurchases.Columns["Paid"].DefaultCellStyle.Format = "Rs #,##0";
            dgvPendingPurchases.Columns["Remaining"].DefaultCellStyle.Format = "Rs #,##0";

            dgvPendingPurchases.Columns["TotalPrice"].Width = 90;
            dgvPendingPurchases.Columns["Paid"].Width = 90;
            dgvPendingPurchases.Columns["Remaining"].Width = 90;

            dgvPendingPurchases.CellFormatting += (s, e) =>
            {
                if (e.ColumnIndex == dgvPendingPurchases.Columns["Remaining"].Index && e.Value != null)
                {
                    if (decimal.TryParse(e.Value.ToString(), out decimal remaining))
                    {
                        if (remaining > 500000)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(254, 226, 226);
                            e.CellStyle.ForeColor = Color.FromArgb(185, 28, 28);
                            e.CellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                        }
                        else if (remaining > 200000)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(255, 237, 213);
                            e.CellStyle.ForeColor = Color.FromArgb(194, 65, 12);
                        }
                        else if (remaining > 50000)
                        {
                            e.CellStyle.BackColor = Color.FromArgb(254, 249, 195);
                            e.CellStyle.ForeColor = Color.FromArgb(161, 98, 7);
                        }
                    }
                }
            };
        }

        private Panel CreateAdditionalInfoPanelSection()
        {
            var infoPanel = new Panel
            {
                Height = 80,
                Dock = DockStyle.Top,
                BackColor = Color.White,
                Padding = new Padding(25, 20, 25, 20)
            };

            infoPanel.Paint += (s, e) =>
            {
                using (var pen = new Pen(Color.FromArgb(230, 235, 240)))
                {
                    e.Graphics.DrawLine(pen, 0, 0, infoPanel.Width, 0);
                }
            };

            var refreshBtn = new Button
            {
                Text = "🔄 Refresh Dashboard",
                Font = new Font("Segoe UI", 11F, FontStyle.Regular),
                BackColor = Color.FromArgb(59, 130, 246),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(180, 42),
                Location = new Point(0, 19),
                Cursor = Cursors.Hand
            };
            refreshBtn.FlatAppearance.BorderSize = 0;
            refreshBtn.FlatAppearance.MouseOverBackColor = Color.FromArgb(37, 99, 235);
            refreshBtn.Click += (s, e) => RefreshDashboardAsync();

            var exportBtn = new Button
            {
                Text = "📊 Export Data",
                Font = new Font("Segoe UI", 11F, FontStyle.Regular),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(140, 42),
                Location = new Point(195, 19),
                Cursor = Cursors.Hand
            };
            exportBtn.FlatAppearance.BorderSize = 0;
            exportBtn.FlatAppearance.MouseOverBackColor = Color.FromArgb(5, 150, 105);
            exportBtn.Click += (s, e) => ExportDashboardData();

            var lastUpdateLabel = new Label
            {
                Text = $"Last Updated: {DateTime.Now:HH:mm:ss}",
                Font = new Font("Segoe UI", 11F),
                ForeColor = Color.FromArgb(108, 117, 125),
                AutoSize = true,
                Location = new Point(355, 30)
            };

            infoPanel.Controls.Add(refreshBtn);
            infoPanel.Controls.Add(exportBtn);
            infoPanel.Controls.Add(lastUpdateLabel);

            return infoPanel;
        }

        #region Timer and Async Methods

        private void SetupTimers()
        {
            // Main refresh timer
            refreshTimer = new System.Windows.Forms.Timer();
            refreshTimer.Interval = 300000; // 5 minutes
            refreshTimer.Tick += async (s, e) => await RefreshTimerTick();
            refreshTimer.Start();
        }

        private async Task RefreshTimerTick()
        {
            if (!isRefreshing)
            {
                await LoadDashboardDataAsync();
                UpdateTimestamps();
            }
        }

        private async Task LoadDashboardDataAsync()
        {
            if (isRefreshing) return;

            try
            {
                isRefreshing = true;
                this.Cursor = Cursors.WaitCursor;

                var summary = await Task.Run(() => _dashboardService.GetDashboardSummary());
                UpdateSummaryCards(summary);

                var tasks = new[]
                {
                    Task.Run(() => LoadLowStockData()),
                    Task.Run(() => LoadExpiringItemsData()),
                    Task.Run(() => LoadPendingPurchasesData())
                };

                await Task.WhenAll(tasks);
                lastDataRefresh = DateTime.Now;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading dashboard data: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                isRefreshing = false;
                this.Cursor = Cursors.Default;
            }
        }

        private async Task RefreshDashboardAsync()
        {
            await LoadDashboardDataAsync();
            UpdateTimestamps();
        }

        #endregion

        #region Data Loading Methods

        private void UpdateSummaryCards(DashboardSummary summary)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<DashboardSummary>(UpdateSummaryCards), summary);
                return;
            }

            if (lblTotalProducts != null) lblTotalProducts.Text = summary.TotalProducts.ToString("N0");
            if (lblTotalCompanies != null) lblTotalCompanies.Text = summary.TotalCompanies.ToString("N0");
            if (lblLowStock != null) lblLowStock.Text = summary.LowStockItems.ToString("N0");
            if (lblExpiringItems != null) lblExpiringItems.Text = summary.ExpiringItems.ToString("N0");
            if (lblTodaySales != null) lblTodaySales.Text = summary.TodaySales.ToString("N0");
            if (lblTodayRevenue != null) lblTodayRevenue.Text = $"Rs {summary.TodayRevenue:N0}";
            if (lblTodayProfit != null)
            {
                lblTodayProfit.Text = $"Rs {summary.TodayProfit:N0}";
                // Optional: Change color based on profit/loss
                if (summary.TodayProfit < 0)
                    lblTodayProfit.ForeColor = Color.FromArgb(231, 76, 60);
                else
                    lblTodayProfit.ForeColor = Color.White;
            }
            if (lblMonthProfit != null)
            {
                lblMonthProfit.Text = $"Rs {summary.MonthProfit:N0}";
                // Optional: Change color based on profit/loss
                if (summary.MonthProfit < 0)
                    lblMonthProfit.ForeColor = Color.FromArgb(231, 76, 60);
                else
                    lblMonthProfit.ForeColor = Color.White;
            }
            if (lblInventoryValue != null) lblInventoryValue.Text = $"Rs {summary.TotalInventoryValue:N0}";
        }

        private void LoadLowStockData()
        {
            try
            {
                var lowStockItems = _dashboardService.GetLowStockItems();

                if (InvokeRequired)
                {
                    Invoke(new Action(() => UpdateLowStockGrid(lowStockItems)));
                }
                else
                {
                    UpdateLowStockGrid(lowStockItems);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading low stock data: {ex.Message}");
            }
        }

        private void UpdateLowStockGrid(List<StockInfo> items)
        {
            dgvLowStock.Rows.Clear();
            foreach (var item in items.Take(10))
            {
                dgvLowStock.Rows.Add(
                    item.Name.Length > 25 ? item.Name.Substring(0, 25) + "..." : item.Name,
                    item.CompanyName.Length > 18 ? item.CompanyName.Substring(0, 18) + "..." : item.CompanyName,
                    item.CurrentStock,
                    item.StockStatus
                );
            }
        }

        private void LoadExpiringItemsData()
        {
            try
            {
                var expiringItems = _dashboardService.GetExpiringItems();

                if (InvokeRequired)
                {
                    Invoke(new Action(() => UpdateExpiringItemsGrid(expiringItems)));
                }
                else
                {
                    UpdateExpiringItemsGrid(expiringItems);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading expiring items data: {ex.Message}");
            }
        }

        private void HomeContentform_Load(object sender, EventArgs e)
        {

        }

        private void panel4_Paint(object sender, PaintEventArgs e)
        {

        }

        private void UpdateExpiringItemsGrid(List<ExpiringItem> items)
        {
            dgvExpiringItems.Rows.Clear();
            foreach (var item in items.Take(10))
            {
                dgvExpiringItems.Rows.Add(
                    item.Name.Length > 25 ? item.Name.Substring(0, 25) + "..." : item.Name,
                    item.CompanyName.Length > 15 ? item.CompanyName.Substring(0, 15) + "..." : item.CompanyName,
                    item.QuantityRemaining,
                    item.ExpiryDate,
                    item.DaysToExpiry
                );
            }
        }

        private void LoadPendingPurchasesData()
        {
            try
            {
                var pendingPurchases = _dashboardService.GetPendingPurchases();

                if (InvokeRequired)
                {
                    Invoke(new Action(() => UpdatePendingPurchasesGrid(pendingPurchases)));
                }
                else
                {
                    UpdatePendingPurchasesGrid(pendingPurchases);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading pending purchases data: {ex.Message}");
            }
        }

        private void UpdatePendingPurchasesGrid(List<PurchaseSummary> purchases)
        {
            dgvPendingPurchases.Rows.Clear();
            foreach (var purchase in purchases.Take(10))
            {
                dgvPendingPurchases.Rows.Add(
                    purchase.BatchName.Length > 20 ? purchase.BatchName.Substring(0, 20) + "..." : purchase.BatchName,
                    purchase.CompanyName.Length > 15 ? purchase.CompanyName.Substring(0, 15) + "..." : purchase.CompanyName,
                    purchase.TotalPrice,
                    purchase.Paid,
                    purchase.RemainingAmount
                );
            }
        }

        #endregion

        #region Helper Methods

        private Color ChangeColorBrightness(Color color, float correctionFactor)
        {
            float red = color.R;
            float green = color.G;
            float blue = color.B;

            if (correctionFactor < 0)
            {
                correctionFactor = 1 + correctionFactor;
                red *= correctionFactor;
                green *= correctionFactor;
                blue *= correctionFactor;
            }
            else
            {
                red = (255 - red) * correctionFactor + red;
                green = (255 - green) * correctionFactor + green;
                blue = (255 - blue) * correctionFactor + blue;
            }

            return Color.FromArgb(color.A, (int)red, (int)green, (int)blue);
        }

        private void UpdateTimestamps()
        {
            if (InvokeRequired)
            {
                Invoke(new Action(UpdateTimestamps));
                return;
            }

            var infoPanel = panel4.Controls.OfType<Panel>().LastOrDefault();
            var lastUpdateLabel = infoPanel?.Controls.OfType<Label>().FirstOrDefault(l => l.Text.StartsWith("Last Updated"));
            if (lastUpdateLabel != null)
                lastUpdateLabel.Text = $"Last Updated: {DateTime.Now:HH:mm:ss}";
        }

        #endregion

        #region Event Handlers

        private void HomeContentform_Resize(object sender, EventArgs e)
        {
            RefreshSummaryCardLayout();
            RefreshAllDataPanels();
        }

        private void Panel4_Resize(object sender, EventArgs e)
        {
            RefreshSummaryCardLayout();
            RefreshAllDataPanels();
        }

        private void RefreshAllDataPanels()
        {
            foreach (Control control in panel4.Controls)
            {
                if (control is Panel panel && panel.Controls.Count > 0)
                {
                    var firstChild = panel.Controls[0];
                    if (firstChild is Panel && (firstChild.Controls.Count == 0 || firstChild.Controls[0] is Panel))
                    {
                        RefreshDataPanelLayout(panel);
                        break;
                    }
                }
            }
        }

        #endregion

        #region Export Functionality
        private void ExportDashboardData()
        {
            try
            {
                var summary = _dashboardService.GetDashboardSummary();
                var monthlyStats = _dashboardService.GetMonthlyStats(1);
                var sb = new StringBuilder();

                sb.AppendLine("ALI VETERINARY CLINIC - DASHBOARD REPORT");
                sb.AppendLine($"Generated on: {DateTime.Now:dd/MM/yyyy HH:mm:ss}");
                sb.AppendLine(new string('=', 70));
                sb.AppendLine();

                sb.AppendLine("TODAY'S PERFORMANCE:");
                sb.AppendLine(new string('-', 70));
                sb.AppendLine($"• Sales Count: {summary.TodaySales:N0}");
                sb.AppendLine($"• Revenue: Rs {summary.TodayRevenue:N2}");
                sb.AppendLine($"• Cost of Goods Sold: Rs {summary.TodayCost:N2}");
                sb.AppendLine($"• Profit: Rs {summary.TodayProfit:N2}");
                if (summary.TodayRevenue > 0)
                {
                    decimal margin = (summary.TodayProfit / summary.TodayRevenue) * 100;
                    sb.AppendLine($"• Profit Margin: {margin:N2}%");
                }
                sb.AppendLine();

                sb.AppendLine($"CURRENT MONTH PERFORMANCE ({DateTime.Now:MMMM yyyy}):");
                sb.AppendLine(new string('-', 70));
                sb.AppendLine($"• Total Revenue: Rs {summary.MonthRevenue:N2}");
                sb.AppendLine($"• Total Cost: Rs {summary.MonthCost:N2}");
                sb.AppendLine($"• Total Profit: Rs {summary.MonthProfit:N2}");
                if (summary.MonthRevenue > 0)
                {
                    decimal margin = (summary.MonthProfit / summary.MonthRevenue) * 100;
                    sb.AppendLine($"• Profit Margin: {margin:N2}%");
                }
                sb.AppendLine();

                sb.AppendLine("INVENTORY SUMMARY:");
                sb.AppendLine(new string('-', 70));
                sb.AppendLine($"• Total Products: {summary.TotalProducts:N0}");
                sb.AppendLine($"• Total Companies: {summary.TotalCompanies:N0}");
                sb.AppendLine($"• Low Stock Items: {summary.LowStockItems:N0}");
                sb.AppendLine($"• Out of Stock Items: {summary.OutOfStockItems:N0}");
                sb.AppendLine($"• Items Expiring Soon: {summary.ExpiringItems:N0}");
                sb.AppendLine();

                sb.AppendLine("FINANCIAL OVERVIEW:");
                sb.AppendLine(new string('-', 70));
                sb.AppendLine($"• Pending Payments: Rs {summary.PendingPayments:N2}");
                sb.AppendLine($"• Total Inventory Value: Rs {summary.TotalInventoryValue:N2}");
                sb.AppendLine();

                // Previous months statistics
                if (monthlyStats.Count > 0)
                {
                    sb.AppendLine("MONTHLY STATISTICS (Last 6 Months):");
                    sb.AppendLine(new string('-', 70));
                    foreach (var stat in monthlyStats)
                    {
                        sb.AppendLine($"• {stat.Month}:");
                        sb.AppendLine($"  - Total Sales: Rs {stat.TotalSales:N2}");
                        sb.AppendLine($"  - Total Cost: Rs {stat.TotalPurchases:N2}");
                        sb.AppendLine($"  - Profit: Rs {stat.Profit:N2}");
                        sb.AppendLine($"  - Products Sold: {stat.ProductsSold:N0}");
                        if (stat.TotalSales > 0)
                        {
                            decimal margin = (stat.Profit / stat.TotalSales) * 100;
                            sb.AppendLine($"  - Profit Margin: {margin:N2}%");
                        }
                        sb.AppendLine();
                    }
                }

                var lowStockItems = _dashboardService.GetLowStockItems();
                if (lowStockItems.Any())
                {
                    sb.AppendLine("LOW STOCK ITEMS:");
                    sb.AppendLine(new string('-', 70));
                    foreach (var item in lowStockItems.Take(20))
                    {
                        sb.AppendLine($"• {item.Name} ({item.CompanyName}) - Stock: {item.CurrentStock} - Status: {item.StockStatus}");
                    }
                    sb.AppendLine();
                }

                var expiringItems = _dashboardService.GetExpiringItems();
                if (expiringItems.Any())
                {
                    sb.AppendLine("ITEMS EXPIRING SOON:");
                    sb.AppendLine(new string('-', 70));
                    foreach (var item in expiringItems.Take(20))
                    {
                        sb.AppendLine($"• {item.Name} ({item.CompanyName}) - Expires: {item.ExpiryDate:dd/MM/yyyy} ({item.DaysToExpiry} days)");
                    }
                    sb.AppendLine();
                }

                var pendingPurchases = _dashboardService.GetPendingPurchases();
                if (pendingPurchases.Any())
                {
                    sb.AppendLine("PENDING PURCHASES:");
                    sb.AppendLine(new string('-', 70));
                    foreach (var purchase in pendingPurchases.Take(20))
                    {
                        sb.AppendLine($"• {purchase.BatchName} ({purchase.CompanyName}) - Remaining: Rs {purchase.RemainingAmount:N2}");
                    }
                }

                using (var sfd = new SaveFileDialog())
                {
                    sfd.Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*";
                    sfd.FileName = $"Veterinary_Dashboard_{DateTime.Now:yyyyMMdd_HHmmss}.txt";
                    sfd.Title = "Export Dashboard Report";

                    if (sfd.ShowDialog() == DialogResult.OK)
                    {
                        System.IO.File.WriteAllText(sfd.FileName, sb.ToString());
                        MessageBox.Show($"Report exported successfully to: {System.IO.Path.GetFileName(sfd.FileName)}",
                            "Export Successful", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error exporting data: {ex.Message}", "Export Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        #endregion

        #region Cleanup

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            refreshTimer?.Stop();
            refreshTimer?.Dispose();
            base.OnFormClosed(e);
        }

        #endregion
    }
}

// Extension methods for rounded rectangles
public static class GraphicsExtensions
{
    public static void FillRoundedRectangle(this Graphics graphics, Brush brush, Rectangle rect, int cornerRadius)
    {
        using (var path = GetRoundedRectanglePath(rect, cornerRadius))
        {
            graphics.FillPath(brush, path);
        }
    }

    public static void DrawRoundedRectangle(this Graphics graphics, Pen pen, Rectangle rect, int cornerRadius)
    {
        using (var path = GetRoundedRectanglePath(rect, cornerRadius))
        {
            graphics.DrawPath(pen, path);
        }
    }

    private static System.Drawing.Drawing2D.GraphicsPath GetRoundedRectanglePath(Rectangle rect, int cornerRadius)
    {
        var path = new System.Drawing.Drawing2D.GraphicsPath();

        if (cornerRadius <= 0)
        {
            path.AddRectangle(rect);
            return path;
        }

        int diameter = cornerRadius * 2;
        var arcRect = new Rectangle(rect.Location, new Size(diameter, diameter));

        path.AddArc(arcRect, 180, 90);
        arcRect.X = rect.Right - diameter;
        path.AddArc(arcRect, 270, 90);
        arcRect.Y = rect.Bottom - diameter;
        path.AddArc(arcRect, 0, 90);
        arcRect.X = rect.Left;
        path.AddArc(arcRect, 90, 90);

        path.CloseFigure();
        return path;
    }
}