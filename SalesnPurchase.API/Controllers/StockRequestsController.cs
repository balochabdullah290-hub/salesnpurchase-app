using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;

namespace SalesnPurchase.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StockRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        private static string? _resolvedStockAlertEndpoint;

        public StockRequestsController(
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

            if (!string.IsNullOrEmpty(_resolvedStockAlertEndpoint))
            {
                candidates.Add(_resolvedStockAlertEndpoint);
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
                Debug.WriteLine($"[StockAlert Model Discovery Error]: {ex.Message}");
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

        private static string BuildFallbackMessage(StockRequest request, string? matchingStockSummary)
        {
            var name = string.IsNullOrWhiteSpace(request.CustomerName) ? "there" : request.CustomerName.Trim();
            var item = string.IsNullOrWhiteSpace(request.RequestedItem) ? "your requested device" : request.RequestedItem.Trim();
            var statusLower = (request.Status ?? "").ToLowerInvariant();

            if (statusLower.Contains("arranged") || statusLower.Contains("fulfilled"))
            {
                var stockNote = string.IsNullOrWhiteSpace(matchingStockSummary)
                    ? ""
                    : $" Matching stock option: {matchingStockSummary}.";
                return $"Assalam-o-Alaikum {name}, great news from SalesnPurchase! Your requested item ({item}) is now arranged/available.{stockNote} Safe meetup & inspection available in Islamabad (F-7 / I-8 Markaz) & Rawalpindi (Commercial Market). Please reply to lock your deal.";
            }

            return $"Assalam-o-Alaikum {name}, this is SalesnPurchase regarding your 1–2 day sourcing request for {item}. Our team is actively tracking availability and will update you shortly. Meetup/delivery available across Islamabad & Rawalpindi.";
        }

        // GET: api/StockRequests
        // Latest leads first (Pending leads at top)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<StockRequest>>> GetStockRequests()
        {
            var requests = await _context.StockRequests
                .AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        // POST: api/StockRequests/{id}/whatsapp-draft
        [HttpPost("{id}/whatsapp-draft")]
        public async Task<IActionResult> GenerateWhatsAppDraft(int id, [FromBody] GenerateWhatsAppDraftRequest? body)
        {
            var request = await _context.StockRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
            if (request == null)
            {
                return NotFound(new { message = "Stock request not found." });
            }

            string? matchingStockSummary = null;
            if (!string.IsNullOrWhiteSpace(request.RequestedItem))
            {
                var keywords = request.RequestedItem
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(w => w.Length >= 3)
                    .Take(3)
                    .ToList();

                if (keywords.Count > 0)
                {
                    var products = await _context.Products
                        .AsNoTracking()
                        .Where(p => p.InStock)
                        .Take(40)
                        .ToListAsync();

                    var matched = products.FirstOrDefault(p =>
                        keywords.All(k => p.Title.Contains(k, StringComparison.OrdinalIgnoreCase)));

                    if (matched != null)
                    {
                        matchingStockSummary = $"{matched.Title} ({matched.Storage ?? "Standard"}) - PKR {matched.PricePKR:N0}";
                    }
                }
            }

            var fallbackMessage = BuildFallbackMessage(request, matchingStockSummary);
            var apiKey = (_configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return Ok(new
                {
                    message = fallbackMessage,
                    matchingStock = matchingStockSummary,
                    source = "template"
                });
            }

            var systemInstruction = @"
You are a WhatsApp customer follow-up assistant for 'SalesnPurchase', a mobile & Apple device seller in Islamabad & Rawalpindi, Pakistan.
Write a polite, natural, concise WhatsApp message (suitable for copy-pasting or opening in WhatsApp) based on the customer's stock request and current status.
Return ONLY valid JSON:
{
  ""message"": ""string""
}
Rules:
- Keep it friendly, clear, and under 4 short lines.
- Include customer name (if not Guest), requested item, and relevant next step (restock/arranged alert or 1-2 day sourcing follow-up).
- Mention Islamabad / Rawalpindi meetup or delivery naturally when appropriate.
- Do not use markdown asterisks unless light emphasis is natural, and avoid robotic phrasing.";

            var promptPayload = $@"
Customer Name: {request.CustomerName}
Customer Phone: {request.CustomerPhone}
Requested Item: {request.RequestedItem}
Current Status: {request.Status}
Matching In-Stock Product: {matchingStockSummary ?? "None found yet"}
Admin Extra Note: {body?.ExtraNote ?? "None"}";

            var geminiBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[]
                {
                    new { parts = new[] { new { text = promptPayload.Trim() } } }
                },
                generationConfig = new
                {
                    temperature = 0.3,
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
                            using var draftDoc = JsonDocument.Parse(cleanJson);
                            if (draftDoc.RootElement.TryGetProperty("message", out var msgProp))
                            {
                                var aiMsg = msgProp.GetString();
                                if (!string.IsNullOrWhiteSpace(aiMsg))
                                {
                                    _resolvedStockAlertEndpoint = endpoint;
                                    return Ok(new
                                    {
                                        message = aiMsg.Trim(),
                                        matchingStock = matchingStockSummary,
                                        source = "ai"
                                    });
                                }
                            }
                        }
                    }
                    else if (_resolvedStockAlertEndpoint == endpoint)
                    {
                        _resolvedStockAlertEndpoint = null;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[StockAlert Draft Attempt Exception]: {ex.Message}");
                }
            }

            return Ok(new
            {
                message = fallbackMessage,
                matchingStock = matchingStockSummary,
                source = "template"
            });
        }

        // PATCH: api/StockRequests/{id}/status
        // Update status e.g. "Arranged", "Fulfilled", "Cancelled"
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStockRequestStatusDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Status))
            {
                return BadRequest(new { message = "Status is required." });
            }

            var request = await _context.StockRequests.FindAsync(id);
            if (request == null)
            {
                return NotFound(new { message = "Stock request not found." });
            }

            request.Status = dto.Status.Trim();
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Lead status updated successfully.",
                data = request
            });
        }

        // DELETE: api/StockRequests/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStockRequest(int id)
        {
            var request = await _context.StockRequests.FindAsync(id);
            if (request == null)
            {
                return NotFound(new { message = "Stock request not found." });
            }

            _context.StockRequests.Remove(request);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Stock request removed." });
        }
    }

    public class GenerateWhatsAppDraftRequest
    {
        public string? ExtraNote { get; set; }
    }

    public class UpdateStockRequestStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}