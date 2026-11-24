using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;

namespace SalesnPurchase.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DailySummaryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        private static string? _resolvedSummaryEndpoint;

        public DailySummaryController(
            AppDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        private async Task<List<string>> GetCandidateEndpointsAsync(HttpClient client, string apiKey)
        {
            var candidates = new List<string>();

            if (!string.IsNullOrEmpty(_resolvedSummaryEndpoint))
            {
                candidates.Add(_resolvedSummaryEndpoint);
            }

            try
            {
                var listUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";
                var response = await client.GetAsync(listUrl);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);

                    var availableModels = new List<string>();
                    foreach (var model in doc.RootElement.GetProperty("models").EnumerateArray())
                    {
                        var name = model.GetProperty("name").GetString() ?? "";
                        if (model.TryGetProperty("supportedGenerationMethods", out var methods))
                        {
                            bool supportsGenerate = methods.EnumerateArray()
                                .Any(m => m.GetString() == "generateContent");

                            if (supportsGenerate && name.Contains("gemini", StringComparison.OrdinalIgnoreCase))
                            {
                                availableModels.Add(name);
                            }
                        }
                    }

                    var orderedModels = availableModels
                        .OrderByDescending(m => m.Contains("3.8-flash"))
                        .ThenByDescending(m => m.Contains("flash") && !m.Contains("lite"))
                        .ThenByDescending(m => m.Contains("flash"))
                        .ToList();

                    foreach (var m in orderedModels)
                    {
                        var url = $"https://generativelanguage.googleapis.com/v1beta/{m}:generateContent?key={apiKey}";
                        if (!candidates.Contains(url))
                        {
                            candidates.Add(url);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[DailySummary Model Discovery Error]: {ex.Message}");
            }

            var defaults = new[]
            {
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={apiKey}",
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}",
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}"
            };

            foreach (var fallbackUrl in defaults)
            {
                if (!candidates.Contains(fallbackUrl))
                {
                    candidates.Add(fallbackUrl);
                }
            }

            return candidates;
        }

        private static string ExtractJsonObject(string raw)
        {
            var trimmed = raw.Trim();
            if (trimmed.StartsWith("```"))
            {
                var firstNewLine = trimmed.IndexOf('\n');
                if (firstNewLine >= 0)
                {
                    trimmed = trimmed[(firstNewLine + 1)..];
                }
                if (trimmed.EndsWith("```"))
                {
                    trimmed = trimmed[..^3];
                }
                trimmed = trimmed.Trim();
            }

            int start = trimmed.IndexOf('{');
            int end = trimmed.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                return trimmed[start..(end + 1)];
            }

            return trimmed;
        }

        // GET: api/DailySummary/today
        [HttpGet("today")]
        public async Task<IActionResult> GetTodaySummary()
        {
            var nowUtc = DateTime.UtcNow;
            var todayStartUtc = nowUtc.Date;
            var tomorrowStartUtc = todayStartUtc.AddDays(1);

            var todayInvoices = await _context.DigitalInvoices
                .AsNoTracking()
                .Where(i => i.TransactionDate >= todayStartUtc && i.TransactionDate < tomorrowStartUtc)
                .ToListAsync();

            var sellCount = todayInvoices.Count(i => string.Equals(i.TransactionType, "SELL", StringComparison.OrdinalIgnoreCase));
            var buyCount = todayInvoices.Count(i => string.Equals(i.TransactionType, "BUY", StringComparison.OrdinalIgnoreCase));
            var tradeInCount = todayInvoices.Count(i => string.Equals(i.TransactionType, "TRADE_IN", StringComparison.OrdinalIgnoreCase));

            var sellTotalPkr = todayInvoices
                .Where(i => string.Equals(i.TransactionType, "SELL", StringComparison.OrdinalIgnoreCase))
                .Sum(i => i.RatePKR);

            var buyAndTradeInTotalPkr = todayInvoices
                .Where(i => string.Equals(i.TransactionType, "BUY", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(i.TransactionType, "TRADE_IN", StringComparison.OrdinalIgnoreCase))
                .Sum(i => i.RatePKR);

            var allStockRequests = await _context.StockRequests
                .AsNoTracking()
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

            var pendingStockCount = allStockRequests.Count(s => (s.Status ?? "").Contains("pending", StringComparison.OrdinalIgnoreCase));
            var arrangedStockCount = allStockRequests.Count(s =>
                (s.Status ?? "").Contains("arranged", StringComparison.OrdinalIgnoreCase) ||
                (s.Status ?? "").Contains("fulfilled", StringComparison.OrdinalIgnoreCase));

            var recentStockItems = allStockRequests
                .Take(5)
                .Select(s => $"{s.RequestedItem} ({s.Status})")
                .ToList();

            var todayPreOrdersCount = await _context.PreOrders
                .AsNoTracking()
                .CountAsync(p => p.CreatedAt >= todayStartUtc && p.CreatedAt < tomorrowStartUtc);

            var todayTradeInRequestsCount = await _context.TradeInRequests
                .AsNoTracking()
                .CountAsync(t => t.CreatedAt >= todayStartUtc && t.CreatedAt < tomorrowStartUtc);

            var metrics = new
            {
                dateUtc = todayStartUtc.ToString("yyyy-MM-dd"),
                totalInvoicesToday = todayInvoices.Count,
                sellCount,
                buyCount,
                tradeInCount,
                sellTotalPkr,
                buyAndTradeInTotalPkr,
                pendingStockCount,
                arrangedStockCount,
                todayPreOrdersCount,
                todayTradeInRequestsCount
            };

            var fallbackSummary =
                $"Today ({metrics.dateUtc}): {metrics.totalInvoicesToday} digital invoices logged ({sellCount} SELL worth PKR {sellTotalPkr:N0}, {buyCount} BUY, {tradeInCount} TRADE-IN worth PKR {buyAndTradeInTotalPkr:N0}). " +
                $"Stock leads: {pendingStockCount} pending (1–2 days) and {arrangedStockCount} arranged/fulfilled. " +
                $"Today's incoming inquiries: {todayPreOrdersCount} pre-orders and {todayTradeInRequestsCount} trade-in requests.";

            var fallbackActions = new List<string>();
            if (pendingStockCount > 0)
            {
                fallbackActions.Add($"Follow up on {pendingStockCount} pending 1–2 day stock request(s) and send WhatsApp updates.");
            }
            if (tradeInCount > 0 || buyCount > 0)
            {
                fallbackActions.Add("Verify CNIC details and physical device inspection notes for today's Buy / Trade-In deals.");
            }
            if (fallbackActions.Count == 0)
            {
                fallbackActions.Add("Check live inventory stock levels and follow up on any open pre-orders or customer chats.");
            }

            var apiKey = (_configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return Ok(new
                {
                    metrics,
                    summary = fallbackSummary,
                    nextActions = fallbackActions,
                    source = "metrics"
                });
            }

            var recentModels = todayInvoices
                .OrderByDescending(i => i.TransactionDate)
                .Take(8)
                .Select(i => $"{i.TransactionType}: {i.DeviceModel} ({i.Storage}) - PKR {i.RatePKR:N0}")
                .ToList();

            var systemInstruction = @"
You are an operations analyst for 'SalesnPurchase', a mobile & Apple device business in Islamabad & Rawalpindi, Pakistan.
Summarize today's sales, deals, and sourcing leads clearly and concisely for the store owner.
Return ONLY valid JSON matching this exact structure:
{
  ""summary"": ""string"",
  ""nextActions"": [""string"", ""string""]
}
Rules:
- Keep 'summary' concise (3-4 short sentences) using exact numbers provided.
- Keep 'nextActions' to 2-3 practical, short action items based on today's numbers and pending stock leads.
- Do not invent numbers that were not provided.";

            var promptPayload = $@"
Date (UTC): {metrics.dateUtc}
Digital Invoices Today: {metrics.totalInvoicesToday} (SELL: {sellCount}, BUY: {buyCount}, TRADE_IN: {tradeInCount})
SELL Volume (PKR): {sellTotalPkr:N0}
BUY + TRADE_IN Volume (PKR): {buyAndTradeInTotalPkr:N0}
Today's Pre-Orders: {todayPreOrdersCount}
Today's Trade-In Requests: {todayTradeInRequestsCount}
Stock Requests: {pendingStockCount} Pending (1-2 Days), {arrangedStockCount} Arranged/Fulfilled
Recent Today Deals: {(recentModels.Count > 0 ? string.Join("; ", recentModels) : "None yet")}
Recent Stock Leads: {(recentStockItems.Count > 0 ? string.Join("; ", recentStockItems) : "None")}";

            var geminiBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[]
                {
                    new { parts = new[] { new { text = promptPayload.Trim() } } }
                },
                generationConfig = new
                {
                    temperature = 0.25,
                    responseMimeType = "application/json",
                    thinkingConfig = new
                    {
                        thinkingBudget = 0
                    }
                }
            };

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);

            var candidates = await GetCandidateEndpointsAsync(client, apiKey);
            string jsonPayload = JsonSerializer.Serialize(geminiBody);

            foreach (var endpoint in candidates)
            {
                try
                {
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(endpoint, content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        using var doc = JsonDocument.Parse(responseString);
                        var extractedText = doc.RootElement
                            .GetProperty("candidates")[0]
                            .GetProperty("content")
                            .GetProperty("parts")[0]
                            .GetProperty("text")
                            .GetString();

                        if (!string.IsNullOrWhiteSpace(extractedText))
                        {
                            var cleanJson = ExtractJsonObject(extractedText);
                            using var summaryDoc = JsonDocument.Parse(cleanJson);

                            var aiSummary = summaryDoc.RootElement.TryGetProperty("summary", out var sProp)
                                ? sProp.GetString()
                                : null;

                            var aiActions = new List<string>();
                            if (summaryDoc.RootElement.TryGetProperty("nextActions", out var aProp) &&
                                aProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var act in aProp.EnumerateArray())
                                {
                                    var actStr = act.GetString();
                                    if (!string.IsNullOrWhiteSpace(actStr))
                                    {
                                        aiActions.Add(actStr.Trim());
                                    }
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(aiSummary))
                            {
                                _resolvedSummaryEndpoint = endpoint;
                                return Ok(new
                                {
                                    metrics,
                                    summary = aiSummary.Trim(),
                                    nextActions = aiActions.Count > 0 ? aiActions : fallbackActions,
                                    source = "ai"
                                });
                            }
                        }
                    }
                    else if (_resolvedSummaryEndpoint == endpoint)
                    {
                        _resolvedSummaryEndpoint = null;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[DailySummary Attempt Exception]: {ex.Message}");
                }
            }

            return Ok(new
            {
                metrics,
                summary = fallbackSummary,
                nextActions = fallbackActions,
                source = "metrics"
            });
        }
    }
}