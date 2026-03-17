using MedicineShop.BL.Models;
using MedicineShop.DL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MedicineShop.BL.Bl
{
    public class CompanyBillBl : ICompanyBillBl
    {
        private readonly ICompanyBillsDl idl;
        public CompanyBillBl(ICompanyBillsDl idl)

        {
            this.idl = idl;
        }
        public List<CompanyBill> GetAllCompanyBills(string search = "")
        {
            return idl.GetCompanyBills(search);
        }

        public bool AddCompanyPayment(int companyId, decimal paymentAmount)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid company ID.");
            if (paymentAmount <= 0)
                throw new ArgumentException("Payment amount must be positive.");
            return idl.AddCompanyPayment(companyId, paymentAmount);
        }
        public List<PaymentRecord> GetPaymentRecords(int companyId)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid company ID.");
            return idl.GetPaymentRecords(companyId);
        }
        public List<PaymentRecord> getrecord(int company_id)
        {
            if (company_id <= 0)
                throw new ArgumentException("Invalid company ID.");
            return idl.GetCompanyPaymentRecords(company_id);
        }
        public List<CompanyBill> GetCompanyBillById(int companyId)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid company ID.");
            return idl.GetCompanyBills(companyId);
        }

    }
}
