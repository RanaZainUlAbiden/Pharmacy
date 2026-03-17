using MedicineShop.BL.Models;
using System.Collections.Generic;

namespace MedicineShop.DL
{
    public interface ICompanyBillsDl
    {
        bool AddCompanyPayment(int companyId, decimal paymentAmount);
        List<CompanyBill> GetCompanyBills(int companyid);
        List<CompanyBill> GetCompanyBills(string text);
        List<PaymentRecord> GetCompanyPaymentRecords(int companyId);
        List<PaymentRecord> GetPaymentRecords(int companyId);
    }
}