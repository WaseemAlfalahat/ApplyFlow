
using ApplyFlow.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Get the database connection string from configuration
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured.");

// Configure Entity Framework Core with Azure SQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        // Retry transient SQL connection failures
        sqlOptions.EnableRetryOnFailure();
    }));

// Register API services
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Enable OpenAPI documentation during development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Configure HTTP request pipeline
app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();
