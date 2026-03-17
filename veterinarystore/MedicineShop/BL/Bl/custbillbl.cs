using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MedicineShop.BL.Models;
using MedicineShop.Interfaces.DLInterfaces;

namespace MedicineShop.BL.Bl
{
    internal class custbillbl : Icustomerbillbl
    {
        public readonly Icustomerbilldl idl;
        public custbillbl(Icustomerbilldl idl)
        {
            this.idl = idl;
        }

        List<custbill> GetAllCustomerBills(string search)
        {
            return idl.GetCustomerBills(search);
        }

        public bool AddcustomerPayment(int companyId, decimal paymentAmount)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid customer ID.");
            if (paymentAmount <= 0)
                throw new ArgumentException("Payment amount must be positive.");
            return idl.AddCustomerPayment(companyId, paymentAmount);
        }

        List<custPaymentRecord> Icustomerbillbl.GetcustPaymentRecords(int companyId)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid customer ID.");
            return idl.GetCustomerPaymentRecords(companyId);
        }

        List<custPaymentRecord> Icustomerbillbl.getcustrecord(int company_id)
        {
            if (company_id <= 0)
                throw new ArgumentException("Invalid customer ID.");
            return idl.GetcustPaymentRecords(company_id);
        }
        List<custbill> Icustomerbillbl.GetCustomerBillById(int companyId)
        {
            if (companyId <= 0)
                throw new ArgumentException("Invalid customer ID.");
            return idl.GetCustomerBills(companyId);
        }

        List<custbill> Icustomerbillbl.GetAllCustomerBills(string search)
        {
            return GetAllCustomerBills(search);
        }
    }
}
