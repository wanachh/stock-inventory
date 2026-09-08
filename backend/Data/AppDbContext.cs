using Microsoft.EntityFrameworkCore;
using StockInventory.Api.Models;

namespace StockInventory.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryBatch> InventoryBatches => Set<InventoryBatch>();
    public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>();
    public DbSet<TransactionBatchDetail> TransactionBatchDetails => Set<TransactionBatchDetail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Sku).IsUnique();
            entity.HasIndex(p => p.Barcode);
            entity.Property(p => p.Sku).HasMaxLength(64).IsRequired();
            entity.Property(p => p.Barcode).HasMaxLength(64);
            entity.Property(p => p.Name).HasMaxLength(200).IsRequired();
            entity.Property(p => p.Brand).HasMaxLength(150);
            entity.Property(p => p.Category).HasMaxLength(100).HasDefaultValue("General");
        });

        // InventoryBatch configuration
        modelBuilder.Entity<InventoryBatch>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.BatchNumber).HasMaxLength(64).IsRequired();
            entity.Property(b => b.UnitCost).HasPrecision(18, 2);
            entity.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(b => b.ReceivedDate);

            entity.HasOne(b => b.Product)
                .WithMany(p => p.Batches)
                .HasForeignKey(b => b.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // StockTransaction configuration
        modelBuilder.Entity<StockTransaction>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.TotalCost).HasPrecision(18, 2);
            entity.HasIndex(t => t.CreatedAt);

            entity.HasOne(t => t.Product)
                .WithMany(p => p.Transactions)
                .HasForeignKey(t => t.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TransactionBatchDetail configuration
        modelBuilder.Entity<TransactionBatchDetail>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.UnitCost).HasPrecision(18, 2);
            entity.Property(d => d.SubtotalCost).HasPrecision(18, 2);

            entity.HasOne(d => d.StockTransaction)
                .WithMany(t => t.Details)
                .HasForeignKey(d => d.StockTransactionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.InventoryBatch)
                .WithMany(b => b.BatchDetails)
                .HasForeignKey(d => d.InventoryBatchId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
