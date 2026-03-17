//using KIMS;
using MySql.Data.MySqlClient;
using System;
using System.Data;
using fertilizesop.BL.Models;
using MedicineShop;
namespace fertilizesop.DL
{
    public static class LoginDL
    {
        public static bool ValidateUser(string username, string password)
        {
            using (var conn = DatabaseHelper.Instance.GetConnection())
            {
                conn.Open();
                const string query = @"
                SELECT username 
                FROM users 
                WHERE username = @username AND password_hash = @password
                LIMIT 1;";

                using (var cmd = new MySqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@username", username);
                    cmd.Parameters.AddWithValue("@password", password); 

                    using (var reader = cmd.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                         //Usersession.Role = reader.GetString("role");
                           Usersession.user_name = reader.GetString("username");
                            return true;
                        }
                        return false;
                    }
                }
            }
        }
    }

}
