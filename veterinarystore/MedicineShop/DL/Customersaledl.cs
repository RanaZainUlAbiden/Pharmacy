using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using System.Windows.Forms;
using QuestPDF.Helpers;
using System.Xml.Linq;
using System.Drawing.Printing;
using System.Drawing;
using System.Diagnostics;
using System.Threading;

namespace MedicineShop.DL
{
    internal class Customersaledl
    {
        // Updated GetProductThings - Shows aggregated product info (no batch_item_id)
        public DataTable GetProductThings(string text)
        {
            DataTable dt = new DataTable();
            using (var con = DatabaseHelper.Instance.GetConnection())
            {
                con.Open();
                string query = @"SELECT 
                                m.product_id,
                                m.name, 
                                m.description,
                                c.company_name, 
                                (SELECT bi.purchase_price 
                                 FROM batch_items bi 
                                 WHERE bi.product_id = m.product_id 
                                   AND bi.quantity_remaining > 0 
                                   AND bi.expiry_date > CURDATE()
                                 ORDER BY bi.expiry_date ASC 
                                 LIMIT 1) as purchase_price,
                                m.sale_price,
                                SUM(b.quantity_remaining) as quantity_remaining,
                                p.packing_name, 
                                ca.category_name, 
                                MIN(b.expiry_date) as expiry_date
                            FROM batch_items b
                            JOIN medicines m ON m.product_id = b.product_id
                            JOIN company c ON c.company_id = m.company_id
                            JOIN packing p ON m.packing_id = p.packing_id
                            JOIN categories ca ON ca.category_id = m.category_id
                            WHERE m.name LIKE @text 
                                AND b.quantity_remaining > 0 
                                AND b.expiry_date > CURDATE()
                            GROUP BY m.product_id, m.name, m.description, c.company_name, 
                                     m.sale_price, p.packing_name, ca.category_name
                            HAVING SUM(b.quantity_remaining) > 0
                            ORDER BY m.name, expiry_date;";

                using (MySqlCommand cmd = new MySqlCommand(query, con))
                {
                    cmd.Parameters.AddWithValue("@text", "%" + text + "%");

                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        adapter.Fill(dt);
                    }
                }
            }
            return dt;
        }

        public int getcustomerid(string text)
        {
            try
            {
                using (var con = DatabaseHelper.Instance.GetConnection())
                {
                    con.Open();
                    string query = "select customer_id from customers where full_name = @text";
                    using (MySqlCommand cmd = new MySqlCommand(query, con))
                    {
                        cmd.Parameters.AddWithValue("@text", text);
                        object result = cmd.ExecuteScalar();
                        return result != null ? Convert.ToInt32(result) : -1;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Failed to recieve customer_id " + ex);
            }
        }

        public DataTable getallcustomer(string text)
        {
            DataTable dt = new DataTable();
            using (var con = DatabaseHelper.Instance.GetConnection())
            {
                con.Open();
                string query = "SELECT  full_name, address, phone FROM customers WHERE full_name LIKE @text";

                using (MySqlCommand cmd = new MySqlCommand(query, con))
                {
                    cmd.Parameters.AddWithValue("@text", "%" + text + "%");
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        adapter.Fill(dt);
                    }
                }
            }
            return dt;
        }

        // Updated SaveDataToDatabase - Uses product_id and implements FIFO deduction
        public bool SaveDataToDatabase(int? id, DateTime? date, decimal? total_amount, decimal? paid_amount, DataGridView d)
        {
            using (var con = DatabaseHelper.Instance.GetConnection())
            {
                con.Open();
                using (var tran = con.BeginTransaction())
                {
                    try
                    {
                        // Validate input data first
                        if (d.Rows.Count == 0 || (d.Rows.Count == 1 && d.Rows[0].IsNewRow))
                        {
                            throw new Exception("No products selected for sale");
                        }

                        string query = @"INSERT INTO sales (customer_id, total_amount, paid_amount, sale_date) 
                VALUES (@id, @total_amount, @paid_amount, @date);
                SELECT LAST_INSERT_ID();";      
                        int billid;
                        using (MySqlCommand cmd = new MySqlCommand(query, con, tran))
                        {
                            cmd.Parameters.AddWithValue("@id", id ?? (object)DBNull.Value);
                            cmd.Parameters.AddWithValue("@total_amount", total_amount ?? (object)DBNull.Value);
                            cmd.Parameters.AddWithValue("@paid_amount", paid_amount ?? (object)DBNull.Value);
                            cmd.Parameters.AddWithValue("@date", date ?? (object)DBNull.Value);

                            object result = cmd.ExecuteScalar();
                            if (result == null)
                            {
                                throw new Exception("Failed to get sale ID");
                            }
                            billid = Convert.ToInt32(result);
                        }

                        // Insert into customer price record
                        string query2 = "INSERT INTO customerpricerecord (customer_id, sale_id, date, payment) VALUES (@c_id, @s_id, @date, @payment)";
                        using (MySqlCommand cmd2 = new MySqlCommand(query2, con, tran))
                        {
                            cmd2.Parameters.AddWithValue("@c_id", id ?? (object)DBNull.Value);
                            cmd2.Parameters.AddWithValue("@s_id", billid);
                            cmd2.Parameters.AddWithValue("@date", date ?? (object)DBNull.Value);
                            cmd2.Parameters.AddWithValue("@payment", paid_amount ?? (object)DBNull.Value);
                            cmd2.ExecuteNonQuery();
                        }

                        foreach (DataGridViewRow row in d.Rows)
                        {
                            if (row.IsNewRow) continue;

                            int productid;
                            string name = row.Cells["name"]?.Value?.ToString()?.Trim();

                            if (string.IsNullOrEmpty(name))
                            {
                                throw new Exception("Product name is missing");
                            }

                            // Get product ID and sale price
                            string productidquery = "SELECT product_id, sale_price FROM medicines WHERE name = @name";
                            using (MySqlCommand command2 = new MySqlCommand(productidquery, con, tran))
                            {
                                command2.Parameters.AddWithValue("@name", name);
                                using (var reader = command2.ExecuteReader())
                                {
                                    if (reader.Read())
                                    {
                                        productid = reader.GetInt32("product_id");
                                        decimal salePrice = reader.GetDecimal("sale_price");
                                        reader.Close();

                                        // Parse and validate quantity
                                        if (!decimal.TryParse(row.Cells["quantity"]?.Value?.ToString(), out decimal remainingQty) || remainingQty <= 0)
                                        {
                                            throw new Exception($"Invalid quantity for product: {name}");
                                        }

                                        // Parse discount
                                        decimal discount = 0;
                                        if (row.Cells["discount"]?.Value != null)
                                        {
                                            if (!decimal.TryParse(row.Cells["discount"].Value.ToString(), out discount) || discount < 0)
                                            {
                                                throw new Exception($"Invalid discount for product: {name}");
                                            }
                                        }

                                        // Get available batches ordered by expiry date (FIFO - nearest first)
                                        string getBatchesQuery = @"SELECT batch_item_id, quantity_remaining 
                                                  FROM batch_items 
                                                  WHERE product_id = @product_id 
                                                  AND quantity_remaining > 0 
                                                  AND expiry_date > CURDATE()
                                                  ORDER BY expiry_date ASC, batch_item_id ASC";

                                        List<(int batchItemId, decimal availableQty)> batches = new List<(int, decimal)>();
                                        using (MySqlCommand batchesCmd = new MySqlCommand(getBatchesQuery, con, tran))
                                        {
                                            batchesCmd.Parameters.AddWithValue("@product_id", productid);
                                            using (var batchesReader = batchesCmd.ExecuteReader())
                                            {
                                                while (batchesReader.Read())
                                                {
                                                    int batchItemId = batchesReader.GetInt32("batch_item_id");
                                                    decimal availableQty = batchesReader.GetDecimal("quantity_remaining");
                                                    batches.Add((batchItemId, availableQty));
                                                }
                                            }
                                        }

                                        // Check if total available quantity is sufficient
                                        decimal totalAvailable = batches.Sum(b => b.availableQty);
                                        if (totalAvailable < remainingQty)
                                        {
                                            throw new Exception($"Insufficient stock for product: {name}. Available: {totalAvailable}, Requested: {remainingQty}");
                                        }

                                        int batchitemidd = batches[0].batchItemId;
                                        // Insert single sale_items record with product_id
                                        string detailquery = @"INSERT INTO sale_items (sale_id, product_id, batch_item_id, quantity, price, Discount) 
                              VALUES (@bill_iid, @product_id, @batch_item_id, @quantity, @price, @discount)";

                                        using (MySqlCommand command = new MySqlCommand(detailquery, con, tran))
                                        {
                                            command.Parameters.AddWithValue("@bill_iid", billid);
                                            command.Parameters.AddWithValue("@product_id", productid);
                                            command.Parameters.AddWithValue("@batch_item_id", batchitemidd);
                                            command.Parameters.AddWithValue("@price", salePrice);
                                            command.Parameters.AddWithValue("@quantity", remainingQty);
                                            command.Parameters.AddWithValue("@discount", discount);
                                            command.ExecuteNonQuery();
                                        }

                                        // Distribute quantity deduction across batches (FIFO - nearest expiry first)
                                        decimal qtyToDeduct = remainingQty;
                                        foreach (var batch in batches)
                                        {
                                            if (qtyToDeduct <= 0) break;

                                            decimal quantityToDeduct = Math.Min(qtyToDeduct, batch.availableQty);

                                            // Update batch stock
                                            string queryupdatequantity = @"UPDATE batch_items 
                                              SET quantity_remaining = quantity_remaining - @quantitysold 
                                              WHERE batch_item_id = @batch_item_id";

                                            using (MySqlCommand comma = new MySqlCommand(queryupdatequantity, con, tran))
                                            {
                                                comma.Parameters.AddWithValue("@batch_item_id", batch.batchItemId);
                                                comma.Parameters.AddWithValue("@quantitysold", quantityToDeduct);

                                                int rowsAffected = comma.ExecuteNonQuery();
                                                if (rowsAffected == 0)
                                                {
                                                    throw new Exception($"Failed to update stock for product: {name} in batch {batch.batchItemId}");
                                                }
                                            }

                                            qtyToDeduct -= quantityToDeduct;
                                        }

                                        // Verify all quantity was deducted
                                        if (qtyToDeduct > 0)
                                        {
                                            throw new Exception($"Failed to deduct all quantity for product: {name}. Remaining: {qtyToDeduct}");
                                        }
                                    }
                                    else
                                    {
                                        throw new Exception($"Product not found: {name}");
                                    }
                                }
                            }
                        }

                        tran.Commit();
                        return true;
                    }
                    catch (Exception e)
                    {
                        try
                        {
                            tran.Rollback();
                        }
                        catch (Exception rollbackEx)
                        {
                            System.Diagnostics.Debug.WriteLine("Rollback failed: " + rollbackEx.Message);
                        }

                        System.Diagnostics.Debug.WriteLine("Sale save error: " + e.ToString());
                        throw new Exception("Failed to save sale: " + e.Message, e);
                    }
                }
            }
        }

        // PDF Generation methods remain the same...
        public static void CreateA4ReceiptPdf(DataGridView cart, string filePath, string customerName, decimal total, decimal paid, decimal totaldiscount)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(11));

                    page.Content().Column(column =>
                    {
                        column.Item().AlignCenter().Text("Ali Veterinary Store").Bold().FontSize(24);
                        column.Item().AlignCenter().Text("Main Jalsai Bazar, Tehsil Lahor District Swabi").FontSize(12);
                        column.Item().AlignCenter().Text("Phone: 03021222005").FontSize(12);
                        column.Item().PaddingVertical(10).LineHorizontal(1);

                        column.Item().PaddingBottom(10).Row(row =>
                        {
                            row.RelativeItem().Column(infoCol =>
                            {
                                infoCol.Item().Text($"Customer: {customerName}").Bold();
                                infoCol.Item().Text($"Invoice #: INV-{DateTime.Now:yyMMddHHmm}");
                            });
                            row.RelativeItem().AlignRight().Column(dateCol =>
                            {
                                dateCol.Item().Text($"Date: {DateTime.Now:dd-MMM-yyyy}");
                                dateCol.Item().Text($"Time: {DateTime.Now:hh:mm tt}");
                            });
                        });

                        column.Item().PaddingBottom(15).LineHorizontal(0.5f);

                        column.Item().PaddingBottom(5).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.ConstantColumn(60);
                                columns.ConstantColumn(70);
                                columns.ConstantColumn(60);
                                columns.ConstantColumn(80);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Padding(5).Background("#f0f0f0").Text("Medicine").Bold();
                                header.Cell().Padding(5).Background("#f0f0f0").AlignRight().Text("Qty").Bold();
                                header.Cell().Padding(5).Background("#f0f0f0").AlignRight().Text("Price").Bold();
                                header.Cell().Padding(5).Background("#f0f0f0").AlignRight().Text("Discount").Bold();
                                header.Cell().Padding(5).Background("#f0f0f0").AlignRight().Text("Total").Bold();
                            });
                        });

                        decimal totalDiscount = 0;
                        decimal subTotal = 0;
                        int itemCount = 0;

                        foreach (DataGridViewRow row in cart.Rows)
                        {
                            if (row.IsNewRow) continue;

                            string name = row.Cells["name"].Value?.ToString() ?? "";
                            string qty = row.Cells["quantity"].Value?.ToString() ?? "0";
                            decimal price = ConvertToDecimalSafe(row.Cells["sale_price"].Value ?? 0);
                            decimal discount = ConvertToDecimalSafe(row.Cells["discount"].Value ?? 0);
                            decimal itemTotal = ConvertToDecimalSafe(row.Cells["final"].Value ?? 0);

                            totalDiscount += discount * Convert.ToInt32(qty);
                            subTotal += itemTotal;
                            itemCount++;

                            column.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(3);
                                    columns.ConstantColumn(60);
                                    columns.ConstantColumn(70);
                                    columns.ConstantColumn(60);
                                    columns.ConstantColumn(80);
                                });

                                table.Cell().Padding(5).Text(name);
                                table.Cell().Padding(5).AlignRight().Text(qty);
                                table.Cell().Padding(5).AlignRight().Text($"Rs. {price:N2}");
                                table.Cell().Padding(5).AlignRight().Text($"Rs. {discount:N2}");
                                table.Cell().Padding(5).AlignRight().Text($"Rs. {itemTotal:N2}").Bold();
                            });

                            if (itemCount < cart.Rows.Count - 1)
                            {
                                column.Item().PaddingHorizontal(10).LineHorizontal(0.2f);
                            }
                        }

                        column.Item().PaddingTop(20).Table(summaryTable =>
                        {
                            summaryTable.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.ConstantColumn(150);
                            });

                            summaryTable.Cell().Padding(3).AlignRight().Text("Subtotal:");
                            summaryTable.Cell().Padding(3).AlignRight().Text($"Rs. {(subTotal + totalDiscount):N2}");

                            summaryTable.Cell().Padding(3).AlignRight().Text("Total Discount:");
                            summaryTable.Cell().Padding(3).AlignRight().Text($"Rs. {totaldiscount:N2}");

                            summaryTable.Cell().Padding(5).Background("#e8f4fd").AlignRight().Text("TOTAL:").Bold();
                            summaryTable.Cell().Padding(5).Background("#e8f4fd").AlignRight().Text($"Rs. {total:N2}").Bold().FontSize(12);

                            summaryTable.Cell().Padding(3).AlignRight().Text("Amount Paid:");
                            summaryTable.Cell().Padding(3).AlignRight().Text($"Rs. {paid:N2}");

                            summaryTable.Cell().Padding(5).Background("#fff8dc").AlignRight().Text("BALANCE:").Bold();
                            summaryTable.Cell().Padding(5).Background("#fff8dc").AlignRight().Text($"Rs. {(total - paid):N2}").Bold();
                        });

                        column.Item().PaddingVertical(15).LineHorizontal(1);

                        column.Item().AlignCenter().Text("Thank you for your shopping here!").Bold().FontSize(14);
                        column.Item().PaddingVertical(5).AlignCenter().Text("بل کے بغیر واپسی نہیں ہوگی");
                        column.Item().AlignCenter().Text("دوائیں استعمال ہونے کے بعد واپس نہیں ہوں گی");
                        column.Item().AlignCenter().Text("آپ کے اعتماد کا شکریہ");

                        column.Item().PaddingVertical(15).AlignCenter().Text("Terms & Conditions:").SemiBold();
                        column.Item().AlignCenter().Text("• Goods once sold cannot be returned or exchanged");
                        column.Item().AlignCenter().Text("• Medicines cannot be returned after use");
                        column.Item().AlignCenter().Text("• Please check items at the time of purchase");

                        column.Item().PaddingVertical(20).LineHorizontal(0.5f);

                        column.Item().AlignCenter().Text("Developed By: abdulahad18022@gmail.com | 03477048001").FontSize(9);
                        column.Item().AlignCenter().Text($"Printed on: {DateTime.Now:dd-MMM-yyyy hh:mm tt}").FontSize(9);
                    });
                });
            }).GeneratePdf(filePath);
        }

        public static decimal ConvertToDecimalSafe(object value, decimal defaultValue = 0)
        {
            if (value == null) return defaultValue;
            if (decimal.TryParse(value.ToString(), out decimal result))
                return result;
            return defaultValue;
        }

        public static void PrintA4ReceiptDirectly(DataGridView cart, string customerName, decimal total, decimal paid, decimal totaldiscount)
        {
            try
            {
                QuestPDF.Settings.License = LicenseType.Community;
                string tempFilePath = Path.Combine(Path.GetTempPath(), $"Receipt_{DateTime.Now:yyyyMMddHHmmss}.pdf");

                CreateA4ReceiptPdf(cart, tempFilePath, customerName, total, paid, totaldiscount);
                PrintPdfToPrinter(tempFilePath);

                MessageBox.Show("Receipt sent to printer successfully!", "Print Success",
                               MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Printing failed: {ex.Message}", "Print Error",
                               MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        //private static void PrintPdfToPrinter(string filePath)
        //{
        //    using (PrintDialog printDialog = new PrintDialog())
        //    {
        //        printDialog.AllowSomePages = false;
        //        printDialog.AllowSelection = false;

        //        if (printDialog.ShowDialog() == DialogResult.OK)
        //        {
        //            using (Process process = new Process())
        //            {
        //                ProcessStartInfo startInfo = new ProcessStartInfo
        //                {
        //                    Verb = "printto",
        //                    FileName = filePath,
        //                    Arguments = $"\"{printDialog.PrinterSettings.PrinterName}\"",
        //                    WindowStyle = ProcessWindowStyle.Hidden,
        //                    CreateNoWindow = true,
        //                    UseShellExecute = true
        //                };

        //                process.StartInfo = startInfo;
        //                process.Start();
        //                process.WaitForInputIdle();
        //                Thread.Sleep(3000);

        //                if (!process.HasExited)
        //                {
        //                    process.CloseMainWindow();
        //                    process.Close();
        //                }
        //            }
        //        }
        //    }
        //}

        private static void PrintPdfToPrinter(string filePath)
        {
            try
            {
                // First, let the user select a printer
                using (PrintDialog printDialog = new PrintDialog())
                {
                    printDialog.AllowSomePages = false;
                    printDialog.AllowSelection = false;

                    if (printDialog.ShowDialog() == DialogResult.OK)
                    {
                        // Method 1: Try using Adobe Reader if installed
                        string acrobatPath = GetAcrobatReaderPath();
                        if (!string.IsNullOrEmpty(acrobatPath))
                        {
                            PrintWithAcrobat(filePath, printDialog.PrinterSettings.PrinterName, acrobatPath);
                        }
                        else
                        {
                            // Method 2: Fallback to system print dialog
                            ProcessStartInfo psi = new ProcessStartInfo
                            {
                                FileName = filePath,
                                Verb = "Print",
                                CreateNoWindow = true,
                                WindowStyle = ProcessWindowStyle.Hidden
                            };

                            Process.Start(psi);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // If all else fails, open the PDF and let user print manually
                Process.Start(filePath);
                throw new Exception($"Could not print automatically. PDF opened for manual printing. Error: {ex.Message}");
            }
        }

        private static void PrintWithAcrobat(string filePath, string printerName, string acrobatPath)
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = acrobatPath,
                Arguments = $"/t \"{filePath}\" \"{printerName}\"",
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden
            };

            using (Process process = Process.Start(startInfo))
            {
                process.WaitForExit(10000); // Wait up to 10 seconds
            }
        }

        private static string GetAcrobatReaderPath()
        {
            // Common paths for Adobe Reader/Acrobat
            string[] possiblePaths =
            {
        @"C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe",
        @"C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe",
        @"C:\Program Files (x86)\Adobe\Acrobat Reader\Reader\AcroRd32.exe",
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                    "Adobe", "Acrobat Reader DC", "Reader", "AcroRd32.exe")
    };

            foreach (string path in possiblePaths)
            {
                if (File.Exists(path))
                    return path;
            }

            return null;
        }



        public static void PrintThermalReceipt(DataGridView cart, string customerName, decimal total, decimal paid, decimal totaldiscount)
        {
            PrintDocument printDocument = new PrintDocument();

            // Set up for 80mm thermal printer
            printDocument.DefaultPageSettings.PaperSize = new PaperSize("Receipt", 280, 0);
            printDocument.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);

            Font receiptFont = new Font("Consolas", 8, FontStyle.Regular);
            Font boldFont = new Font("Consolas", 8, FontStyle.Bold);
            Font headerFont = new Font("Consolas", 12, FontStyle.Bold); // Bigger font for header
            int currentY = 5;

            printDocument.PrintPage += (sender, e) =>
            {
                Graphics g = e.Graphics;
                int width = e.PageBounds.Width;

                // Helper functions
                void DrawText(string text, Font font = null, int offsetX = 0)
                {
                    font = font ?? receiptFont;
                    g.DrawString(text, font, Brushes.Black, offsetX, currentY);
                    currentY += (int)g.MeasureString(text, font).Height + 1;
                }

                void DrawCenteredText(string text, Font font = null)
                {
                    font = font ?? receiptFont;
                    SizeF textSize = g.MeasureString(text, font);
                    float x = (width - textSize.Width) / 2;
                    g.DrawString(text, font, Brushes.Black, x, currentY);
                    currentY += (int)textSize.Height + 1;
                }

                void DrawLine()
                {
                    g.DrawLine(Pens.Black, 10, currentY, width - 10, currentY);
                    currentY += 5;
                }

                void DrawLeftRight(string left, string right)
                {
                    g.DrawString(left, receiptFont, Brushes.Black, 10, currentY);
                    SizeF rightSize = g.MeasureString(right, receiptFont);
                    g.DrawString(right, receiptFont, Brushes.Black, width - rightSize.Width - 10, currentY);
                    currentY += (int)rightSize.Height + 1;
                }

                // --- Header with Double Line Big Font ---
                DrawCenteredText("ALI VETERINARY", headerFont);
                DrawCenteredText("CLINIC", headerFont);
                DrawCenteredText("main jalsai bazar, Tehsil Lahor district Swabi");
                DrawCenteredText("Phone: 0300-6634245");
                DrawLine();

                // --- Customer Info ---
                DrawLeftRight($"Customer: {customerName}", $"{DateTime.Now:dd-MMM-yyyy hh:mm tt}");
                DrawLine();

                // --- Table Header ---
                DrawCenteredText("----------------------------------------");
                DrawText("MEDIC         QTY PRICE DISC TOTAL");
                DrawCenteredText("----------------------------------------");

                // --- Cart Items ---
                decimal totalDiscount = 0;
                decimal subTotal = 0;

                foreach (DataGridViewRow row in cart.Rows)
                {
                    if (row.IsNewRow) continue;

                    string name = row.Cells["name"].Value?.ToString() ?? "";
                    string qty = row.Cells["quantity"].Value?.ToString()?.PadLeft(2);
                    string price = row.Cells["sale_price"].Value?.ToString()?.PadLeft(5);
                    string discount = row.Cells["discount"].Value?.ToString()?.PadLeft(3);
                    string totalPrice = row.Cells["final"].Value?.ToString()?.PadLeft(6);

                    if (decimal.TryParse(row.Cells["discount"].Value?.ToString(), out decimal discVal))
                        totalDiscount += discVal * Convert.ToInt32(row.Cells["quantity"].Value);
                    if (decimal.TryParse(row.Cells["final"].Value?.ToString(), out decimal itemTotal))
                        subTotal += itemTotal;

                    // Split name across lines
                    string[] nameParts = name.Split(' ', (char)StringSplitOptions.RemoveEmptyEntries);
                    string firstWord = nameParts.Length > 0 ? nameParts[0] : name;
                    string[] remainingWords = nameParts.Skip(1).ToArray();

                    // First line with first word and all data
                    string firstLine = $"{firstWord,-12}{qty} {price} {discount} {totalPrice}";
                    DrawText(firstLine);

                    // Remaining words as new lines
                    foreach (var word in remainingWords)
                    {
                        DrawText($"    {word}"); // 4 spaces indentation
                    }
                }

                // --- Summary ---
                DrawCenteredText("----------------------------------------");
                DrawLeftRight($"SUBTOTAL:", $"Rs. {(subTotal + totalDiscount):N0}");
                DrawLeftRight($"DISCOUNT:", $"Rs. {totaldiscount:N0}");
                DrawLeftRight($"TOTAL:", $"Rs. {total:N0}");
                DrawLeftRight($"PAID:", $"Rs. {paid:N0}");
                DrawLeftRight($"BALANCE:", $"Rs. {(total - paid):N0}");
                DrawCenteredText("----------------------------------------");

                // --- Footer ---
                currentY += 3;
                DrawCenteredText("Thank you for your shopping here!", boldFont);
                DrawLine();
                DrawCenteredText("** SPECIAL OFFERS **", boldFont);
                DrawCenteredText("بل کے بغیر واپسی نہیں ہوگی");
                DrawCenteredText("دوائیں استعمال ہونے کے بعد واپس نہیں ہوں گی");
                DrawCenteredText("آپ کے اعتماد کا شکریہ");
                DrawCenteredText($"Invoice #: INV-{DateTime.Now:yyMMddHHmm}");
                currentY += 3;
                DrawCenteredText("Developed By:");
                DrawCenteredText("abdulahad18022@gmail.com");
                DrawCenteredText("03477048001");

            };

            // Show print dialog and print
            PrintDialog printDialog = new PrintDialog();
            printDialog.Document = printDocument;

            if (printDialog.ShowDialog() == DialogResult.OK)
            {
                printDocument.Print();
            }
        }

        //public static void CreateThermalReceiptPdf(DataGridView cart, string filePath, decimal total, decimal paid)
        //{
        //    QuestPDF.Settings.License = LicenseType.Community;

        //    Document.Create(container =>
        //    {
        //        container.Page(page =>
        //        {
        //            page.Size(226, PageSizes.A4.Height, Unit.Point); // 80mm width
        //            page.Margin(5);
        //            page.DefaultTextStyle(x => x.FontFamily("Consolas").FontSize(9));

        //            page.Content().Column(column =>
        //            {
        //                // --- Logo + Header ---
        //                column.Item().AlignCenter().Image(GetLogoImageStream(), ImageScaling.FitWidth);
        //                column.Item().AlignCenter().Text("MNS Computers").Bold().FontSize(12);
        //                column.Item().AlignCenter().Text("office # 39 & 40, 1st floor Gallery 3, Rex city, Sitiana Road");
        //                column.Item().AlignCenter().Text("Phone: 0300-6634245");
        //                column.Item().PaddingBottom(5).LineHorizontal(0.5f);

        //                // --- Invoice Info ---
        //                column.Item().Row(row =>
        //                {
        //                    row.RelativeItem().AlignRight().Text($"{DateTime.Now:dd-MMM-yyyy hh:mm tt}");
        //                });

        //                column.Item().PaddingBottom(5).LineHorizontal(0.5f);

        //                // --- Table Header ---
        //                column.Item().Text("----------------------------------------");
        //                column.Item().Text("ITEM         QTY PRICE DISC TOTAL");
        //                column.Item().Text("----------------------------------------");

        //                // --- Cart Items ---
        //                decimal totalDiscount = 0;
        //                decimal subTotal = 0;

        //                foreach (DataGridViewRow row in cart.Rows)
        //                {
        //                    if (row.IsNewRow) continue;

        //                    string name = row.Cells["name"].Value?.ToString() ?? "";
        //                    string qty = row.Cells["quantity"].Value?.ToString()?.PadLeft(2);
        //                    string price = row.Cells["total"].Value?.ToString()?.PadLeft(5);
        //                    string discount = row.Cells["discount"].Value?.ToString()?.PadLeft(3);
        //                    string totalPrice = row.Cells["final"].Value?.ToString()?.PadLeft(6);

        //                    if (decimal.TryParse(row.Cells["discount"].Value?.ToString(), out decimal discVal))
        //                        totalDiscount += discVal * Convert.ToInt32(row.Cells["quantity"].Value);
        //                    if (decimal.TryParse(row.Cells["total"].Value?.ToString(), out decimal itemTotal))
        //                        subTotal += itemTotal;

        //                    // Split name across lines
        //                    string[] nameParts = name.Split(' ', (char)StringSplitOptions.RemoveEmptyEntries);
        //                    string firstWord = nameParts.Length > 0 ? nameParts[0] : name;
        //                    string[] remainingWords = nameParts.Skip(1).ToArray();

        //                    // First line with first word and all data
        //                    string firstLine = $"{firstWord,-12}{qty} {price} {discount} {totalPrice}";
        //                    column.Item().Text(firstLine);

        //                    // Remaining words as new lines
        //                    foreach (var word in remainingWords)
        //                    {
        //                        column.Item().PaddingLeft(10).Text(word);
        //                    }
        //                }

        //                // --- Summary ---
        //                column.Item().Text("----------------------------------------");
        //                column.Item().Text($"SUBTOTAL:    Rs. {subTotal + totalDiscount:N0}");
        //                column.Item().Text($"DISCOUNT:    Rs. {totalDiscount:N0}");
        //                column.Item().Text($"TOTAL:       Rs. {total:N0}");
        //                column.Item().Text($"PAID:        Rs. {paid:N0}");
        //                column.Item().Text($"BALANCE:     Rs. {(total - paid):N0}");
        //                column.Item().Text("----------------------------------------");

        //                // --- Footer ---
        //                column.Item().AlignCenter().Text("Thank you for your shopping here!").Bold();
        //                column.Item().PaddingTop(5).LineHorizontal(0.5f);
        //                column.Item().AlignCenter().Text("** SPECIAL OFFERS **").Bold();
        //                column.Item().AlignCenter().Text("Free diagnostics with any repair");
        //                column.Item().AlignCenter().Text("10% discount on next purchase");
        //                column.Item().AlignCenter().Text("Ask about our warranty plans!");
        //                column.Item().AlignCenter().Text($"Invoice #: INV-{DateTime.Now:yyMMddHHmm}");
        //                column.Item().PaddingTop(5).AlignCenter().Text("Developed By:");
        //                column.Item().PaddingTop(5).AlignCenter().Text("abdulahad18022@gmail.com");
        //            });
        //        });
        //    }).GeneratePdf(filePath);
        //}



    }
}
