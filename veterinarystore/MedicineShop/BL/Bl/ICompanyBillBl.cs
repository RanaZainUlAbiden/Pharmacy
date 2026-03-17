using MedicineShop.BL.Models;
using System.Collections.Generic;

namespace MedicineShop.BL.Bl
{
    public interface ICompanyBillBl
    {
        bool AddCompanyPayment(int companyId, decimal paymentAmount);
        List<CompanyBill> GetAllCompanyBills(string search = "");
        List<CompanyBill> GetCompanyBillById(int companyId);
        List<PaymentRecord> GetPaymentRecords(int companyId);
        List<PaymentRecord> getrecord(int company_id);
    }
}