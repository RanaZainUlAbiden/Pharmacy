using MedicineShop.DL;
using MedicineShop.Models;
using System;

namespace MedicineShop.BL
{
    public class CategoryBL
    {
        private readonly CategoryDL _categoryDL = new CategoryDL();

        public int AddCategory(Category category)
        {
            if (string.IsNullOrWhiteSpace(category.CategoryName))
                throw new Exception("Category name is required.");

            // Extra validation: must be at least 3 characters
            if (category.CategoryName.Length < 3)
                throw new Exception("Category name must be at least 3 characters long.");

            return _categoryDL.AddCategory(category);
        }
    }
}
