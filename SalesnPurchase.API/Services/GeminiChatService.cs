using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;

namespace SalesnPurchase.API.Services
{
    public class GeminiChatService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly IServiceScopeFactory _scopeFactory;

        private static string? _cachedCatalogJson;
        private static DateTime _cacheExpiration = DateTime.MinValue;
        private static string? _resolvedModelEndpoint;

        public GeminiChatService(HttpClient httpClient, IConfiguration config, IServiceScopeFactory scopeFactory)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(15);
            _apiKey = (config["Gemini:ApiKey"] ?? string.Empty).Trim();
            _scopeFactory = scopeFactory;
        }

        private async Task<List<string>> GetCandidateEndpointsAsync()
        {
            var candidates = new List<string>();

            if (!string.IsNullOrEmpty(_resolvedModelEndpoint))
            {
                candidates.Add(_resolvedModelEndpoint);
            }

            try
            {
                var listUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={_apiKey}";
                var response = await _httpClient.GetAsync(listUrl);

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
                        var url = $"https://generativelanguage.googleapis.com/v1beta/{m}:generateContent?key={_apiKey}";
                        if (!candidates.Contains(url))
                        {
                            candidates.Add(url);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[Model Discovery Error]: {ex.Message}");
            }

            var defaults = new[]
            {
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={_apiKey}",
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_apiKey}",
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}"
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

        private async Task<string> ProcessLeadCaptureAsync(string reply, string userMessage)
        {
            var match = Regex.Match(reply, @"\[LEAD:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                return reply.Trim();
            }

            string rawTag = match.Groups[1].Value.Trim();
            string cleanedReply = Regex.Replace(reply, @"\[LEAD:\s*[^\]]+\]", "", RegexOptions.IgnoreCase).Trim();

            try
            {
                // Expected format inside tag: Phone | CustomerName | RequestedItem
                var parts = rawTag.Split('|');
                string phone = parts.Length > 0 ? parts[0].Trim() : "";
                string customerName = parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]) ? parts[1].Trim() : "Guest";
                string requestedItem = parts.Length > 2 && !string.IsNullOrWhiteSpace(parts[2]) ? parts[2].Trim() : userMessage.Trim();

                if (!string.IsNullOrWhiteSpace(phone) || !string.IsNullOrWhiteSpace(requestedItem))
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var stockRequest = new StockRequest
                    {
                        CustomerName = customerName,
                        CustomerPhone = phone,
                        RequestedItem = requestedItem,
                        Status = "Pending (1-2 Days)",
                        CreatedAt = DateTime.UtcNow
                    };

                    db.StockRequests.Add(stockRequest);
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[StockRequest Save Error]: {ex.Message}");
            }

            return cleanedReply;
        }

        public async Task<string> GetAiResponseAsync(string userMessage)
        {
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return "Gemini API key is missing or invalid in appsettings.json.";
            }

            try
            {
                // 1. Fetch & cache live inventory safely (uses only guaranteed Product columns)
                if (_cachedCatalogJson == null || DateTime.UtcNow > _cacheExpiration)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var liveProducts = await db.Products
                        .AsNoTracking()
                        .Select(p => new
                        {
                            p.Title,
                            p.PricePKR,
                            p.Storage,
                            p.Category
                        })
                        .Take(35)
                        .ToListAsync();

                    _cachedCatalogJson = JsonSerializer.Serialize(liveProducts);
                    _cacheExpiration = DateTime.UtcNow.AddMinutes(5);
                }

                // 2. System instructions preserving all autonomous agent capabilities + 1-2 day lead capture
                string promptText = $@"You are 'SalesnPurchase AI Agent', an intelligent sales & operations assistant for an Apple flagship store in Islamabad & Rawalpindi.
Answer the customer's exact question naturally, accurately, and concisely using the LIVE INVENTORY below.

LIVE INVENTORY CATALOG:
{_cachedCatalogJson}

Customer Message: ""{userMessage}""

STRICT RULES:
1. DIRECT ANSWERS: Answer what the customer actually asked. Never give canned stock replies to unrelated questions (like greetings or general chat).
2. STOCK, PRICING & OUT-OF-STOCK LEAD CAPTURE:
   - If asked about availability or price of any product (e.g. iPhone 11, iPhone 12, 15 Pro, AirPods, Watch), search LIVE INVENTORY CATALOG. List matching models with Storage and PKR Price.
   - If an item is NOT in LIVE INVENTORY CATALOG, do NOT reject the customer or just send them away. Tell them we can arrange it within 1 to 2 days (24-48 hours) and ask for their name, phone number, and exact requirement (model, storage, PTA/condition) so our admin team can lock their request and fulfill the order.
   - Whenever the customer shares a phone number/contact or confirms a requested item that needs arranging, append this tag at the VERY END of your reply:
     [LEAD: PhoneNumber | CustomerName | RequestedItem]
     (Use 'Guest' if name is not given, and include model/storage/details in RequestedItem).
3. TRADE-IN & SELLING: If the customer wants to sell/trade in a device and gives specs (model, storage, battery health, cracks, PTA status), give a helpful rough market estimate in PKR and invite them to submit their details in the Trade-In portal.
4. AUTONOMOUS UI NAVIGATION (Append the full action tag at the VERY END of your reply ONLY when triggered):
   - If the user asks to open the Trade-In portal, sell a phone, or go to trade-in (e.g. 'open trade in', 'take me to portal', 'sell my iphone'): append [ACTION:NAVIGATE_TRADEIN]
   - If the user asks to track an order or check delivery status: append [ACTION:NAVIGATE_TRACKER]
   - If the user asks to calculate PTA tax or open the PTA calculator: append [ACTION:NAVIGATE_CALCULATOR]
5. MEETUPS & LANGUAGE: Mention safe face-to-face meetups in Islamabad (F-7 Markaz, I-8 Markaz) and Rawalpindi (Commercial Market) when relevant. Reply in the same language as the user (English, Urdu, or Roman Urdu). Keep replies under 3 short sentences.";

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = promptText }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.4,
                        maxOutputTokens = 1500,
                        thinkingConfig = new
                        {
                            thinkingBudget = 0
                        }
                    }
                };

                string jsonPayload = JsonSerializer.Serialize(requestBody);
                var candidateEndpoints = await GetCandidateEndpointsAsync();
                string lastErrorResponse = string.Empty;

                foreach (var endpoint in candidateEndpoints)
                {
                    try
                    {
                        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                        var response = await _httpClient.PostAsync(endpoint, content);
                        string responseString = await response.Content.ReadAsStringAsync();

                        if (response.IsSuccessStatusCode)
                        {
                            using var doc = JsonDocument.Parse(responseString);
                            var reply = doc.RootElement
                                .GetProperty("candidates")[0]
                                .GetProperty("content")
                                .GetProperty("parts")[0]
                                .GetProperty("text")
                                .GetString();

                            if (!string.IsNullOrWhiteSpace(reply))
                            {
                                _resolvedModelEndpoint = endpoint;
                                return await ProcessLeadCaptureAsync(reply, userMessage);
                            }
                        }
                        else
                        {
                            lastErrorResponse = responseString;
                            if (_resolvedModelEndpoint == endpoint)
                            {
                                _resolvedModelEndpoint = null;
                            }
                            Debug.WriteLine($"[Gemini Endpoint Skipped ({response.StatusCode})]: {responseString}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[Endpoint Attempt Exception]: {ex.Message}");
                    }
                }

                return $"API Error: {lastErrorResponse}";
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[GeminiChatService Exception]: {ex.Message}");
                return $"Server Exception: {ex.Message}";
            }
        }
    }
}