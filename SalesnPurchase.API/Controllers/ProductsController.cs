using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace SalesnPurchase.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        private static string? _resolvedListingEndpoint;

        public ProductsController(
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

            if (!string.IsNullOrEmpty(_resolvedListingEndpoint))
            {
                candidates.Add(_resolvedListingEndpoint);
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
                Debug.WriteLine($"[Product Listing Model Discovery Error]: {ex.Message}");
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

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetProducts(
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] bool? inStockOnly)
        {
            try
            {
                var query = _context.Products.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    string searchLower = search.Trim().ToLower();
                    query = query.Where(p => p.Title.ToLower().Contains(searchLower) ||
                                             p.Description.ToLower().Contains(searchLower));
                }

                if (inStockOnly.HasValue && inStockOnly.Value)
                {
                    query = query.Where(p => p.InStock);
                }

                if (!string.IsNullOrWhiteSpace(category))
                {
                    string cleaned = category.Replace("-", "").Replace(" ", "").Trim();

                    if (cleaned.Equals("PreBooking", StringComparison.OrdinalIgnoreCase) ||
                        cleaned.Equals("PreOrder", StringComparison.OrdinalIgnoreCase))
                    {
                        query = query.Where(p => p.IsPreBooking || p.PricePKR == 0 || p.Category == Category.PreBooking);
                    }
                    else if (Enum.TryParse<Category>(cleaned, true, out var parsedEnum))
                    {
                        query = query.Where(p => p.Category == parsedEnum);
                    }
                }

                var products = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
                return Ok(products);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpGet("{id:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProduct(Guid id)
        {
            try
            {
                var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
                if (product == null)
                {
                    return NotFound(new { success = false, message = $"Product with ID {id} not found." });
                }

                return Ok(product);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPost("generate-listing")]
        [Authorize]
        public async Task<IActionResult> GenerateProductListing([FromBody] GenerateProductListingRequest request)
        {
            if (request == null ||
                (string.IsNullOrWhiteSpace(request.ModelOrPrompt) &&
                 string.IsNullOrWhiteSpace(request.Storage) &&
                 string.IsNullOrWhiteSpace(request.Color)))
            {
                return BadRequest(new { message = "Please provide product model, specs, or prompt." });
            }

            var apiKey = (_configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
            {
                return StatusCode(500, new { message = "Gemini API key is missing or invalid in appsettings.json." });
            }

            var systemInstruction = @"
You are a product listing copywriter for 'SalesnPurchase', a mobile & Apple device store in Islamabad & Rawalpindi, Pakistan.
Given brief product details (model, storage, color, PTA status, condition, battery health, price, or voice/text prompt), generate a clean storefront title and an engaging, concise, SEO-friendly product description.
Return ONLY valid JSON matching this exact structure:
{
  ""title"": ""string"",
  ""description"": ""string"",
  ""storage"": ""string"",
  ""color"": ""string"",
  ""category"": ""string""
}
Rules:
- Keep title concise (under 110 characters), clean, and informative (e.g. 'iPhone 15 Pro Max 256GB Natural Titanium - PTA Approved').
- Keep description natural, clear, and customer-ready (2-4 short sentences or concise bullet-free lines), highlighting specs, PTA/condition notes, and Islamabad/Rawalpindi deal convenience without sounding robotic or stuffed with keywords.
- Do not invent unrealistic prices or specs not implied by the input.";

            var inputSummary = $@"
Input / Prompt: {request.ModelOrPrompt ?? ""}
Category Hint: {request.Category ?? ""}
Storage Hint: {request.Storage ?? ""}
Color Hint: {request.Color ?? ""}
PTA Status: {request.PtaStatus ?? ""}
Condition: {request.ConditionLabel ?? ""}
Battery Health: {(request.BatteryHealth.HasValue ? $"{request.BatteryHealth.Value}%" : "N/A")}
Price PKR: {(request.PricePKR.HasValue && request.PricePKR.Value > 0 ? request.PricePKR.Value.ToString("N0") : "N/A")}";

            var geminiBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemInstruction } } },
                contents = new[]
                {
                    new { parts = new[] { new { text = inputSummary.Trim() } } }
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
            string lastError = string.Empty;
            GeneratedProductListing? generated = null;

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
                            generated = JsonSerializer.Deserialize<GeneratedProductListing>(
                                cleanJson,
                                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                            );

                            if (generated != null && (!string.IsNullOrWhiteSpace(generated.Title) || !string.IsNullOrWhiteSpace(generated.Description)))
                            {
                                _resolvedListingEndpoint = endpoint;
                                break;
                            }
                        }
                    }
                    else
                    {
                        lastError = responseString;
                        if (_resolvedListingEndpoint == endpoint)
                        {
                            _resolvedListingEndpoint = null;
                        }
                    }
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                }
            }

            if (generated == null)
            {
                return StatusCode(502, new { message = $"AI listing generation failed: {lastError}" });
            }

            return Ok(generated);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                Category parsedCategory = ParseCategory(dto.Category ?? "iPhone");
                ProductCondition parsedCondition = Enum.IsDefined(typeof(ProductCondition), dto.Condition)
                    ? (ProductCondition)dto.Condition
                    : ProductCondition.NewSealed;

                var product = new Product
                {
                    Id = Guid.NewGuid(),
                    Title = string.IsNullOrWhiteSpace(dto.Title) ? "New Product" : dto.Title.Trim(),
                    Category = parsedCategory,
                    Description = string.IsNullOrWhiteSpace(dto.Description) ? "No description provided." : dto.Description.Trim(),
                    PricePKR = dto.IsPreBooking ? 0m : dto.PricePKR,
                    Condition = parsedCondition,
                    BatteryHealth = dto.BatteryHealth,
                    Storage = dto.Storage?.Trim(),
                    Color = dto.Color?.Trim(),
                    InStock = dto.InStock,
                    IsPreBooking = dto.IsPreBooking,
                    ImageUrl = dto.ImageUrl?.Trim(),
                    Model3DUrl = dto.Model3DUrl?.Trim(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Products.Add(product);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPut("{id:guid}")]
        [Authorize]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null)
                {
                    return NotFound(new { success = false, message = $"Product with ID {id} not found." });
                }

                if (!string.IsNullOrWhiteSpace(dto.Title)) product.Title = dto.Title.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Description)) product.Description = dto.Description.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Category)) product.Category = ParseCategory(dto.Category);

                product.IsPreBooking = dto.IsPreBooking ?? product.IsPreBooking;
                product.PricePKR = product.IsPreBooking ? 0m : (dto.PricePKR ?? product.PricePKR);
                product.Storage = dto.Storage?.Trim() ?? product.Storage;
                product.Color = dto.Color?.Trim() ?? product.Color;
                product.InStock = dto.InStock ?? product.InStock;
                product.ImageUrl = dto.ImageUrl?.Trim() ?? product.ImageUrl;
                product.Model3DUrl = dto.Model3DUrl?.Trim() ?? product.Model3DUrl;

                if (dto.Condition.HasValue && Enum.IsDefined(typeof(ProductCondition), dto.Condition.Value))
                {
                    product.Condition = (ProductCondition)dto.Condition.Value;
                }

                if (dto.BatteryHealth.HasValue)
                {
                    product.BatteryHealth = dto.BatteryHealth.Value;
                }

                _context.Products.Update(product);
                await _context.SaveChangesAsync();

                return Ok(product);
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPatch("{id:guid}/toggle-stock")]
        [Authorize]
        public async Task<IActionResult> ToggleStockStatus(Guid id)
        {
            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null)
                {
                    return NotFound(new { success = false, message = $"Product with ID {id} not found." });
                }

                product.InStock = !product.InStock;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, inStock = product.InStock });
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpDelete("{id:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null)
                {
                    return NotFound(new { success = false, message = $"Product with ID {id} not found." });
                }

                _context.Products.Remove(product);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Product deleted successfully." });
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        private static Category ParseCategory(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return Category.iPhone;

            string cleaned = raw.Trim().Replace("-", "").Replace(" ", "");
            if (cleaned.Equals("iPhones", StringComparison.OrdinalIgnoreCase)) return Category.iPhone;
            if (cleaned.Equals("PreBooking", StringComparison.OrdinalIgnoreCase) || cleaned.Equals("PreOrder", StringComparison.OrdinalIgnoreCase)) return Category.PreBooking;

            if (Enum.TryParse<Category>(cleaned, true, out var category))
            {
                return category;
            }

            return Category.iPhone;
        }

        private IActionResult HandleException(Exception ex)
        {
            if (_env.IsDevelopment())
            {
                return StatusCode(500, new { success = false, message = ex.Message, details = ex.InnerException?.Message });
            }

            return StatusCode(500, new { success = false, message = "An internal error occurred. Please try again later." });
        }
    }

    public class GenerateProductListingRequest
    {
        public string? ModelOrPrompt { get; set; }
        public string? Category { get; set; }
        public string? Storage { get; set; }
        public string? Color { get; set; }
        public string? PtaStatus { get; set; }
        public string? ConditionLabel { get; set; }
        public int? BatteryHealth { get; set; }
        public decimal? PricePKR { get; set; }
    }

    public class GeneratedProductListing
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Storage { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }

    public class CreateProductDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
        public string Description { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Storage { get; set; }

        [StringLength(50)]
        public string? Color { get; set; }

        [StringLength(500)]
        public string? ImageUrl { get; set; }

        [StringLength(200)]
        public string? Model3DUrl { get; set; }

        [Range(0, 10000000, ErrorMessage = "Price must be between 0 and 10,000,000 PKR.")]
        public decimal PricePKR { get; set; }

        public bool IsPreBooking { get; set; }
        public bool InStock { get; set; } = true;

        [Required(ErrorMessage = "Category is required.")]
        public string Category { get; set; } = "iPhone";

        [Range(1, 3, ErrorMessage = "Condition must be 1, 2, or 3.")]
        public int Condition { get; set; } = 1;

        [Range(0, 100, ErrorMessage = "Battery health must be between 0 and 100.")]
        public int? BatteryHealth { get; set; }
    }

    public class UpdateProductDto
    {
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string? Title { get; set; }

        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? Storage { get; set; }

        [StringLength(50)]
        public string? Color { get; set; }

        [StringLength(500)]
        public string? ImageUrl { get; set; }

        [StringLength(200)]
        public string? Model3DUrl { get; set; }

        [Range(0, 10000000, ErrorMessage = "Price must be between 0 and 10,000,000 PKR.")]
        public decimal? PricePKR { get; set; }

        public bool? IsPreBooking { get; set; }
        public bool? InStock { get; set; }

        public string? Category { get; set; }

        [Range(1, 3, ErrorMessage = "Condition must be 1, 2, or 3.")]
        public int? Condition { get; set; }

        [Range(0, 100, ErrorMessage = "Battery health must be between 0 and 100.")]
        public int? BatteryHealth { get; set; }
    }
}