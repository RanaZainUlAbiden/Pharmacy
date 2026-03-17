using fertilizesop.BL.Models;
//using KIMS;
using MedicineShop;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Data;

namespace fertilizesop.DL
{
    public class Customerbilldl
    {
        private readonly DatabaseHelper _dbHelper;

        public Customerbilldl()
        {
            _dbHelper = DatabaseHelper.Instance;
        }

        public DataTable GetCustomerBillingRecords(string searchTerm = "")
        {
            DataTable dt = new DataTable();

            try
            {
                string query = @"
            SELECT 
                cb.sale_id,
                c.full_name AS CustomerName,
                c.phone AS CustomerPhone,
                DATE_FORMAT(cb.sale_date, '%d-%m-%Y %h:%i %p') AS SaleDate,
                CAST(cb.total_amount AS DECIMAL(12,2)) AS TotalAmount,
                CAST(IFNULL(cb.paid_amount, 0) AS DECIMAL(12,2)) AS PaidAmount,
                CAST((cb.total_amount - IFNULL(cb.paid_amount, 0)) AS DECIMAL(12,2)) AS DueAmount
               
            FROM 
                sales cb
            JOIN 
                customers c ON cb.customer_id = c.customer_id
            WHERE 
                cb.sale_id LIKE @searchTerm OR
                c.full_name LIKE @searchTerm OR
                c.phone LIKE @searchTerm OR
                cb.sale_date LIKE @searchTerm
            ORDER BY 
                cb.sale_date DESC";

                using (var conn = _dbHelper.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@searchTerm", $"%{searchTerm}%");

                        using (var adapter = new MySqlDataAdapter(cmd))
                        {
                            adapter.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving billing records: " + ex.Message);
            }

            return dt;
        }

        public List<customerbill> getbill()
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT    sb.sale_id, sb.paid_amount, sb.customer_id,   " +
                        "sb.total_amount,    (sb.total_amount-sb.paid_amount) as pending,  " +
                        " sb.sale_date,   full_name as name" +
                        "FROM   sales sb  " +
                        "    JOIN  " +
                        " customers s ON s.customer_id = sb.customer_id ";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        var list = new List<customerbill>();
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int billid = reader.GetInt32("sale_id");
                                string customer_name = reader.GetString("full_name");
                                decimal totalamount = reader.IsDBNull(reader.GetOrdinal("total_amount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("total_price"));
                                decimal paidamount = reader.IsDBNull(reader.GetOrdinal("paid_amount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("paid_amount"));
                                decimal pending = reader.IsDBNull(reader.GetOrdinal("pending")) ? 0 : reader.GetDecimal(reader.GetOrdinal("pending"));
                                //string status = reader.GetString("Status");
                                DateTime date = reader.GetDateTime("sale_date");
                                int customer_id = reader.GetInt32("customer_id");
                                var bills = new customerbill(billid, customer_name, date, totalamount, paidamount, pending, customer_id);

                                list.Add(bills);



                            }
                        }
                        return list;
                    }
                }
            }
            catch (MySqlException ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message, ex);
            }
        }

        public List<customerbill> searchbill(string text)
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT    sb.sale_id, sb.paid_amount, sb.customer_id, " +
                        "  sb.total_amount,    (sb.total_amount-sb.paid_amount) as pending,  " +
                        " sb.sale_date,   full_name as name" +
                        " FROM   sales sb   " +
                        "   JOIN   customers s ON s.customer_id = sb.customer_id " +
                        " where s.full_nmae like @text" +
                        " or sale_id like @text";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@text", "%" + text + "%");
                        var list = new List<customerbill>();
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int billid = reader.GetInt32("sale_id");
                                string customer_name = reader.GetString("full_name");
                                decimal totalamount = reader.IsDBNull(reader.GetOrdinal("total_amount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("total_price"));
                                decimal paidamount = reader.IsDBNull(reader.GetOrdinal("paid_amount")) ? 0 : reader.GetDecimal(reader.GetOrdinal("paid_amount"));
                                decimal pending = reader.IsDBNull(reader.GetOrdinal("pending")) ? 0 : reader.GetDecimal(reader.GetOrdinal("pending"));
                                //string status = reader.GetString("Status");
                                DateTime date = reader.GetDateTime("sale_date");
                                int customer_id = reader.GetInt32("customer_id");
                                var bills = new customerbill(billid, customer_name, date, totalamount, paidamount, pending, customer_id);

                                list.Add(bills);



                            }
                        }
                        return list;
                    }
                }
            }
            catch (MySqlException ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message, ex);
            }
        }

        public DataTable GetBillDetails(int billId)
        {
            DataTable dt = new DataTable();

            try
            {
                string query = @"
                    SELECT 
                        p.name AS ProductName,
                        cbd.quantity,
                        (p.sale_price * cbd.quantity) AS TotalPrice,
                        cbd.discount
                    FROM 
                        sale_items cbd
                    JOIN 
                        batch_items bt on bt.batch_item_id = cbd.batch_item_id
                    JOIN 
                        medicines p ON bt.product_id = p.product_id
                    WHERE 
                        cbd.sale_id = @billId";

                using (var conn = _dbHelper.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@billId", billId);

                        using (var adapter = new MySqlDataAdapter(cmd))
                        {
                            adapter.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving bill details: " + ex.Message);
            }

            return dt;
        }

      

        public DataTable GetPaymentHistory(int billId)
        {
            DataTable dt = new DataTable();

            try
            {
                string query = @"
                    SELECT 
                        date AS PaymentDate,
                        payment AS Amount,
                        sale_id
                    FROM 
                        customerpricerecord
                    WHERE 
                        sale_id = @billId
                    ORDER BY 
                        date DESC";

                using (var conn = _dbHelper.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@billId", billId);

                        using (var adapter = new MySqlDataAdapter(cmd))
                        {
                            adapter.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving payment history: " + ex.Message);
            }

            return dt;
        }

        public static bool AddRecord(Customerrecord s)
        {
            int customerId = DatabaseHelper.Instance.getcustid(s.name);

            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();
                    using (var transaction = conn.BeginTransaction())
                    {
                        // Insert into customerpricerecord
                        string insertQuery = @"
                    INSERT INTO customerpricerecord
                    (customer_id, sale_id, date, payment, remarks)
                    VALUES (@cust_id, @billid, @date, @payment, @remarks);";

                        using (var insertCmd = new MySqlCommand(insertQuery, conn, transaction))
                        {
                            insertCmd.Parameters.AddWithValue("@cust_id", customerId);
                            insertCmd.Parameters.AddWithValue("@billid", s.bill_id);
                            insertCmd.Parameters.AddWithValue("@date", s.date);
                            insertCmd.Parameters.AddWithValue("@payment", s.payement);
                            insertCmd.Parameters.AddWithValue("@remarks", s.remarks);

                            insertCmd.ExecuteNonQuery();
                        }

                        // Update paid_amount in customerbills
                        string updateQuery = @"
                    UPDATE sales
                    SET paid_amount = paid_amount + @payment
                    WHERE sale_id = @billid;";

                        using (var updateCmd = new MySqlCommand(updateQuery, conn, transaction))
                        {
                            updateCmd.Parameters.AddWithValue("@payment", s.payement);
                            updateCmd.Parameters.AddWithValue("@billid", s.bill_id);

                            updateCmd.ExecuteNonQuery();
                        }

                        transaction.Commit();
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error adding payment record and updating bill: " + ex.Message, ex);
            }
        }


        public static List<Customerrecord> getrecord(int billid)
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    var listt = new List<Customerrecord>();
                    conn.Open();
                    string query = "select * from customerpricerecord where sale_id=@billid;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@billid", billid);
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int id = reader.GetInt32("record_id");
                                int billsid = reader.GetInt32("sale_id");
                                int custid = reader.GetInt32("customer_id");
                                DateTime date = reader.GetDateTime("date");
                                decimal payments = reader.GetDecimal("payment");
                                //string remarks = reader["remarks"] == DBNull.Value ? "" : reader.GetString("remarks");

                                var record = new Customerrecord(id, custid, payments, date, billsid);

                                listt.Add(record);
                            }
                        }
                        return listt;
                    }
                }
            }
            catch (Exception ex) { throw new Exception("error" + ex.Message, ex); }
        }

        public static int gettotaldueamount(string text)
        {
            try
            {
                using (var conn = DatabaseHelper.Instance.GetConnection())
                {
                    conn.Open();

                    // First, get the customer_id from the text (customer name)
                    string customerIdQuery = "SELECT customer_id FROM customers WHERE full_name = @text";
                    int customerId = -1;

                    using (var customerCmd = new MySqlCommand(customerIdQuery, conn))
                    {
                        customerCmd.Parameters.AddWithValue("@text", text);
                        object result = customerCmd.ExecuteScalar();

                        if (result != null && result != DBNull.Value)
                        {
                            customerId = Convert.ToInt32(result);
                        }
                        else
                        {
                            // Customer not found
                            return 0;
                        }
                    }

                    // Now get the total due amount for this customer
                    string query = @"SELECT COALESCE(SUM(total_amount - IFNULL(paid_amount, 0)), 0) 
                         FROM sales 
                         WHERE customer_id = @customerId";

                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@customerId", customerId);
                        object result = cmd.ExecuteScalar();

                        if (result != null && result != DBNull.Value)
                        {
                            return Convert.ToInt32(result);
                        }
                        else
                        {
                            return 0;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error fetching total due amount: " + ex.Message, ex);
            }
        }
    }
}