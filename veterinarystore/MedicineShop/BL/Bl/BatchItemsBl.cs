using MedicineShop.BL.Models;
using MedicineShop.DL;
using System;
using System.Collections.Generic;

namespace MedicineShop.BL
{
    public class BatchItemsBl : IBatchItemsBl
    {
        private readonly IBatchItemsDl _dl;

        public BatchItemsBl(IBatchItemsDl _dl)
        {
            this._dl = _dl;
        }

        /// <summary>
        /// Adds a new Batch Item after validation.
        /// </summary>
        public bool AddBatchItem(BatchItems b)
        {
            ValidateBatchItem(b);

            return _dl.AddBatchItem(b);
        }

        /// <summary>
        /// Gets all items of a batch by PurchaseBatchId
        /// </summary>
        public List<BatchItems> GetBatchItemsByBatchId(int batchId)
        {
            if (batchId <= 0)
                throw new ArgumentException("Invalid batch ID");

            return _dl.GetBatchItemById(batchId);
        }

        /// <summary>
        /// Searches batch items by medicine name
        /// </summary>
        public List<BatchItems> SearchBatchItems(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                throw new ArgumentException("Search keyword cannot be empty");

            return _dl.SearchBatchItems(keyword);
        }

        /// <summary>
        /// Gets a batch item by its primary ID
        /// </summary>
        public List<BatchItems> GetBatchItemById(int batchItemId)
        {
            if (batchItemId <= 0)
                throw new ArgumentException("Invalid batch item ID");

            return _dl.GetBatchItemById(batchItemId);
        }
        public bool UpdateBatchItem(BatchItems b)
        {
            ValidateBatchItem(b);
            //if (b.BatchItemID <= 0)
            //	throw new ArgumentException("Invalid batch item ID");
            return _dl.UpdateBatchItem(b);
        }
        public bool DeleteBatchItem(int id)
        {
            if (id <= 0)
                throw new ArgumentException("Invalid batch item ID");
            return _dl.DeleteBatchItem(id);
        }
        /// <summary>
        /// Validates business rules for BatchItems
        /// </summary>
        private void ValidateBatchItem(BatchItems b)
        {
            if (b == null)
                throw new ArgumentNullException(nameof(b), "Batch item cannot be null");

            if (b.BatchID <= 0)
                throw new ArgumentException("Invalid purchase batch ID");

            if (b.MedicineID <= 0)
                throw new ArgumentException("Invalid medicine ID");

            if (b.Quantity <= 0)
                throw new ArgumentException("Quantity must be greater than 0");

            if (b.PurchasePrice <= 0)
                throw new ArgumentException("Purchase price must be greater than 0");

            if (b.SalePrice <= 0)
                throw new ArgumentException("Sale price must be greater than 0");

            if (b.ExpiryDate <= DateTime.Now.Date)
                throw new ArgumentException("Expiry date must be in the future");
        }
    }
}
