using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.Models;

namespace MedicineShop.Interfaces.DLInterfaces
{
    internal interface IMedicineDL
    {
        int AddMedicine(Medicine medicine);
        int UpdateMedicine(Medicine medicine);
        int DeleteMedicine(int id);

        DataTable GetAllMedicines();
        DataTable SearchMedicines(string keyword);

        List<ComboItem> GetCompanyList(string keyword);
        List<ComboItem> GetCategoryList(string keyword);
        List<ComboItem> GetPackingList(string keyword);
    }
}
