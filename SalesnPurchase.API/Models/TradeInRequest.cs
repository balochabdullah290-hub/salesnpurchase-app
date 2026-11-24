using System;

namespace SalesnPurchase.API.Models
{
    public class TradeInRequest
    {
        public int Id { get; set; }
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string PtaStatus { get; set; } = string.Empty;
        public int BatteryHealth { get; set; }
        public string Condition { get; set; } = string.Empty;
        public bool HasBox { get; set; }
        public decimal EstimatedMinPKR { get; set; }
        public decimal EstimatedMaxPKR { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;

        // Stores JSON stringified array of image URLs
        public string PhotoUrlsJson { get; set; } = "[]";

        public decimal? FinalQuotationPKR { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}