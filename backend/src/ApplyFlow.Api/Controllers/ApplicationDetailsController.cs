
using System.ComponentModel.DataAnnotations;
using ApplyFlow.Api.Data;
using ApplyFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApplyFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/applications")]
public class ApplicationDetailsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public ApplicationDetailsController(
        AppDbContext db,
        UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    // Return only applications with saved notes or contact details.
    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes(CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var notes = await _db.JobApplications
            .AsNoTracking()
            .Where(a =>
                a.UserId == userId &&
                (a.Notes != null ||
                 a.RecruiterName != null ||
                 a.RecruiterEmail != null ||
                 a.FollowUpDate != null))
            .OrderByDescending(a => a.UpdatedAtUtc)
            .Select(a => new
            {
                a.Id,
                a.JobTitle,
                CompanyName = a.Company.Name,
                a.Notes,
                a.RecruiterName,
                a.RecruiterEmail,
                a.FollowUpDate
            })
            .ToListAsync(ct);

        return Ok(notes);
    }


    [HttpGet("{id:guid}/details")]
    public async Task<IActionResult> GetDetails(
        Guid id,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var application = await _db.JobApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.Id == id && a.UserId == userId,
                ct);

        if (application is null)
            return NotFound();

        return Ok(ToResponse(application));
    }

    [HttpPut("{id:guid}/details")]
    public async Task<IActionResult> UpdateDetails(
        Guid id,
        [FromBody] SaveApplicationDetailsRequest request,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var application = await _db.JobApplications
            .FirstOrDefaultAsync(
                a => a.Id == id && a.UserId == userId,
                ct);

        if (application is null)
            return NotFound();

        application.Notes = Clean(request.Notes);
        application.RecruiterName = Clean(request.RecruiterName);
        application.RecruiterEmail = Clean(request.RecruiterEmail);
        application.FollowUpDate = request.FollowUpDate;
        application.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(ToResponse(application));
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static ApplicationDetailsResponse ToResponse(
        JobApplication application)
    {
        return new ApplicationDetailsResponse(
            application.Notes,
            application.RecruiterName,
            application.RecruiterEmail,
            application.FollowUpDate);
    }
}

public class SaveApplicationDetailsRequest
{
    [StringLength(4000)]
    public string? Notes { get; set; }

    [StringLength(200)]
    public string? RecruiterName { get; set; }

    [EmailAddress]
    [StringLength(320)]
    public string? RecruiterEmail { get; set; }

    public DateOnly? FollowUpDate { get; set; }
}

public record ApplicationDetailsResponse(
    string? Notes,
    string? RecruiterName,
    string? RecruiterEmail,
    DateOnly? FollowUpDate);
