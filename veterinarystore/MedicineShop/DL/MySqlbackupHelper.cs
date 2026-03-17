using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;

public static class MySqlBackupHelper
{
    public static void CreateBackup()
    {
        try
        {
            // Read from App.config
            string connStr = ConfigurationManager.ConnectionStrings["MyConnection"].ConnectionString;

            // Parse connection string
            var builder = new MySql.Data.MySqlClient.MySqlConnectionStringBuilder(connStr);
            string dbUser = builder.UserID;
            string dbPassword = builder.Password;
            string dbName = builder.Database;
            uint dbPort = builder.Port; // get port from config if not default

            string backupFolder = @"D:\FertilizerSOP\SQLBackups";
            if (!Directory.Exists(backupFolder))
                Directory.CreateDirectory(backupFolder);

            string fileName = $"backup_{DateTime.Now:yyyyMMdd_HHmmss}.sql";
            string filePath = Path.Combine(backupFolder, fileName);

            string mysqldumpPath = @"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe";

            // If not default port, add -P <port>
            string arguments = $"-u {dbUser} -p{dbPassword} -P {dbPort} --routines --triggers --databases {dbName}";

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = mysqldumpPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (Process process = Process.Start(psi))
            {
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();

                process.WaitForExit();

                if (!string.IsNullOrWhiteSpace(error))
                {
                    File.AppendAllText(Path.Combine(backupFolder, "backup_error.log"),
                        $"[{DateTime.Now}] {error}\n");
                }

                if (!string.IsNullOrWhiteSpace(output))
                {
                    File.WriteAllText(filePath, output);
                    Debug.WriteLine($"✅ Backup created at: {filePath}");
                }
                else
                {
                    Debug.WriteLine("❌ No output from mysqldump. Backup failed.");
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"❌ Backup failed: {ex.Message}");
        }
    }
}
