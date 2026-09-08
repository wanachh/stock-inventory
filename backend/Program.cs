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
        policy.SetIsOriginAllowed(origin => true) // Allow localhost, Cloudflare Pages (*.pages.dev), and custom domains
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

// Friendly error handling for invalid JSON numbers (e.g. 10.3 for int) and bad requests
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadHttpRequestException)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            error = "ข้อมูลไม่ถูกต้อง: จำนวนสินค้า (Quantity) ต้องเป็นจำนวนเต็มบวกเท่านั้น (เช่น 1, 2, 3...) ไม่สามารถระบุเป็นทศนิยมหรือค่าว่างได้"
        });
    }
});

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
