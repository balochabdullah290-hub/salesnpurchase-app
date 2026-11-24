using System;

namespace SalesnPurchase.API.Models
{
    public class DigitalInvoice
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;

        // "BUY" (Customer se khareed), "SELL" (Customer ko bech), "TRADE_IN" (Exchange/Trade-in)
        public string TransactionType { get; set; } = "SELL";

        // Shop & Customer Details
        public string ShopName { get; set; } = "SalesnPurchase";
        public string ShopContact { get; set; } = "Islamabad & Rawalpindi";
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerCity { get; set; }

        // Device Specs & Rate
        public string DeviceModel { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string PtaStatus { get; set; } = string.Empty; // PTA Approved, Non-PTA, JV
        public string ImeiNumber { get; set; } = string.Empty;
        public decimal RatePKR { get; set; }

        // Trade-In / Buy Mandatory CNIC Details
        public string? CnicNumber { get; set; }
        public string? CnicImageUrl { get; set; } // e.g. /uploads/cnic/cnic_abc123.jpg

        // Optional Trade-In Extra Details
        public string? TradeInDeviceDetails { get; set; }
        public string? Notes { get; set; }

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}