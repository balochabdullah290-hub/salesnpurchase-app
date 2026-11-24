namespace SalesnPurchase.API.Models
{
    public class StockRequest
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = "Guest";
        public string CustomerPhone { get; set; } = string.Empty;
        public string RequestedItem { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending (1-2 Days)";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}