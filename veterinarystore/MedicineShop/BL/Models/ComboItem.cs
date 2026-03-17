namespace MedicineShop.Models
{
    public class ComboItem
    {
        public int Id { get; set; }
        public string Name { get; set; }

        // So ComboBox displays the name
        public override string ToString()
        {
            return Name;
        }
    }
}
