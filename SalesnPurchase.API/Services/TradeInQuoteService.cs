using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;

namespace SalesnPurchase.API.Services
{
    public class TradeInRequestDto
    {
        public string Model { get; set; } = string.Empty;         // e.g., "iPhone 13 Pro Max"
        public string Storage { get; set; } = string.Empty;       // e.g., "256GB"
        public string PtaStatus { get; set; } = string.Empty;     // "Approved", "Non-PTA", "JV"
        public int BatteryHealth { get; set; }                    // e.g., 85
        public string BodyCondition { get; set; } = string.Empty; // "Flawless", "Minor Scratch", "Cracked"
        public bool IncludesBoxAndCable { get; set; }
    }

    public class TradeInResultDto
    {
        public decimal EstimatedQuotePKR { get; set; }
        public decimal BaseMarketValuePKR { get; set; }
        public List<string> Adjustments { get; set; } = new();
        public string ValuationSummary { get; set; } = string.Empty;
    }

    public class TradeInQuoteService
    {
        private readonly AppDbContext _db;

        public TradeInQuoteService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<TradeInResultDto> CalculateQuoteAsync(TradeInRequestDto request)
        {
            var result = new TradeInResultDto();

            // Match base pricing from database catalog
            var product = await _db.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Title.Contains(request.Model) && p.Storage == request.Storage);

            // Base market retail reference
            decimal retailPrice = product?.PricePKR ?? 160000m;
            decimal baseValue = retailPrice * 0.82m; // Standard trade buyback rate (82% of selling price)
            result.BaseMarketValuePKR = Math.Round(baseValue, 0);

            decimal finalQuote = baseValue;

            // 1. PTA Category Adjustments
            if (request.PtaStatus.Equals("Non-PTA", StringComparison.OrdinalIgnoreCase))
            {
                finalQuote -= 35000;
                result.Adjustments.Add("Non-PTA tax differential (-PKR 35,000)");
            }
            else if (request.PtaStatus.Equals("JV", StringComparison.OrdinalIgnoreCase))
            {
                finalQuote -= 50000;
                result.Adjustments.Add("JV / Carrier Locked lock deduction (-PKR 50,000)");
            }

            // 2. Battery Health Adjustments
            if (request.BatteryHealth < 80)
            {
                finalQuote -= 12000;
                result.Adjustments.Add("Battery Health under 80% (-PKR 12,000)");
            }
            else if (request.BatteryHealth < 85)
            {
                finalQuote -= 5000;
                result.Adjustments.Add("Battery Health 80-84% (-PKR 5,000)");
            }

            // 3. Cosmetic Condition Adjustments
            switch (request.BodyCondition.ToLower())
            {
                case "minor scratch":
                    finalQuote -= 8000;
                    result.Adjustments.Add("Minor cosmetic wear (-PKR 8,000)");
                    break;
                case "cracked":
                    finalQuote -= 25000;
                    result.Adjustments.Add("Display or back glass damage (-PKR 25,000)");
                    break;
            }

            // 4. Box & Accessories Bonus
            if (request.IncludesBoxAndCable)
            {
                finalQuote += 4000;
                result.Adjustments.Add("Original Box & Cable bonus (+PKR 4,000)");
            }

            result.EstimatedQuotePKR = Math.Max(Math.Round(finalQuote, 0), 15000);
            result.ValuationSummary = $"Estimated Trade Value: PKR {result.EstimatedQuotePKR:N0}. " +
                                       "Final inspection and instant cash payment available at F-7 Markaz, I-8 Markaz, or Commercial Market!";

            return result;
        }
    }
}