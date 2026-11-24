using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Data;
using SalesnPurchase.API.Models;

namespace SalesnPurchase.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ReviewsController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetApprovedReviews()
        {
            var reviews = await _db.Reviews
                .Where(r => r.IsApproved)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(reviews);
        }

        [HttpPost]
        public async Task<IActionResult> SubmitReview([FromBody] Review review)
        {
            _db.Reviews.Add(review);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Review submitted! Pending admin approval." });
        }

        [HttpPatch("{id:guid}/approve")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> ApproveReview(Guid id)
        {
            var review = await _db.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            review.IsApproved = true;
            await _db.SaveChangesAsync();
            return Ok(review);
        }
    }
}