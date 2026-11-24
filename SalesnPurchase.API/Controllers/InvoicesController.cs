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
    public class InvoicesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private static string? _resolvedInvoiceEndpoint;

        public InvoicesController(
            AppDbContext context,
            IWebHostEnvironment env,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _context = context;
            _env = env;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        private async Task<List<string>> GetCandidateEndpointsAsync(HttpClient client, string apiKey)
        {
            var candidates = new List<string>();

            if (!string.IsNullOrEmpty(_resolvedInvoiceEndpoint))
            {
                candidates.Add(_resolvedInvoiceEndpoint);
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
                Debug.WriteLine($"[Invoice Model Discovery Error]: {ex.Message}");
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

        // GET: api/Invoices
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DigitalInvoice>>> GetInvoices([FromQuery] string? type = null)
        {
            var query = _context.DigitalInvoices.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                var normalized = type.Trim().ToUpperInvariant();
                query = query.Where(i => i.TransactionType.ToUpper() == normalized);
            }

            var list = await query
                .OrderByDescending(i => i.TransactionDate)
                .ThenByDescending(i => i.Id)
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/Invoices/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<DigitalInvoice>> GetInvoiceById(int id)
        {
            var invoice = await _context.DigitalInvoices.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null)
            {
                return NotFound(new { message = "Invoice not found." });
            }
            return Ok(invoice);
        }

        // POST: api/Invoices/parse-prompt
        [HttpPost("parse-prompt")]
        public async Task<IActionResult> ParseInvoicePrompt([FromBody] VoiceInvoicePromptRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Prompt))
            {
                return BadRequest(new { message = "Voice or text prompt is required." });
            }

            var apiKey = (_configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return StatusCode(500, new { message = "Gemini API key is missing or invalid in appsettings.json." });
            }

            var systemInstruction = @"
You are an invoice data extractor for a mobile phone shop (SalesnPurchase) in Pakistan.
Extract structured invoice fields from the user's voice transcript (English, Roman Urdu, or Urdu).
Return ONLY valid JSON matching this exact structure:
{
  ""transactionType"": ""SELL"" | ""BUY"" | ""TRADE_IN"",
  ""customerName"": ""string"",
  ""customerPhone"": ""string"",
  ""customerCity"": ""string"",
  ""deviceModel"": ""string"",
  ""storage"": ""string"",
  ""color"": ""string"",
  ""ptaStatus"": ""PTA Approved"" | ""Non-PTA"" | ""JV"",
  ""imeiNumber"": ""string"",
  ""ratePKR"": number,
  ""cnicNumber"": ""string"",
  ""tradeInDeviceDetails"": ""string"",
  ""notes"": ""string""
}
Rules:
- Use ""SELL"" when selling/giving a device to a customer, ""BUY"" when buying from a customer, or ""TRADE_IN"" when exchanging/trading an old device.
- Normalize Pakistani phone numbers cleanly if spoken (e.g. 03001234567).
- Convert spoken amounts like ""285k"" or ""2 lakh 85 hazar"" to numeric PKR (e.g. 285000).
- Leave unknown string fields as """" and unknown ratePKR as 0.";

            var geminiBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[]
                {
                    new { parts = new[] { new { text = request.Prompt.Trim() } } }
                },
                generationConfig = new
                {
                    temperature = 0.1,
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
            string lastError = string.Empty;
            ParsedInvoiceDraft? parsed = null;

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
                            parsed = JsonSerializer.Deserialize<ParsedInvoiceDraft>(
                                cleanJson,
                                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                            );

                            if (parsed != null)
                            {
                                _resolvedInvoiceEndpoint = endpoint;
                                break;
                            }
                        }
                    }
                    else
                    {
                        lastError = responseString;
                        if (_resolvedInvoiceEndpoint == endpoint)
                        {
                            _resolvedInvoiceEndpoint = null;
                        }
                    }
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                }
            }

            if (parsed == null)
            {
                return StatusCode(502, new { message = $"Gemini parsing failed: {lastError}" });
            }

            var txType = (parsed.TransactionType ?? "SELL").Trim().ToUpperInvariant();
            if (txType != "BUY" && txType != "SELL" && txType != "TRADE_IN")
            {
                txType = "SELL";
            }
            parsed.TransactionType = txType;

            bool hasRequiredSellFields =
                txType == "SELL" &&
                !string.IsNullOrWhiteSpace(parsed.CustomerName) &&
                !string.IsNullOrWhiteSpace(parsed.CustomerPhone) &&
                !string.IsNullOrWhiteSpace(parsed.DeviceModel) &&
                !string.IsNullOrWhiteSpace(parsed.ImeiNumber) &&
                parsed.RatePKR > 0;

            if (request.AutoSave && hasRequiredSellFields)
            {
                var invoiceNumber = $"SNP-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var invoice = new DigitalInvoice
                {
                    InvoiceNumber = invoiceNumber,
                    TransactionType = "SELL",
                    ShopName = "SalesnPurchase",
                    ShopContact = "Islamabad & Rawalpindi",
                    CustomerName = parsed.CustomerName.Trim(),
                    CustomerPhone = parsed.CustomerPhone.Trim(),
                    CustomerCity = string.IsNullOrWhiteSpace(parsed.CustomerCity) ? null : parsed.CustomerCity.Trim(),
                    DeviceModel = parsed.DeviceModel.Trim(),
                    Storage = parsed.Storage?.Trim() ?? string.Empty,
                    Color = parsed.Color?.Trim() ?? string.Empty,
                    PtaStatus = parsed.PtaStatus?.Trim() ?? string.Empty,
                    ImeiNumber = parsed.ImeiNumber.Trim(),
                    RatePKR = parsed.RatePKR,
                    CnicNumber = string.IsNullOrWhiteSpace(parsed.CnicNumber) ? null : parsed.CnicNumber.Trim(),
                    CnicImageUrl = null,
                    TradeInDeviceDetails = string.IsNullOrWhiteSpace(parsed.TradeInDeviceDetails) ? null : parsed.TradeInDeviceDetails.Trim(),
                    Notes = string.IsNullOrWhiteSpace(parsed.Notes) ? "Created via AI Voice Prompt" : parsed.Notes.Trim(),
                    TransactionDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                _context.DigitalInvoices.Add(invoice);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    autoSaved = true,
                    draft = parsed,
                    savedInvoice = invoice
                });
            }

            return Ok(new
            {
                autoSaved = false,
                draft = parsed,
                requiresCnicPhoto = txType == "TRADE_IN" || txType == "BUY"
            });
        }

        // POST: api/Invoices (multipart/form-data)
        [HttpPost]
        public async Task<ActionResult<DigitalInvoice>> CreateInvoice([FromForm] CreateDigitalInvoiceForm form)
        {
            var txType = (form.TransactionType ?? "SELL").Trim().ToUpperInvariant();
            if (txType != "BUY" && txType != "SELL" && txType != "TRADE_IN")
            {
                return BadRequest(new { message = "TransactionType must be BUY, SELL, or TRADE_IN." });
            }

            if (string.IsNullOrWhiteSpace(form.CustomerName) ||
                string.IsNullOrWhiteSpace(form.CustomerPhone) ||
                string.IsNullOrWhiteSpace(form.DeviceModel) ||
                string.IsNullOrWhiteSpace(form.ImeiNumber) ||
                form.RatePKR <= 0)
            {
                return BadRequest(new { message = "Customer name, phone, device model, IMEI, and valid rate are required." });
            }

            string? savedCnicUrl = null;

            // Trade-In (aur Buy) ke liye CNIC number aur CNIC photo laazmi
            bool requiresCnic = txType == "TRADE_IN" || txType == "BUY";
            if (requiresCnic)
            {
                if (string.IsNullOrWhiteSpace(form.CnicNumber))
                {
                    return BadRequest(new { message = "CNIC number is required for Trade-In / Buy transactions." });
                }

                if (form.CnicImage == null || form.CnicImage.Length == 0)
                {
                    return BadRequest(new { message = "CNIC photo is required for Trade-In / Buy transactions." });
                }
            }

            if (form.CnicImage != null && form.CnicImage.Length > 0)
            {
                if (form.CnicImage.Length > MaxFileSizeBytes)
                {
                    return BadRequest(new { message = "CNIC image size must be 5 MB or less." });
                }

                var ext = Path.GetExtension(form.CnicImage.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                {
                    return BadRequest(new { message = "Only .jpg, .jpeg, .png, or .webp images are allowed." });
                }

                var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var cnicFolder = Path.Combine(webRoot, "uploads", "cnic");
                Directory.CreateDirectory(cnicFolder);

                var fileName = $"cnic_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}{ext}";
                var fullPath = Path.Combine(cnicFolder, fileName);

                await using var stream = new FileStream(fullPath, FileMode.Create);
                await form.CnicImage.CopyToAsync(stream);

                savedCnicUrl = $"/uploads/cnic/{fileName}";
            }

            var invoiceNumber = string.IsNullOrWhiteSpace(form.InvoiceNumber)
                ? $"SNP-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}"
                : form.InvoiceNumber.Trim();

            var invoice = new DigitalInvoice
            {
                InvoiceNumber = invoiceNumber,
                TransactionType = txType,
                ShopName = string.IsNullOrWhiteSpace(form.ShopName) ? "SalesnPurchase" : form.ShopName.Trim(),
                ShopContact = string.IsNullOrWhiteSpace(form.ShopContact) ? "Islamabad & Rawalpindi" : form.ShopContact.Trim(),
                CustomerName = form.CustomerName.Trim(),
                CustomerPhone = form.CustomerPhone.Trim(),
                CustomerCity = string.IsNullOrWhiteSpace(form.CustomerCity) ? null : form.CustomerCity.Trim(),
                DeviceModel = form.DeviceModel.Trim(),
                Storage = form.Storage?.Trim() ?? string.Empty,
                Color = form.Color?.Trim() ?? string.Empty,
                PtaStatus = form.PtaStatus?.Trim() ?? string.Empty,
                ImeiNumber = form.ImeiNumber.Trim(),
                RatePKR = form.RatePKR,
                CnicNumber = string.IsNullOrWhiteSpace(form.CnicNumber) ? null : form.CnicNumber.Trim(),
                CnicImageUrl = savedCnicUrl,
                TradeInDeviceDetails = string.IsNullOrWhiteSpace(form.TradeInDeviceDetails) ? null : form.TradeInDeviceDetails.Trim(),
                Notes = string.IsNullOrWhiteSpace(form.Notes) ? null : form.Notes.Trim(),
                TransactionDate = form.TransactionDate ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.DigitalInvoices.Add(invoice);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInvoiceById), new { id = invoice.Id }, invoice);
        }

        // DELETE: api/Invoices/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var invoice = await _context.DigitalInvoices.FindAsync(id);
            if (invoice == null)
            {
                return NotFound(new { message = "Invoice not found." });
            }

            if (!string.IsNullOrWhiteSpace(invoice.CnicImageUrl))
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var relativePath = invoice.CnicImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var physicalPath = Path.Combine(webRoot, relativePath);
                if (System.IO.File.Exists(physicalPath))
                {
                    System.IO.File.Delete(physicalPath);
                }
            }

            _context.DigitalInvoices.Remove(invoice);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Invoice deleted." });
        }
    }

    public class VoiceInvoicePromptRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public bool AutoSave { get; set; } = true;
    }

    public class ParsedInvoiceDraft
    {
        public string TransactionType { get; set; } = "SELL";
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerCity { get; set; } = string.Empty;
        public string DeviceModel { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string PtaStatus { get; set; } = "PTA Approved";
        public string ImeiNumber { get; set; } = string.Empty;
        public decimal RatePKR { get; set; }
        public string CnicNumber { get; set; } = string.Empty;
        public string TradeInDeviceDetails { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class CreateDigitalInvoiceForm
    {
        public string? InvoiceNumber { get; set; }
        public string TransactionType { get; set; } = "SELL";
        public string? ShopName { get; set; }
        public string? ShopContact { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerCity { get; set; }
        public string DeviceModel { get; set; } = string.Empty;
        public string? Storage { get; set; }
        public string? Color { get; set; }
        public string? PtaStatus { get; set; }
        public string ImeiNumber { get; set; } = string.Empty;
        public decimal RatePKR { get; set; }
        public string? CnicNumber { get; set; }
        public IFormFile? CnicImage { get; set; }
        public string? TradeInDeviceDetails { get; set; }
        public string? Notes { get; set; }
        public DateTime? TransactionDate { get; set; }
    }
}