using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.Models;

namespace MedicineShop.Interfaces.DLInterfaces
{
    internal interface ICompanyDL
    {
        DataTable GetAllCompanies(string search = "");
        void AddCompany(Company company);
        void UpdateCompany(Company company);
        int DeleteCompany(int id);
    }
}
