using MedicineShop.DL;
using MedicineShop.Models;
using System;

namespace MedicineShop.BL
{
    public class PackingBL
    {
        private readonly PackingDL _packingDL = new PackingDL();

        public int AddPacking(Packing packing)
        {
            if (string.IsNullOrWhiteSpace(packing.PackingName))
                throw new Exception("Packing name is required.");

            if (packing.PackingName.Length < 2)
                throw new Exception("Packing name must be at least 2 characters long.");

            return _packingDL.AddPacking(packing);
        }
    }
}
