using Microsoft.EntityFrameworkCore;
using SalesnPurchase.API.Models;

namespace SalesnPurchase.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Product> Products { get; set; } = null!;
        public DbSet<PreOrder> PreOrders { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<TradeInRequest> TradeInRequests { get; set; } = null!;
        public DbSet<StockRequest> StockRequests { get; set; } = null!;
        public DbSet<DigitalInvoice> DigitalInvoices { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<PreOrder>(entity =>
            {
                entity.ToTable("PreOrders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProductId).IsRequired(false);
                entity.Property(e => e.CustomerName).IsRequired();
                entity.Property(e => e.CustomerPhone).IsRequired();
                entity.Property(e => e.Notes).IsRequired(false);
            });

            modelBuilder.Entity<Product>(entity =>
            {
                entity.ToTable("Products");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Category).HasConversion<int>();
                entity.Property(e => e.Condition).HasConversion<int>();
            });

            modelBuilder.Entity<TradeInRequest>(entity =>
            {
                entity.ToTable("TradeInRequests");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Model).IsRequired();
                entity.Property(e => e.CustomerPhone).IsRequired();
                entity.Property(e => e.CustomerEmail).IsRequired();
            });

            modelBuilder.Entity<StockRequest>(entity =>
            {
                entity.ToTable("StockRequests");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RequestedItem).IsRequired();
            });

            modelBuilder.Entity<DigitalInvoice>(entity =>
            {
                entity.ToTable("DigitalInvoices");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).IsRequired();
                entity.Property(e => e.TransactionType).IsRequired();
                entity.Property(e => e.CustomerName).IsRequired();
                entity.Property(e => e.CustomerPhone).IsRequired();
                entity.Property(e => e.DeviceModel).IsRequired();
                entity.Property(e => e.ImeiNumber).IsRequired();
                entity.Property(e => e.RatePKR).HasColumnType("decimal(18,2)");
            });
        }
    }
}