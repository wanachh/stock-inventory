namespace StockInventory.Api.Data;

public static class DbInitializer
{
    public static Task SeedAsync(AppDbContext db)
    {
        // Production mode: No mock or sample data is seeded.
        // Ready for real user data.
        return Task.CompletedTask;
    }
}

