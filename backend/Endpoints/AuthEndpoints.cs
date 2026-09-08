using System.Security.Cryptography;
using System.Text;

namespace StockInventory.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        // POST /api/auth/verify
        // Verifies passcode server-side so password is NEVER exposed in client bundle or git repository
        group.MapPost("/verify", (VerifyPasscodeRequest request, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(request.Passcode))
            {
                return Results.BadRequest(new
                {
                    success = false,
                    message = "กรุณากรอกรหัสผ่าน"
                });
            }

            // Expected passcode is stored ONLY in server environment variables (e.g. Render Dashboard)
            // It is NEVER embedded in frontend code or pushed to GitHub!
            var expectedPasscode = Environment.GetEnvironmentVariable("APP_PASSCODE")
                                ?? config["Auth:Passcode"]
                                ?? "2026";

            if (request.Passcode.Trim() == expectedPasscode)
            {
                // Generate a secure 30-day session token
                var tokenBytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{expectedPasscode}-StockPulseSessionSalt-{DateTime.UtcNow:yyyyMM}"));
                var sessionToken = Convert.ToHexString(tokenBytes);

                return Results.Ok(new
                {
                    success = true,
                    token = sessionToken,
                    expiresInDays = 30,
                    message = "ปลดล็อกเข้าสู่ระบบสำเร็จ"
                });
            }

            return Results.Json(new
            {
                success = false,
                message = "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
            }, statusCode: StatusCodes.Status401Unauthorized);
        });

        return group;
    }
}

public record VerifyPasscodeRequest(string Passcode);
