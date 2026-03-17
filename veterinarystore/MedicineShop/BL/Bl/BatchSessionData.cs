using System;
using System.Collections.Generic;
using System.IO;
using System.Windows.Forms;
using System.Xml.Serialization;

namespace MedicineShop.UI
{
    [Serializable]
    public class BatchSessionData
    {
        public string BatchName { get; set; }
        public int CompanyID { get; set; }
        public string CompanyName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public bool BatchSaved { get; set; }
        public bool DetailsPanelVisible { get; set; }
        public DateTime SessionDate { get; set; }
        public List<BatchItemData> BatchItems { get; set; }

        public BatchSessionData()
        {
            BatchName = "";
            CompanyName = "";
            SessionDate = DateTime.Now;
            BatchItems = new List<BatchItemData>();
        }
    }

    [Serializable]
    public class BatchItemData
    {
        public int BatchItemID { get; set; }
        public int BatchID { get; set; }
        public int MedicineID { get; set; }
        public string MedicineName { get; set; }
        public int Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public DateTime ExpiryDate { get; set; }
        public decimal TotalCost { get; set; }

        public BatchItemData()
        {
            MedicineName = "";
        }
    }


public class BatchSessionManager
    {
        private string sessionFilePath;
        private Timer autoSaveTimer;
        private bool hasUnsavedChanges = false;

        public event EventHandler<bool> UnsavedChangesChanged;
        public event EventHandler AutoSaveRequested;

        public BatchSessionManager()
        {
            InitializeSessionPath();
            SetupAutoSaveTimer();
        }

        public bool HasUnsavedChanges
        {
            get => hasUnsavedChanges;
            private set
            {
                if (hasUnsavedChanges != value)
                {
                    hasUnsavedChanges = value;
                    UnsavedChangesChanged?.Invoke(this, value);
                }
            }
        }

        private void InitializeSessionPath()
        {
            try
            {
                string sessionDirectory = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "MedicineShop",
                    "Sessions"
                );

                Directory.CreateDirectory(sessionDirectory);
                sessionFilePath = Path.Combine(sessionDirectory, "batch_session.xml");

                System.Diagnostics.Debug.WriteLine($"Session path: {sessionFilePath}");
            }
            catch (Exception ex)
            {
                sessionFilePath = Path.Combine(Path.GetTempPath(), "medicine_shop_batch_session.xml");
                System.Diagnostics.Debug.WriteLine($"Session path fallback: {sessionFilePath}, Error: {ex.Message}");
            }
        }

        private void SetupAutoSaveTimer()
        {
            autoSaveTimer = new Timer();
            autoSaveTimer.Interval = 30000;
            autoSaveTimer.Tick += (s, e) => AutoSaveRequested?.Invoke(this, EventArgs.Empty);
            autoSaveTimer.Start();
        }

        public void MarkUnsavedChanges()
        {
            HasUnsavedChanges = true;
        }

        public void ClearUnsavedChanges()
        {
            HasUnsavedChanges = false;
        }

        public bool SaveSession(BatchSessionData sessionData)
        {
            try
            {
                // REMOVED the HasUnsavedChanges check - always try to save if data is valid
                if (sessionData == null || string.IsNullOrWhiteSpace(sessionData.BatchName))
                {
                    System.Diagnostics.Debug.WriteLine("SaveSession: No valid data to save");
                    return false;
                }

                sessionData.SessionDate = DateTime.Now;

                string directory = Path.GetDirectoryName(sessionFilePath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                string tempFilePath = sessionFilePath + ".tmp";

                System.Diagnostics.Debug.WriteLine($"Saving session to: {tempFilePath}");
                System.Diagnostics.Debug.WriteLine($"BatchName: {sessionData.BatchName}");
                System.Diagnostics.Debug.WriteLine($"BatchItems count: {sessionData.BatchItems?.Count ?? 0}");

                using (var fileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write))
                {
                    var serializer = new XmlSerializer(typeof(BatchSessionData));
                    serializer.Serialize(fileStream, sessionData);
                }

                if (File.Exists(sessionFilePath))
                {
                    File.Delete(sessionFilePath);
                }
                File.Move(tempFilePath, sessionFilePath);

                System.Diagnostics.Debug.WriteLine($"Session saved successfully at: {DateTime.Now}");
                System.Diagnostics.Debug.WriteLine($"File exists: {File.Exists(sessionFilePath)}");
                System.Diagnostics.Debug.WriteLine($"File size: {new FileInfo(sessionFilePath).Length} bytes");

                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"SAVE FAILED: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");

                try
                {
                    string tempFilePath = sessionFilePath + ".tmp";
                    if (File.Exists(tempFilePath))
                        File.Delete(tempFilePath);
                }
                catch { }

                return false;
            }
        }

        public BatchSessionData RestoreSession(out bool shouldRestore)
        {
            shouldRestore = false;

            try
            {
                System.Diagnostics.Debug.WriteLine($"Checking for session file: {sessionFilePath}");
                System.Diagnostics.Debug.WriteLine($"File exists: {File.Exists(sessionFilePath)}");

                if (!File.Exists(sessionFilePath))
                    return null;

                var fileInfo = new FileInfo(sessionFilePath);
                System.Diagnostics.Debug.WriteLine($"File size: {fileInfo.Length} bytes");
                System.Diagnostics.Debug.WriteLine($"File age: {DateTime.Now.Subtract(fileInfo.LastWriteTime).TotalHours:F2} hours");

                if (DateTime.Now.Subtract(fileInfo.LastWriteTime).TotalHours > 24)
                {
                    File.Delete(sessionFilePath);
                    System.Diagnostics.Debug.WriteLine("Session file too old, deleted");
                    return null;
                }

                if (fileInfo.Length == 0)
                {
                    File.Delete(sessionFilePath);
                    System.Diagnostics.Debug.WriteLine("Session file empty, deleted");
                    return null;
                }

                BatchSessionData sessionData;
                using (var fileStream = new FileStream(sessionFilePath, FileMode.Open, FileAccess.Read))
                {
                    var serializer = new XmlSerializer(typeof(BatchSessionData));
                    sessionData = (BatchSessionData)serializer.Deserialize(fileStream);
                }

                System.Diagnostics.Debug.WriteLine($"Deserialized: BatchName={sessionData?.BatchName}, Items={sessionData?.BatchItems?.Count ?? 0}");

                if (sessionData != null && !string.IsNullOrWhiteSpace(sessionData.BatchName))
                {
                    DialogResult result = MessageBox.Show(
                        $"Found unsaved batch session: '{sessionData.BatchName}'\n" +
                        $"Items: {sessionData.BatchItems?.Count ?? 0}\n" +
                        $"Created: {sessionData.SessionDate:yyyy-MM-dd HH:mm}\n\n" +
                        "Would you like to restore this session?",
                        "Restore Session",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Question);

                    if (result == DialogResult.Yes)
                    {
                        shouldRestore = true;
                        MarkUnsavedChanges();
                        return sessionData;
                    }
                    else
                    {
                        ClearSession();
                        return null;
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"RESTORE FAILED: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");

                try
                {
                    if (File.Exists(sessionFilePath))
                        File.Delete(sessionFilePath);
                }
                catch { }

                MessageBox.Show($"Session file was corrupted and has been reset.\nError: {ex.Message}",
                    "Session Restore", MessageBoxButtons.OK, MessageBoxIcon.Information);

                return null;
            }
        }

        public void ClearSession()
        {
            try
            {
                if (File.Exists(sessionFilePath))
                {
                    File.Delete(sessionFilePath);
                    System.Diagnostics.Debug.WriteLine("Session file cleared successfully");
                }
                ClearUnsavedChanges();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to clear session: {ex.Message}");
            }
        }

        public DialogResult HandleFormClosing()
        {
            try
            {
                autoSaveTimer?.Stop();

                if (HasUnsavedChanges)
                {
                    return MessageBox.Show(
                        "You have unsaved changes. Would you like to save the current session to restore later?",
                        "Save Session",
                        MessageBoxButtons.YesNoCancel,
                        MessageBoxIcon.Question);
                }
                else
                {
                    ClearSession();
                    return DialogResult.No;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error during form closing: {ex.Message}");
                return DialogResult.No;
            }
        }

        public void Dispose()
        {
            autoSaveTimer?.Stop();
            autoSaveTimer?.Dispose();
        }
    }
}