using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Windows.Input;
using System.Xml.Linq;
using static System.Net.Mime.MediaTypeNames;

namespace MedicineShop
{
    public sealed class DatabaseHelper
    {
        private readonly string _connectionString =
    ConfigurationManager.ConnectionStrings["MyConnection"].ConnectionString;

        // Singleton instance
        private static readonly Lazy<DatabaseHelper> _instance = new Lazy<DatabaseHelper>(() => new DatabaseHelper());

        // Private constructor
        private DatabaseHelper() { }

        // Public accessor
        public static DatabaseHelper Instance => _instance.Value;

        // Methods
        public MySqlConnection GetConnection()
        {
            string connStr = ConfigurationManager.ConnectionStrings["MyConnection"].ConnectionString;
            return new MySqlConnection(connStr);
        }

        public MySqlDataReader ExecuteReader(string query, MySqlParameter[] parameters = null)
        {
            var conn = GetConnection();
            conn.Open();
            var cmd = new MySqlCommand(query, conn);
            if (parameters != null)
                cmd.Parameters.AddRange(parameters);
            return cmd.ExecuteReader(CommandBehavior.CloseConnection);
        }

        public int getcustid(string fullName)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = @"
                SELECT customer_id 
                FROM customers 
                WHERE CONCAT(first_name, ' ', last_name) = @fullName;";

                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@fullName", fullName.Trim());
                        object result = cmd.ExecuteScalar();
                        return result != null ? Convert.ToInt32(result) : -1;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving customer ID: " + ex.Message);
            }
        }

        public int GetLastInsertId()
        {
            string query = "SELECT LAST_INSERT_ID();";
            using (var conn = GetConnection())
            {
                conn.Open();
                using (var cmd = new MySqlCommand(query, conn))
                {
                    return Convert.ToInt32(cmd.ExecuteScalar());
                }
            }
        }

        public int ExecuteNonQueryTransaction(string query, MySqlParameter[] parameters, MySqlTransaction transaction)
        {
            using (var cmd = new MySqlCommand(query, transaction.Connection, transaction))
            {
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                LogCommand(cmd);
                return cmd.ExecuteNonQuery();
            }
        }

        public int ExecuteNonQuery(string query, MySqlParameter[] parameters = null)
        {
            using (var conn = GetConnection())
            {
                conn.Open();
                using (var cmd = new MySqlCommand(query, conn))
                {
                    if (parameters != null)
                        cmd.Parameters.AddRange(parameters);

                    LogCommand(cmd);

                    try
                    {
                        int result = cmd.ExecuteNonQuery();
                        Console.WriteLine($"Rows affected: {result}");
                        return result;
                    }
                    catch (MySqlException ex)
                    {
                        LogMySqlError(ex, cmd);
                        throw; 
                    }
                }
            }
        }

        private void LogCommand(MySqlCommand cmd)
        {
            Console.WriteLine("Executing command:");
            Console.WriteLine($"SQL: {cmd.CommandText}");
            foreach (MySqlParameter p in cmd.Parameters)
            {
                Console.WriteLine($"{p.ParameterName} = {p.Value} (Type: {p.MySqlDbType})");
            }
        }

        private void LogMySqlError(MySqlException ex, MySqlCommand cmd)
        {
            Console.WriteLine("MySQL Error occurred:");
            Console.WriteLine($"Error Code: {ex.Number}");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine("Command that failed:");
            Console.WriteLine(cmd.CommandText);
            foreach (MySqlParameter p in cmd.Parameters)
            {
                Console.WriteLine($"{p.ParameterName} = {p.Value}");
            }
        }
     
        public int getbatchid(string batchName)
        {
            if (string.IsNullOrWhiteSpace(batchName))
                throw new ArgumentException("Batch name cannot be null or empty", nameof(batchName));

            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT purchase_batch_id FROM purchase_batches WHERE BatchName = @name LIMIT 1;";

                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.Add("@name", MySqlDbType.VarChar).Value = batchName;

                        object result = cmd.ExecuteScalar();
                        return (result != null && int.TryParse(result.ToString(), out int batchId))
                            ? batchId
                            : -1; // not found
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving batch ID: " + ex.Message, ex);
            }
        }
      
        public List<string> Getbatches(string keyword)
        {
            List<string> suppliers = new List<string>();
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT batch_name FROM batches WHERE batch_name LIKE @keyword;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@keyword", $"%{keyword}%");

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                suppliers.Add(reader.GetString("batch_name"));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message);
            }
            return suppliers;
        }
        public int GetLastInsertId(MySqlTransaction transaction, MySqlConnection conn)
        {
            using (var cmd = new MySql.Data.MySqlClient.MySqlCommand("SELECT LAST_INSERT_ID();", conn, transaction))
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
        }

        public DataTable GetCompany(string name)
        {
            DataTable dt = new DataTable();

            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT * FROM company WHERE company_name LIKE @name";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        // Use wildcard search
                        cmd.Parameters.AddWithValue("@name", "%" + name + "%");

                        using (MySqlDataAdapter da = new MySqlDataAdapter(cmd))
                        {
                            da.Fill(dt);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error getting company: " + ex.Message);
            }

            return dt;
        }
        public  List<string> getcomapnynames(string keyword)
        {
            List<string> suppliers = new List<string>();
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT company_name FROM company WHERE company_name LIKE @keyword;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@keyword", $"%{keyword}%");

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                suppliers.Add(reader.GetString("company_name"));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message);
            }
            return suppliers;
        }
        public List<string> Getpacking(string keyword)
        {
            List<string> suppliers = new List<string>();
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT packing_name FROM packing WHERE packing_name LIKE @keyword;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@keyword", $"%{keyword}%");

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                suppliers.Add(reader.GetString("packing_name"));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message);
            }
            return suppliers;
        }
        public List<string> getcategories(string keyword)
        {
            List<string> suppliers = new List<string>();
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT category_name FROM categories WHERE category_name LIKE @keyword;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@keyword", $"%{keyword}%");

                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                suppliers.Add(reader.GetString("category_name"));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving batches: " + ex.Message);
            }
            return suppliers;
        }
        public int getcompany_id(string comapnyname)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "Select  company_id from company where company_name=@name";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@name", comapnyname);
                        object result = cmd.ExecuteScalar();
                        return Convert.ToInt32(result);


                    }
                }
            }
            catch (Exception ex) { throw new Exception("error fetchign company_id"+ex.Message); }
        }
        public int getcategory_id(string comapnyname)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "Select  category_id from categories where category_name=@name";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@name", comapnyname);
                        object result = cmd.ExecuteScalar();
                        return Convert.ToInt32(result);


                    }
                }
            }
            catch (Exception ex) { throw new Exception("error fetchign company_id" + ex.Message); }
        }
        public int getpacking_id(string comapnyname)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "Select  packing_id from packing where packing_name=@name";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@name", comapnyname);
                        object result = cmd.ExecuteScalar();
                        return Convert.ToInt32(result);


                    }
                }
            }
            catch (Exception ex) { throw new Exception("error fetchign company_id" + ex.Message); }
        }
        internal decimal getsaleprice(int product_id)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT sale_price FROM medicines WHERE product_id = @name;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@name", product_id);
                        object result = cmd.ExecuteScalar();
                        return result != null ? Convert.ToDecimal(result) : -1;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving Product ID: " + ex.Message);
            }
        }
  
        internal int getproductid(string text)
        {
            try
            {
                using (var conn = GetConnection())
                {
                    conn.Open();
                    string query = "SELECT product_id FROM products WHERE name = @name;";
                    using (var cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@name", text);
                        object result = cmd.ExecuteScalar();
                        return result != null ? Convert.ToInt32(result) : -1;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving Product ID: " + ex.Message);
            }
        }
        public DataTable ExecuteDataTable(string query, MySqlParameter[] parameters = null)
        {
            var dt = new DataTable();
            using (var conn = GetConnection())
            {
                conn.Open();
                using (var cmd = new MySqlCommand(query, conn))
                {
                    if (parameters != null)
                        cmd.Parameters.AddRange(parameters);
                    using (var adapter = new MySqlDataAdapter(cmd))
                    {
                        adapter.Fill(dt);
                    }
                }
            }
            return dt;
        }

        public void BackupDatabase(string backupPath)
        {
            try
            {
                var builder = new MySqlConnectionStringBuilder(_connectionString);

                string server = builder.Server;
                string user = builder.UserID;
                string password = builder.Password;
                string database = builder.Database;

                // Ensure backup folder exists
                if (!Directory.Exists(backupPath))
                {
                    Directory.CreateDirectory(backupPath);
                }

                string backupFile = Path.Combine(backupPath, $"{database}_backup.sql");

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    // 🔹 Use full path to mysqldump.exe
                    FileName = @"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    Arguments = $"--host={server} --user={user} --password={password} {database}"
                };

                using (Process process = Process.Start(psi))
                {
                    string dumpData = process.StandardOutput.ReadToEnd();
                    string error = process.StandardError.ReadToEnd();
                    process.WaitForExit();

                    if (process.ExitCode == 0)
                    {
                        File.WriteAllText(backupFile, dumpData); // overwrite old file
                    }
                    else
                    {
                        throw new Exception("mysqldump failed: " + error);
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Backup failed: " + ex.Message);
            }
        }




    }

}
