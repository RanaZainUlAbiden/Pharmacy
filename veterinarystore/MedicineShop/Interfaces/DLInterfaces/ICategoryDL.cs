using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.Models;

namespace MedicineShop.Interfaces.DLInterfaces
{
    internal interface ICategoryDL
    {
        int AddCategory(Category category);
    }
}
