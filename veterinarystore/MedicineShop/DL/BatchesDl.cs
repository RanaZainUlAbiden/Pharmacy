using MedicineShop.BL;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Data;

namespace MedicineShop.DL
{
    public class BatchesDl : IBatchesDl
    {
        // ✅ Add - Updated to include payment record
        public bool AddBatch(Batches batch)
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (var transaction = conn.BeginTransaction())
                    {
                        try
                        {
                            // Insert batch
                            string batchQuery = @"INSERT INTO purchase_batches 
                                                (company_id, Purchase_date, total_price, paid, BatchName) 
                                                VALUES (@CompanyID, @PurchaseDate, @TotalPrice, @Paid, @BatchName)";

                            using (MySqlCommand cmd = new MySqlCommand(batchQuery, conn, transaction))
                            {
                                cmd.Parameters.AddWithValue("@CompanyID", batch.CompanyID);
                                cmd.Parameters.AddWithValue("@PurchaseDate", batch.PurchaseDate);
                                cmd.Parameters.AddWithValue("@BatchName", batch.BatchName);
                                cmd.Parameters.AddWithValue("@TotalPrice", batch.TotalPrice);
                                cmd.Parameters.AddWithValue("@Paid", batch.Paid);

                                cmd.ExecuteNonQuery();
                            }

                            // Insert payment record only if there's an initial payment (paid > 0)
                            if (batch.Paid > 0)
                            {
                                string paymentQuery = @"INSERT INTO payment_records 
                                                      (company_id, amount, payment_date, notes) 
                                                      VALUES (@CompanyID, @Amount, @PaymentDate, @Notes)";

                                using (MySqlCommand paymentCmd = new MySqlCommand(paymentQuery, conn, transaction))
                                {
                                    paymentCmd.Parameters.AddWithValue("@CompanyID", batch.CompanyID);
                                    paymentCmd.Parameters.AddWithValue("@Amount", batch.Paid);
                                    paymentCmd.Parameters.AddWithValue("@PaymentDate", batch.PurchaseDate);
                                    paymentCmd.Parameters.AddWithValue("@Notes", "Initial Payment");

                                    paymentCmd.ExecuteNonQuery();
                                }
                            }

                            transaction.Commit();
                            return true;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
                            Console.WriteLine($"Error in AddBatch transaction: {ex.Message}");
                            throw;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AddBatch: {ex.Message}");
                return false;
            }
        }

        // ✅ Get All
        public List<Batches> GetAllBatches()
        {
            List<Batches> batches = new List<Batches>();
            try
            {
                string query = @"SELECT p.purchase_batch_id, p.BatchName, p.total_price, 
                                        p.paid, p.Purchase_date, p.status,
                                        p.company_id, c.company_name
                                 FROM purchase_batches p
                                 JOIN company c ON c.company_id = p.company_id";

                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            Batches batch = new Batches
                            {
                                PurchaseBatchID = reader.GetInt32("purchase_batch_id"),
                                BatchName = reader.GetString("BatchName"),
                                TotalPrice = reader.GetDecimal("total_price"),
                                Paid = reader.GetDecimal("paid"),
                                PurchaseDate = reader.GetDateTime("Purchase_date"),
                                CompanyID = reader.GetInt32("company_id"),
                                CompanyName = reader.GetString("company_name"),
                                Status = reader.GetString("status")
                            };
                            batches.Add(batch);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllBatches: {ex.Message}");
            }
            return batches;
        }

        public DataTable GetMedicines()
        {
            DataTable dt = new DataTable();

            using (var conn = DatabaseHelper.Instance.GetConnection())
            {
                try
                {
                    string query = @"SELECT 
                                    m.product_id,
                                    m.name,
                                    m.company_id,
                                    m.category_id,
                                    m.packing_id,
                                    c.company_name,
                                    cat.category_name,
                                    p.packing_name,
                                    m.sale_price
                                 FROM medicines m
                                 INNER JOIN company c ON m.company_id = c.company_id
                                 INNER JOIN categories cat ON m.category_id = cat.category_id
                                 INNER JOIN packing p ON m.packing_id = p.packing_id;";

                    MySqlDataAdapter da = new MySqlDataAdapter(query, conn);
                    da.Fill(dt);
                }
                catch
                {
                    throw; // let calling code handle exception
                }
            }

            return dt;
        }

        // ✅ Get By ID
        public Batches GetBatchById(int id)
        {
            Batches batch = null;
            try
            {
                string query = @"SELECT p.purchase_batch_id, p.BatchName, p.total_price, 
                                        p.paid, p.Purchase_date, p.status,
                                        p.company_id, c.company_name
                                 FROM purchase_batches p
                                 JOIN company c ON c.company_id = p.company_id
                                 WHERE p.purchase_batch_id = @id";

                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@id", id);
                        using (MySqlDataReader reader = cmd.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                batch = new Batches
                                {
                                    PurchaseBatchID = reader.GetInt32("purchase_batch_id"),
                                    BatchName = reader.GetString("BatchName"),
                                    TotalPrice = reader.GetDecimal("total_price"),
                                    Paid = reader.GetDecimal("paid"),
                                    PurchaseDate = reader.GetDateTime("Purchase_date"),
                                    CompanyID = reader.GetInt32("company_id"),
                                    CompanyName = reader.GetString("company_name"),
                                    Status = reader.GetString("status")
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetBatchById: {ex.Message}");
            }
            return batch;
        }

        // ✅ Update
        public bool UpdateBatch(Batches batch)
        {
            try
            {
                string query = @"UPDATE purchase_batches 
                                 SET BatchName=@BatchName, total_price=@TotalPrice, 
                                     paid=@Paid, Purchase_date=@PurchaseDate, 
                                     company_id=@CompanyID, status=@Status
                                 WHERE purchase_batch_id=@BatchID";

                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@BatchName", batch.BatchName);
                        cmd.Parameters.AddWithValue("@TotalPrice", batch.TotalPrice);
                        cmd.Parameters.AddWithValue("@Paid", batch.Paid);
                        cmd.Parameters.AddWithValue("@PurchaseDate", batch.PurchaseDate);
                        cmd.Parameters.AddWithValue("@CompanyID", batch.CompanyID);
                        cmd.Parameters.AddWithValue("@Status", batch.Status);
                        cmd.Parameters.AddWithValue("@BatchID", batch.PurchaseBatchID);

                        return cmd.ExecuteNonQuery() > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateBatch: {ex.Message}");
                return false;
            }
        }

        // ✅ Delete
        public bool DeleteBatch(int id)
        {
            try
            {
                string query = "DELETE FROM purchase_batches WHERE purchase_batch_id=@id";

                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@id", id);
                        return cmd.ExecuteNonQuery() > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteBatch: {ex.Message}");
                return false;
            }
        }

        // ✅ Search (LIKE)
        public List<Batches> SearchBatches(string searchTerm)
        {
            List<Batches> batches = new List<Batches>();
            try
            {
                string query = @"SELECT p.purchase_batch_id, p.BatchName, p.total_price, 
                                        p.paid, p.Purchase_date, p.status,
                                        p.company_id, c.company_name
                                 FROM purchase_batches p
                                 JOIN company c ON c.company_id = p.company_id
                                 WHERE p.BatchName LIKE @search";

                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@search", $"%{searchTerm}%");
                        using (MySqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                Batches batch = new Batches
                                {
                                    PurchaseBatchID = reader.GetInt32("purchase_batch_id"),
                                    BatchName = reader.GetString("BatchName"),
                                    TotalPrice = reader.GetDecimal("total_price"),
                                    Paid = reader.GetDecimal("paid"),
                                    PurchaseDate = reader.GetDateTime("Purchase_date"),
                                    CompanyID = reader.GetInt32("company_id"),
                                    CompanyName = reader.GetString("company_name"),
                                    Status = reader.GetString("status")
                                };
                                batches.Add(batch);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SearchBatches: {ex.Message}");
            }
            return batches;
        }
    }
}