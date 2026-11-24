using System;
using System.ComponentModel.DataAnnotations;

namespace SalesnPurchase.API.Models
{
    public class Review
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(100)]
        public string AuthorName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Range(1, 5)]
        public int Rating { get; set; }

        [Required, MaxLength(1000)]
        public string Comment { get; set; } = string.Empty;

        public bool IsApproved { get; set; } = false; // Requires Admin approval to display

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}