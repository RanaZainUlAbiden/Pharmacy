using System;
using MedicineShop.Interfaces.DLInterfaces;
using MedicineShop.Models;
using MySql.Data.MySqlClient;

namespace MedicineShop.DL
{
    public class PackingDL:IPackingDL
    {
        private readonly DatabaseHelper _db = DatabaseHelper.Instance;

        public int AddPacking(Packing packing)
        {
            string query = "INSERT INTO packing (packing_name) VALUES (@name)";
            MySqlParameter[] parameters =
            {
                new MySqlParameter("@name", packing.PackingName)
            };

            return _db.ExecuteNonQuery(query, parameters);
        }
    }
}
