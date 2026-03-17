using System.Collections.Generic;

namespace MedicineShop.BL
{
    public interface IBatchesBl
    {
        bool AddBatch(Batches batch);
        bool DeleteBatch(int id);
        List<Batches> GetAllBatches();
        Batches GetBatchById(int id);
        List<Batches> SearchBatches(string searchTerm);
        bool UpdateBatch(Batches batch);
    }
}