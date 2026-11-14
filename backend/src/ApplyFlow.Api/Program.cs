
using ApplyFlow.Api.Data;
using ApplyFlow.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Azure SQL connection
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured.");

// Entity Framework Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure();
    }));

// ASP.NET Core Identity
builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>(options =>
    {
        // Require unique email addresses
        options.User.RequireUniqueEmail = true;

        // Password requirements
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;

        // Email confirmation will be configured
        // before production deployment
        options.SignIn.RequireConfirmedEmail = false;
    })
    .AddEntityFrameworkStores<AppDbContext>();

// Authorization
builder.Services.AddAuthorization();

// API services
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Development documentation
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// HTTP pipeline
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Authentication API endpoints
app.MapGroup("/api/auth")
    .MapIdentityApi<ApplicationUser>();

// API controllers
app.MapControllers();

app.Run();
