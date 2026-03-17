using MedicineShop.BL.Models;
using System.Collections.Generic;

namespace MedicineShop.BL
{
    public interface IBatchItemsBl
    {
        bool AddBatchItem(BatchItems b);
        List<BatchItems> GetBatchItemById(int batchItemId);
        List<BatchItems> GetBatchItemsByBatchId(int batchId);
        List<BatchItems> SearchBatchItems(string keyword);
        bool UpdateBatchItem(BatchItems b);
        bool DeleteBatchItem(int batchItemId);
    }
}