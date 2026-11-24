using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesnPurchase.API.Models
{
    public class Product
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public Category Category { get; set; } = Category.iPhone;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Range(0, 10000000)]
        public decimal PricePKR { get; set; }

        public ProductCondition Condition { get; set; } = ProductCondition.NewSealed;

        public int? BatteryHealth { get; set; }

        public string? Storage { get; set; }

        public string? Color { get; set; }

        public bool InStock { get; set; } = true;

        public bool IsPreBooking { get; set; } = false;

        public string? ImageUrl { get; set; }
        public string? Model3DUrl { get; set; }

        [NotMapped]
        public List<string> ImageUrls { get; set; } = new();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}