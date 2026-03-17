using MedicineShop.BL.Models;
using System.Collections.Generic;

namespace MedicineShop.DL
{
    public interface IBatchItemsDl
    {
        bool AddBatchItem(BatchItems b);
        bool DeleteBatchItem(int id);
        List<BatchItems> GetAllBatchItems();
        List<BatchItems> GetBatchItemById(int id);
        List<BatchItems> SearchBatchItems(string searchTerm);
        bool UpdateBatchItem(BatchItems b);
    }
}