using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.BL.Models;

namespace MedicineShop.BL.Bl
{
    public interface Icustomerbillbl
    {
        bool AddcustomerPayment(int companyId, decimal paymentAmount);
        List<custbill> GetAllCustomerBills(string search = "");
        List<custbill> GetCustomerBillById(int companyId);
        List<custPaymentRecord> GetcustPaymentRecords(int companyId);
        List<custPaymentRecord> getcustrecord(int company_id);
    }
}
