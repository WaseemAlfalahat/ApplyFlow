
using System.ComponentModel.DataAnnotations;
using ApplyFlow.Api.Data;
using ApplyFlow.Api.Models;
using ApplyFlow.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApplyFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/applications")]
public class JobApplicationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public JobApplicationsController(
        AppDbContext db,
        UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    // GET - List my applications
    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var applications = await _db.JobApplications
            .AsNoTracking()
            .Include(a => a.Company)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(ct);

        return Ok(applications.Select(ToResponse));
    }

    // GET - Get one application
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id, CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var application = await _db.JobApplications
            .AsNoTracking()
            .Include(a => a.Company)
            .FirstOrDefaultAsync(
                a => a.Id == id && a.UserId == userId,
                ct);

        if (application is null)
            return NotFound();

        return Ok(ToResponse(application));
    }

    // POST - Create application
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] SaveJobApplicationRequest request,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.JobTitle))
            return BadRequest("Job title is required.");

        if (!TryParseStatus(request.Status, out var status))
            return BadRequest("Invalid application status.");

        var company = await _db.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == request.CompanyId &&
                     c.UserId == userId,
                ct);

        if (company is null)
            return BadRequest(
                "Company does not exist or is not yours.");

        var application = new JobApplication
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CompanyId = company.Id,
            JobTitle = request.JobTitle.Trim(),
            JobUrl = Clean(request.JobUrl),
            Status = status,
            AppliedOn = request.AppliedOn,
            DeadlineDate = request.DeadlineDate,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.JobApplications.Add(application);
        await _db.SaveChangesAsync(ct);

        var response = ToResponse(
            application, company.Name);

        return CreatedAtAction(
            nameof(GetById),
            new { id = application.Id },
            response);
    }

    // PUT - Update application
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] SaveJobApplicationRequest request,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.JobTitle))
            return BadRequest("Job title is required.");

        if (!TryParseStatus(request.Status, out var status))
            return BadRequest("Invalid application status.");

        var application = await _db.JobApplications
            .FirstOrDefaultAsync(
                a => a.Id == id && a.UserId == userId,
                ct);

        if (application is null)
            return NotFound();

        var company = await _db.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == request.CompanyId &&
                     c.UserId == userId,
                ct);

        if (company is null)
            return BadRequest(
                "Company does not exist or is not yours.");

        application.CompanyId = company.Id;
        application.JobTitle = request.JobTitle.Trim();
        application.JobUrl = Clean(request.JobUrl);
        application.Status = status;
        application.AppliedOn = request.AppliedOn;
        application.DeadlineDate = request.DeadlineDate;
        application.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(ToResponse(application, company.Name));
    }

    // DELETE - Delete application
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id, CancellationToken ct)
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

        _db.JobApplications.Remove(application);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    private static bool TryParseStatus(
        string? value,
        out ApplicationStatus status)
    {
        status = default;

        if (string.IsNullOrWhiteSpace(value))
            return false;

        var name = Enum.GetNames<ApplicationStatus>()
            .FirstOrDefault(n => string.Equals(
                n,
                value.Trim(),
                StringComparison.OrdinalIgnoreCase));

        if (name is null)
            return false;

        status = Enum.Parse<ApplicationStatus>(name);
        return true;
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static JobApplicationResponse ToResponse(
        JobApplication a)
    {
        return ToResponse(a, a.Company.Name);
    }

    private static JobApplicationResponse ToResponse(
        JobApplication a,
        string companyName)
    {
        return new JobApplicationResponse(
            a.Id,
            a.CompanyId,
            companyName,
            a.JobTitle,
            a.JobUrl,
            a.Status.ToString(),
            a.AppliedOn,
            a.DeadlineDate,
            a.CreatedAtUtc,
            a.UpdatedAtUtc);
    }
}

public class SaveJobApplicationRequest
{
    public Guid CompanyId { get; set; }

    [Required]
    [StringLength(200)]
    public string JobTitle { get; set; } = string.Empty;

    [Url]
    [StringLength(2048)]
    public string? JobUrl { get; set; }

    public string Status { get; set; } = "Draft";

    public DateOnly? AppliedOn { get; set; }

    public DateOnly? DeadlineDate { get; set; }
}

public record JobApplicationResponse(
    Guid Id,
    Guid CompanyId,
    string CompanyName,
    string JobTitle,
    string? JobUrl,
    string Status,
    DateOnly? AppliedOn,
    DateOnly? DeadlineDate,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);
