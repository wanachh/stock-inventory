using StockInventory.Api.Services;

namespace StockInventory.Api.Endpoints;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/summary", async (IInventoryService service) =>
        {
            var summary = await service.GetDashboardSummaryAsync();
            return Results.Ok(summary);
        })
        .WithName("GetDashboardSummary")
        .WithSummary("Get executive KPI stats, remaining valuation, cost out, and movement trends");

        return group;
    }
}
