using System;

namespace SalesnPurchase.API.Models
{
    public class PreOrder
    {
        public int Id { get; set; }
        public Guid? ProductId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING";
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Product? Product { get; set; }
    }
}