
using ApplyFlow.Api.Models.Enums;

namespace ApplyFlow.Api.Models;

public class JobApplication
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public string JobTitle { get; set; } = string.Empty;
    public string? JobUrl { get; set; }

    public ApplicationStatus Status { get; set; }
        = ApplicationStatus.Draft;

    public DateOnly? AppliedOn { get; set; }
    public DateOnly? DeadlineDate { get; set; }

    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; }
        = DateTime.UtcNow;
}
