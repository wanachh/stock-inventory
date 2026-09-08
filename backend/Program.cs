using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using StockInventory.Api.Data;
using StockInventory.Api.Endpoints;
using StockInventory.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// JSON enum string serialization
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// Configure Database (SQLite)
var dbPath = Path.Combine(builder.Environment.ContentRootPath, "stock.db");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite($"Data Source={dbPath}");
});

// Register Inventory Services
builder.Services.AddScoped<IInventoryService, InventoryService>();

// CORS configuration for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Database initialization and seeding
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await DbInitializer.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// Root status check
app.MapGet("/", () => Results.Ok(new
{
    service = "Stock Inventory & Cost Management API",
    version = ".NET 10 Minimal API",
    status = "Online",
    time = DateTime.UtcNow
}));

// Route Groups
app.MapGroup("/api/products").MapProductEndpoints();
app.MapGroup("/api/stock").MapStockEndpoints();
app.MapGroup("/api/transactions").MapTransactionEndpoints();
app.MapGroup("/api/dashboard").MapDashboardEndpoints();

app.Run();
