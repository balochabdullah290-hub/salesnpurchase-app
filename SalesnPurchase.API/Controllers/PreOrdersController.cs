using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;
using System.Text.Json;

namespace SalesnPurchase.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PreOrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PreOrdersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/PreOrders
        [HttpGet]
        public async Task<IActionResult> GetPreOrders()
        {
            try
            {
                var preOrders = await _context.PreOrders
                    .Include(p => p.Product)
                    .AsNoTracking()
                    .OrderByDescending(p => p.Id)
                    .Select(p => new
                    {
                        p.Id,
                        p.ProductId,
                        p.CustomerName,
                        p.CustomerPhone,
                        p.City,
                        p.Status,
                        p.Notes,
                        p.CreatedAt,
                        ProductTitle = p.Product != null ? p.Product.Title : "Custom Pre-Order"
                    })
                    .ToListAsync();

                return Ok(preOrders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // POST: api/PreOrders
        [HttpPost]
        public async Task<IActionResult> CreatePreOrder([FromBody] JsonElement body)
        {
            try
            {
                string customerName = GetJsonValue(body, "customerName")
                                   ?? GetJsonValue(body, "name")
                                   ?? GetJsonValue(body, "CustomerName")
                                   ?? "Customer";

                string customerPhone = GetJsonValue(body, "customerPhone")
                                    ?? GetJsonValue(body, "phone")
                                    ?? GetJsonValue(body, "CustomerPhone")
                                    ?? "N/A";

                string city = GetJsonValue(body, "city")
                           ?? GetJsonValue(body, "City")
                           ?? "N/A";

                string notes = GetJsonValue(body, "notes")
                            ?? GetJsonValue(body, "Notes")
                            ?? GetJsonValue(body, "specialNotes")
                            ?? string.Empty;

                Guid? parsedProductId = null;
                string? rawProductId = GetJsonValue(body, "productId")
                                    ?? GetJsonValue(body, "ProductId")
                                    ?? GetJsonValue(body, "id");

                if (!string.IsNullOrWhiteSpace(rawProductId) && Guid.TryParse(rawProductId, out Guid g))
                {
                    bool productExists = await _context.Products.AnyAsync(p => p.Id == g);
                    if (productExists)
                    {
                        parsedProductId = g;
                    }
                }

                var preOrder = new PreOrder
                {
                    ProductId = parsedProductId,
                    CustomerName = customerName,
                    CustomerPhone = customerPhone,
                    City = city,
                    Notes = notes,
                    Status = "PENDING",
                    CreatedAt = DateTime.UtcNow
                };

                _context.PreOrders.Add(preOrder);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Pre-order saved successfully!", id = preOrder.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Failed to save pre-order to database.",
                    message = ex.Message,
                    innerException = ex.InnerException?.Message
                });
            }
        }

        // PUT: api/PreOrders/5/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] JsonElement body)
        {
            try
            {
                string? newStatus = GetJsonValue(body, "status") ?? GetJsonValue(body, "Status");
                if (string.IsNullOrWhiteSpace(newStatus))
                {
                    return BadRequest(new { message = "Status is required." });
                }

                var preOrder = await _context.PreOrders.FindAsync(id);
                if (preOrder == null)
                {
                    return NotFound(new { message = $"Pre-order with ID {id} not found." });
                }

                preOrder.Status = newStatus;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Status updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // DELETE: api/PreOrders/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePreOrder(int id)
        {
            try
            {
                var preOrder = await _context.PreOrders.FindAsync(id);
                if (preOrder == null)
                {
                    return NotFound(new { message = $"Pre-order with ID {id} not found." });
                }

                _context.PreOrders.Remove(preOrder);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Pre-order removed successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        private static string? GetJsonValue(JsonElement body, string propertyName)
        {
            if (body.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in body.EnumerateObject())
                {
                    if (string.Equals(prop.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        if (prop.Value.ValueKind == JsonValueKind.String)
                            return prop.Value.GetString();
                        if (prop.Value.ValueKind == JsonValueKind.Number)
                            return prop.Value.GetRawText();
                    }
                }
            }
            return null;
        }
    }
}