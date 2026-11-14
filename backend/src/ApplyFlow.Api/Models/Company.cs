
namespace ApplyFlow.Api.Models;

public class Company
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Website { get; set; }
    public string? Location { get; set; }

    public ICollection<JobApplication> Applications { get; set; }
        = new List<JobApplication>();
}
