
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
[Route("api/companies")]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public CompaniesController(
        AppDbContext db,
        UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    // GET - List my companies
    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var companies = await _db.Companies
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .Select(c => new CompanyResponse(
                c.Id, c.Name, c.Website, c.Location))
            .ToListAsync(ct);

        return Ok(companies);
    }

    // GET - Get one company
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id, CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var company = await _db.Companies
            .AsNoTracking()
            .Where(c => c.Id == id && c.UserId == userId)
            .Select(c => new CompanyResponse(
                c.Id, c.Name, c.Website, c.Location))
            .FirstOrDefaultAsync(ct);

        return company is null
            ? NotFound()
            : Ok(company);
    }

    // POST - Create company
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Company name is required.");

        var company = new Company
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            Website = Clean(request.Website),
            Location = Clean(request.Location)
        };

        _db.Companies.Add(company);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(
            nameof(GetById),
            new { id = company.Id },
            ToResponse(company));
    }

    // PUT - Edit company
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] CreateCompanyRequest request,
        CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Company name is required.");

        var company = await _db.Companies
            .FirstOrDefaultAsync(
                c => c.Id == id && c.UserId == userId,
                ct);

        if (company is null)
            return NotFound();

        company.Name = request.Name.Trim();
        company.Website = Clean(request.Website);
        company.Location = Clean(request.Location);

        await _db.SaveChangesAsync(ct);

        return Ok(ToResponse(company));
    }

    // DELETE - Delete company
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id, CancellationToken ct)
    {
        var userId = _users.GetUserId(User);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var company = await _db.Companies
            .FirstOrDefaultAsync(
                c => c.Id == id && c.UserId == userId,
                ct);

        if (company is null)
            return NotFound();

        var hasApplications = await _db.JobApplications
            .AnyAsync(
                a => a.CompanyId == id &&
                     a.UserId == userId,
                ct);

        if (hasApplications)
        {
            return Conflict(new
            {
                message =
                    "Cannot delete a company with linked job applications."
            });
        }

        _db.Companies.Remove(company);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static CompanyResponse ToResponse(Company c)
    {
        return new CompanyResponse(
            c.Id, c.Name, c.Website, c.Location);
    }
}

public class CreateCompanyRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Url]
    [StringLength(2048)]
    public string? Website { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }
}

public record CompanyResponse(
    Guid Id,
    string Name,
    string? Website,
    string? Location);
