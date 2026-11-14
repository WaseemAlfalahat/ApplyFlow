
using Microsoft.AspNetCore.Identity;

namespace ApplyFlow.Api.Models;

public class ApplicationUser : IdentityUser
{
    public ICollection<Company> Companies { get; set; }
        = new List<Company>();

    public ICollection<JobApplication> Applications { get; set; }
        = new List<JobApplication>();
}
