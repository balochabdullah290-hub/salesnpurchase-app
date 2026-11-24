using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;

namespace SalesnPurchase.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/TradeIn")]
    public class TradeInsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public TradeInsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // Pricing Configuration dictionary for reference/valuation
        private static readonly Dictionary<string, (decimal basePrice, string[] storages)> PricingConfig = new()
        {
            ["iPhone 11"] = (95000, new[] { "64GB", "128GB", "256GB" }),
            ["iPhone 11 Pro Max"] = (125000, new[] { "64GB", "256GB", "512GB" }),
            ["iPhone 12"] = (120000, new[] { "64GB", "128GB", "256GB" }),
            ["iPhone 12 Pro Max"] = (165000, new[] { "128GB", "256GB", "512GB" }),
            ["iPhone 13"] = (155000, new[] { "128GB", "256GB", "512GB" }),
            ["iPhone 13 Pro"] = (205000, new[] { "128GB", "256GB", "512GB", "1TB" }),
            ["iPhone 13 Pro Max"] = (235000, new[] { "128GB", "256GB", "512GB", "1TB" }),
            ["iPhone 14"] = (185000, new[] { "128GB", "256GB", "512GB" }),
            ["iPhone 14 Pro"] = (255000, new[] { "128GB", "256GB", "512GB", "1TB" }),
            ["iPhone 14 Pro Max"] = (295000, new[] { "128GB", "256GB", "512GB", "1TB" }),
            ["iPhone 15"] = (230000, new[] { "128GB", "256GB", "512GB" }),
            ["iPhone 15 Pro"] = (320000, new[] { "128GB", "256GB", "512GB", "1TB" }),
            ["iPhone 15 Pro Max"] = (380000, new[] { "256GB", "512GB", "1TB" }),
            ["iPhone 16 Pro Max"] = (450000, new[] { "256GB", "512GB", "1TB" })
        };

        // GET: api/TradeIns/config or api/TradeIn/config
        [HttpGet("config")]
        public IActionResult GetPricingConfig()
        {
            var config = PricingConfig.ToDictionary(
                kvp => kvp.Key,
                kvp => (object)new { basePrice = kvp.Value.basePrice, storages = kvp.Value.storages }
            );

            return Ok(config);
        }

        // POST: api/TradeIns/calculate-quote
        [HttpPost("calculate-quote")]
        public async Task<IActionResult> CalculateQuote([FromBody] TradeInQuoteRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Model))
            {
                return BadRequest("Invalid quote calculation request.");
            }

            // Check database product or fallback to static pricing dictionary
            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Title.Contains(request.Model) && p.Storage == request.Storage);

            decimal baseValuation = product?.PricePKR ?? 0;
            if (baseValuation == 0 && PricingConfig.TryGetValue(request.Model, out var configData))
            {
                baseValuation = configData.basePrice;
            }
            if (baseValuation == 0)
            {
                baseValuation = 150000m; // Default floor fallback
            }

            decimal estimatedQuote = baseValuation * 0.82m; // 82% standard buyback rate
            var adjustments = new List<string>();

            // PTA Adjustments
            if (!string.IsNullOrEmpty(request.PtaStatus))
            {
                if (request.PtaStatus.Equals("Non-PTA", StringComparison.OrdinalIgnoreCase))
                {
                    estimatedQuote -= 35000;
                    adjustments.Add("Non-PTA adjustment (-PKR 35,000)");
                }
                else if (request.PtaStatus.Equals("JV", StringComparison.OrdinalIgnoreCase))
                {
                    estimatedQuote -= 50000;
                    adjustments.Add("JV / Carrier Locked adjustment (-PKR 50,000)");
                }
            }

            // Battery Health Adjustments
            if (request.BatteryHealth < 80)
            {
                estimatedQuote -= 12000;
                adjustments.Add("Battery Health < 80% (-PKR 12,000)");
            }
            else if (request.BatteryHealth < 85)
            {
                estimatedQuote -= 5000;
                adjustments.Add("Battery Health 80-84% (-PKR 5,000)");
            }

            // Cosmetic Condition Adjustments
            if (!string.IsNullOrEmpty(request.Condition))
            {
                var cond = request.Condition.ToLower();
                if (cond.Contains("scratch") || cond.Contains("minor"))
                {
                    estimatedQuote -= 8000;
                    adjustments.Add("Minor cosmetic wear (-PKR 8,000)");
                }
                else if (cond.Contains("crack") || cond.Contains("damage"))
                {
                    estimatedQuote -= 25000;
                    adjustments.Add("Glass/Display damage (-PKR 25,000)");
                }
            }

            // Box Bonus
            if (request.HasBox)
            {
                estimatedQuote += 4000;
                adjustments.Add("Original Box included (+PKR 4,000)");
            }

            decimal finalMin = Math.Max(Math.Round(estimatedQuote - 5000, -3), 10000);
            decimal finalMax = Math.Max(Math.Round(estimatedQuote + 5000, -3), 15000);

            return Ok(new
            {
                EstimatedMinPKR = finalMin,
                EstimatedMaxPKR = finalMax,
                BaseMarketValuePKR = baseValuation,
                Adjustments = adjustments,
                Message = $"Estimated Trade Value: PKR {finalMin:N0} - {finalMax:N0}"
            });
        }

        // GET: api/TradeIns or api/TradeIn
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var requests = await _context.TradeInRequests
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var result = requests.Select(r => new
                {
                    r.Id,
                    r.Model,
                    r.Storage,
                    r.PtaStatus,
                    r.BatteryHealth,
                    r.Condition,
                    r.HasBox,
                    r.EstimatedMinPKR,
                    r.EstimatedMaxPKR,
                    r.CustomerName,
                    r.CustomerPhone,
                    r.CustomerEmail,
                    PhotoUrls = SafeDeserializePhotos(r.PhotoUrlsJson),
                    r.FinalQuotationPKR,
                    Status = string.IsNullOrEmpty(r.Status) ? "PENDING" : r.Status,
                    r.CreatedAt
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching trade-in requests.", details = ex.Message });
            }
        }

        // POST: api/TradeIns or api/TradeIn
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] CreateTradeInDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (dto == null)
            {
                return BadRequest("Invalid trade-in request payload.");
            }

            try
            {
                var uploadedUrls = new List<string>();

                if (dto.Photos != null && dto.Photos.Count > 0)
                {
                    var webRoot = _env.WebRootPath;
                    if (string.IsNullOrEmpty(webRoot))
                    {
                        webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    }

                    var uploadFolder = Path.Combine(webRoot, "uploads", "tradeins");
                    if (!Directory.Exists(uploadFolder))
                    {
                        Directory.CreateDirectory(uploadFolder);
                    }

                    foreach (var file in dto.Photos)
                    {
                        if (file != null && file.Length > 0)
                        {
                            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                            var filePath = Path.Combine(uploadFolder, fileName);

                            using (var stream = new FileStream(filePath, FileMode.Create))
                            {
                                await file.CopyToAsync(stream);
                            }

                            var baseUrl = $"{Request.Scheme}://{Request.Host}";
                            uploadedUrls.Add($"{baseUrl}/uploads/tradeins/{fileName}");
                        }
                    }
                }

                int parsedBatteryHealth = 0;
                if (dto.BatteryHealth != null)
                {
                    int.TryParse(dto.BatteryHealth.ToString(), out parsedBatteryHealth);
                }

                var tradeIn = new TradeInRequest
                {
                    Model = dto.Model ?? string.Empty,
                    Storage = dto.Storage ?? string.Empty,
                    PtaStatus = dto.PtaStatus ?? string.Empty,
                    BatteryHealth = parsedBatteryHealth,
                    Condition = dto.Condition ?? string.Empty,
                    HasBox = dto.HasBox,
                    EstimatedMinPKR = dto.EstimatedMinPKR,
                    EstimatedMaxPKR = dto.EstimatedMaxPKR,
                    CustomerName = dto.CustomerName ?? string.Empty,
                    CustomerPhone = dto.CustomerPhone ?? string.Empty,
                    CustomerEmail = dto.CustomerEmail ?? string.Empty,
                    PhotoUrlsJson = JsonSerializer.Serialize(uploadedUrls),
                    Status = "PENDING",
                    CreatedAt = DateTime.UtcNow
                };

                _context.TradeInRequests.Add(tradeIn);
                await _context.SaveChangesAsync();

                return Ok(tradeIn);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating trade-in request.", details = ex.Message });
            }
        }

        // POST: api/TradeIns/{id}/quote
        [HttpPost("{id}/quote")]
        public async Task<IActionResult> SendQuote(int id, [FromBody] QuoteTradeInDto dto)
        {
            if (dto == null) return BadRequest("Invalid quotation data.");

            try
            {
                var tradeIn = await _context.TradeInRequests.FindAsync(id);
                if (tradeIn == null) return NotFound("Trade-in request not found.");

                tradeIn.FinalQuotationPKR = dto.QuotationPKR;
                tradeIn.Status = "QUOTED";

                await _context.SaveChangesAsync();

                return Ok(new { Message = "Quotation updated successfully.", TradeIn = tradeIn });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating quotation.", details = ex.Message });
            }
        }

        // PUT: api/TradeIns/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateDto dto)
        {
            if (dto == null) return BadRequest("Invalid status data.");

            try
            {
                var tradeIn = await _context.TradeInRequests.FindAsync(id);
                if (tradeIn == null) return NotFound("Trade-in request not found.");

                tradeIn.Status = dto.Status;
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Status updated successfully.", TradeIn = tradeIn });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating status.", details = ex.Message });
            }
        }

        // DELETE: api/TradeIns/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var tradeIn = await _context.TradeInRequests.FindAsync(id);
                if (tradeIn == null) return NotFound("Trade-in request not found.");

                _context.TradeInRequests.Remove(tradeIn);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Trade-in request deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting trade-in request.", details = ex.Message });
            }
        }

        private static List<string> SafeDeserializePhotos(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }
    }

    #region Data Transfer Objects (DTOs)
    public class TradeInQuoteRequestDto
    {
        public string Model { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string PtaStatus { get; set; } = string.Empty;
        public int BatteryHealth { get; set; }
        public string Condition { get; set; } = string.Empty;
        public bool HasBox { get; set; }
    }

    public class CreateTradeInDto
    {
        public string? Model { get; set; }
        public string? Storage { get; set; }
        public string? PtaStatus { get; set; }
        public object? BatteryHealth { get; set; }
        public string? Condition { get; set; }
        public bool HasBox { get; set; }
        public decimal EstimatedMinPKR { get; set; }
        public decimal EstimatedMaxPKR { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
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
    #endregion
}