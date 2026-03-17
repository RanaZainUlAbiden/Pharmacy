using fertilizesop.UI;
using MedicineShop.BL;
using MedicineShop.BL.Bl;
using MedicineShop.DL;
using MedicineShop.Interfaces.DLInterfaces;
using MedicineShop.UI;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using TechStore.UI;

namespace MedicineShop
{
    internal static class Program
    {
        public static IServiceProvider ServiceProvider { get; private set; }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            var services = new ServiceCollection();
            configureServices(services);
            ServiceProvider = services.BuildServiceProvider();

            // Show login first (Modal)
            var login = ServiceProvider.GetRequiredService<Login>();
            var result = login.ShowDialog();

            if (result == DialogResult.OK)
            {
                // Run dashboard only after login passes
                var mainForm = ServiceProvider.GetRequiredService<Dashboard>();
                Application.Run(mainForm);
            }
        }

        private static void configureServices(ServiceCollection services)
        {
            // Register all forms
            services.AddTransient<Dashboard>();
            services.AddTransient<Login>();
            services.AddTransient<CompanyMain>();
            services.AddTransient<AddCompany>();
            services.AddTransient<CompanyBill>();
            services.AddTransient<Batchform>();
            services.AddTransient<AddBatchdetailsform>();
            services.AddTransient<HomeContentform>();
            services.AddTransient<expired_products>();

            services.AddTransient<MedicineMain>();
            services.AddTransient<AddMedicine>();
            services.AddTransient<Customersale>();
            services.AddTransient<customerbillui>();
            services.AddTransient<Customermain>();
            services.AddTransient<CompanyBillDetails>();
            services.AddTransient<Addcustomer>();
            services.AddTransient<AddCategory>();
            services.AddTransient<AddPacking>();
            services.AddTransient<BatchDetailsform>();


            // Register other dependencies like Bl classes, DbContext, etc.
            services.AddScoped<ICompanyBillsDl, CompanyBillsDl>();
            services.AddScoped<ICompanyBillBl, CompanyBillBl>();
            services.AddScoped<IBatchesBl, BatchesBl>();
            services.AddScoped<IBatchesDl, BatchesDl>();
            services.AddScoped<IBatchItemsBl, BatchItemsBl>();
            services.AddScoped<IBatchItemsDl, BatchItemsDl>();
            services.AddScoped<Icustomerbillbl, custbillbl>();
            services.AddScoped<Icustomerbilldl, Custbilldl>();
        }
    }
}