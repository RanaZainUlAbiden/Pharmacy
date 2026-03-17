using MedicineShop.BL;
using System.Collections.Generic;
using System.Data;

namespace MedicineShop.DL
{
    public interface IBatchesDl
    {
        bool AddBatch(Batches batch);
        bool DeleteBatch(int id);
        List<Batches> GetAllBatches();
        Batches GetBatchById(int id);
        DataTable GetMedicines();
        List<Batches> SearchBatches(string searchTerm);
        bool UpdateBatch(Batches batch);
    }
}