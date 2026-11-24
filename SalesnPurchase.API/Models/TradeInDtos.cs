using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace SalesnPurchase.API.Models
{
    public class CreateTradeInDto
    {
        public string? Model { get; set; } = string.Empty;
        public string? Storage { get; set; } = string.Empty;
        public string? PtaStatus { get; set; } = string.Empty;
        public string? BatteryHealth { get; set; } = string.Empty;
        public string? Condition { get; set; } = string.Empty;
        public bool HasBox { get; set; }
        public decimal EstimatedMinPKR { get; set; }
        public decimal EstimatedMaxPKR { get; set; }
        public string? CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public List<IFormFile>? Photos { get; set; }
    }

    public class QuoteTradeInDto
    {
        public decimal QuotationPKR { get; set; }
    }

    public class StatusUpdateDto
    {
        public string Status { get; set; } = string.Empty;
    }
}