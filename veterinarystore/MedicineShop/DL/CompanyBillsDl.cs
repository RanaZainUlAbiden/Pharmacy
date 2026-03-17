using MedicineShop.BL.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.DL
{
    public class CompanyBillsDl : ICompanyBillsDl
    {
        public List<CompanyBill> GetCompanyBills(string text)
        {
            List<CompanyBill> companyBills = new List<CompanyBill>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = @"SELECT b.company_id, c.company_name, SUM(b.total_price) AS total_price, SUM(b.paid) AS paid, (SUM(b.total_price) - SUM(b.paid)) AS remaining
                                     FROM purchase_batches b
                                     JOIN company c ON b.company_id = c.company_id
                                     WHERE c.company_name LIKE @search OR b.company_id LIKE @search
                                     GROUP BY b.company_id, c.company_name";
                    using (var cmd = new MySql.Data.MySqlClient.MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@search", $"%{text}%");
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                CompanyBill bill = new CompanyBill
                                {
                                    company_id = reader.GetInt32("company_id"),
                                    company_name = reader.GetString("company_name"),
                                    total_price = reader.GetDecimal("total_price"),
                                    paid = reader.GetDecimal("paid"),
                                    remaining = reader.GetDecimal("remaining")
                                };
                                companyBills.Add(bill);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching company bills", ex);
            }
            return companyBills;

        }
        public List<CompanyBill> GetCompanyBills(int companyid)
        {
            List<CompanyBill> companyBills = new List<CompanyBill>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = @"SELECT b.company_id, c.company_name, SUM(b.total_price) AS total_price, SUM(b.paid) AS paid, (SUM(b.total_price) - SUM(b.paid)) AS remaining
                                     FROM purchase_batches b
                                     JOIN company c ON b.company_id = c.company_id
                                     WHERE b.company_id = @search
                                     GROUP BY b.company_id, c.company_name";
                    using (var cmd = new MySql.Data.MySqlClient.MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@search", companyid);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                CompanyBill bill = new CompanyBill
                                {
                                    company_id = reader.GetInt32("company_id"),
                                    company_name = reader.GetString("company_name"),
                                    total_price = reader.GetDecimal("total_price"),
                                    paid = reader.GetDecimal("paid"),
                                    remaining = reader.GetDecimal("remaining")
                                };
                                companyBills.Add(bill);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching company bills", ex);
            }
            return companyBills;

        }
        public bool AddCompanyPayment(int companyId, decimal paymentAmount)
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (var tran = conn.BeginTransaction())
                    {
                        // 1. Insert into payment_records
                        string insertPayment = @"INSERT INTO payment_records (company_id, payment_date, amount) 
                                         VALUES (@companyId, @date, @amount)";
                        using (var cmdInsert = new MySql.Data.MySqlClient.MySqlCommand(insertPayment, conn, tran))
                        {
                            cmdInsert.Parameters.AddWithValue("@companyId", companyId);
                            cmdInsert.Parameters.AddWithValue("@date", DateTime.Now);
                            cmdInsert.Parameters.AddWithValue("@amount", paymentAmount);
                            cmdInsert.ExecuteNonQuery();
                        }

                        // 2. Fetch unpaid batches in order
                        string selectQuery = @"SELECT purchase_batch_id, total_price, paid
                                       FROM purchase_batches
                                       WHERE company_id = @companyId 
                                       AND (total_price - paid) > 0
                                       ORDER BY purchase_date ASC, purchase_batch_id ASC";
                        using (var cmd = new MySql.Data.MySqlClient.MySqlCommand(selectQuery, conn, tran))
                        {
                            cmd.Parameters.AddWithValue("@companyId", companyId);
                            using (var reader = cmd.ExecuteReader())
                            {
                                var batches = new List<(int id, decimal total, decimal paid)>();
                                while (reader.Read())
                                {
                                    batches.Add((
                                        reader.GetInt32("purchase_batch_id"),
                                        reader.GetDecimal("total_price"),
                                        reader.GetDecimal("paid")
                                    ));
                                }
                                reader.Close();

                                // 3. Distribute payment across batches
                                foreach (var batch in batches)
                                {
                                    if (paymentAmount <= 0) break;

                                    decimal remaining = batch.total - batch.paid;
                                    decimal toPay = Math.Min(paymentAmount, remaining);

                                    string updateQuery = @"UPDATE purchase_batches 
                                                   SET paid = paid + @toPay 
                                                   WHERE purchase_batch_id = @batchId";
                                    using (var updateCmd = new MySql.Data.MySqlClient.MySqlCommand(updateQuery, conn, tran))
                                    {
                                        updateCmd.Parameters.AddWithValue("@toPay", toPay);
                                        updateCmd.Parameters.AddWithValue("@batchId", batch.id);
                                        updateCmd.ExecuteNonQuery();
                                    }

                                    paymentAmount -= toPay;
                                }
                            }
                        }

                        tran.Commit();
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception("Error adding company payment", ex);
            }
        }
        public List<PaymentRecord> GetPaymentRecords(int companyId)
        {
            var records = new List<PaymentRecord>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    string query = @"
                SELECT 
                    p.payment_id,
                    p.company_id,
                    p.payment_date,
                    p.amount,
                    c.company_name
                FROM payment_records p
                JOIN company c ON p.company_id = c.company_id
                WHERE p.company_id = @companyId
                ORDER BY p.payment_date DESC;
            ";

                    using (var cmd = new MySql.Data.MySqlClient.MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@companyId", companyId);
                        conn.Open();

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                var record = new PaymentRecord
                                {
                                    PaymentId = reader.GetInt32("payment_id"),
                                    CompanyId = reader.GetInt32("company_id"),
                                    PaymentDate = reader.GetDateTime("payment_date"),
                                    Amount = reader.GetDecimal("amount"),
                                    CompanyName = reader.GetString("company_name")
                                };
                                records.Add(record);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching payment records", ex);
            }

            return records;
        }


        public List<PaymentRecord> GetCompanyPaymentRecords(int companyId)
        {
            var records = new List<PaymentRecord>();

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();

                    // 1. Get all payments for this company (oldest first)
                    var payments = new List<(int PaymentId, DateTime Date, decimal Amount)>();
                    string paymentQuery = @"SELECT payment_id, payment_date, amount
                                    FROM payment_records
                                    WHERE company_id = @CompanyId
                                    ORDER BY payment_date ASC, payment_id ASC";
                    using (var cmd = new MySqlCommand(paymentQuery, conn))
                    {
                        cmd.Parameters.AddWithValue("@CompanyId", companyId);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                payments.Add((
                                    reader.GetInt32("payment_id"),
                                    reader.GetDateTime("payment_date"),
                                    reader.GetDecimal("amount")
                                ));
                            }
                        }
                    }

                    // 2. Get all batches (oldest first)
                    var batches = new List<(int BatchId, string BatchName, decimal Total)>();
                    string batchQuery = @"SELECT purchase_batch_id, BatchName, total_price
                                  FROM purchase_batches
                                  WHERE company_id = @CompanyId
                                  ORDER BY purchase_date ASC, purchase_batch_id ASC";
                    using (var cmd = new MySqlCommand(batchQuery, conn))
                    {
                        cmd.Parameters.AddWithValue("@CompanyId", companyId);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                batches.Add((
                                    reader.GetInt32("purchase_batch_id"),
                                    reader.GetString("BatchName"),
                                    reader.GetDecimal("total_price")
                                ));
                            }
                        }
                    }

                    // 3. Simulate allocation (replay AddCompanyPayment logic)
                    var batchPaidTracker = batches.ToDictionary(b => b.BatchId, b => 0m);

                    foreach (var p in payments)
                    {
                        decimal remainingPayment = p.Amount;

                        foreach (var b in batches)
                        {
                            if (remainingPayment <= 0) break;

                            decimal alreadyPaid = batchPaidTracker[b.BatchId];
                            decimal batchRemaining = b.Total - alreadyPaid;
                            if (batchRemaining <= 0) continue;

                            decimal toPay = Math.Min(remainingPayment, batchRemaining);

                            records.Add(new PaymentRecord
                            {
                                PaymentId = p.PaymentId,
                                CompanyId = companyId,
                                BatchId = b.BatchId,
                                BatchName = b.BatchName,
                                PaymentDate = p.Date,
                                Amount = p.Amount,               // total payment value
                                AllocatedAmount = toPay,         // part applied to this batch
                                TotalPrice = b.Total,
                                Paid = alreadyPaid + toPay,      // cumulative paid for this batch
                                RemainingBalance = b.Total - (alreadyPaid + toPay)
                            });

                            batchPaidTracker[b.BatchId] += toPay;
                            remainingPayment -= toPay;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error calculating company payment allocations: " + ex.Message);
            }

            return records;
        }

    }

}

