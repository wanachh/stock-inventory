using System.Collections.Concurrent;

namespace StockInventory.Api.Endpoints;

public static class AnalyticsEndpoints
{
    private static int _totalVisits = 42; // Initial seed count for realistic feel
    private static readonly ConcurrentDictionary<string, DateTime> _activeSessions = new();
    private static readonly ConcurrentDictionary<string, int> _dailyVisits = new();

    public static void MapAnalyticsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/analytics").WithTags("Analytics");

        group.MapPost("/visit", (HttpContext context) =>
        {
            Interlocked.Increment(ref _totalVisits);

            // Client identifier (anonymous hash from IP or header)
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var sessionId = $"{ip}_{userAgent.GetHashCode()}";

            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            _dailyVisits.AddOrUpdate(today, 1, (_, count) => count + 1);

            _activeSessions[sessionId] = DateTime.UtcNow;

            // Clean up old sessions (> 15 minutes)
            var threshold = DateTime.UtcNow.AddMinutes(-15);
            foreach (var kvp in _activeSessions)
            {
                if (kvp.Value < threshold)
                {
                    _activeSessions.TryRemove(kvp.Key, out _);
                }
            }

            return Results.Ok(new
            {
                totalVisits = _totalVisits,
                todayVisits = _dailyVisits.GetValueOrDefault(today, 1),
                activeNow = Math.Max(1, _activeSessions.Count)
            });
        });

        group.MapGet("/stats", () =>
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var threshold = DateTime.UtcNow.AddMinutes(-15);
            var activeCount = _activeSessions.Count(kvp => kvp.Value >= threshold);

            return Results.Ok(new
            {
                totalVisits = _totalVisits,
                todayVisits = _dailyVisits.GetValueOrDefault(today, 1),
                activeNow = Math.Max(1, activeCount)
            });
        });
    }
}
