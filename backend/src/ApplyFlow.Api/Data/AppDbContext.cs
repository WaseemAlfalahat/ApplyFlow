
using ApplyFlow.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ApplyFlow.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Company> Companies => Set<Company>();

    public DbSet<JobApplication> JobApplications
        => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Company configuration
        builder.Entity<Company>(company =>
        {
            company.HasKey(c => c.Id);

            company.Property(c => c.Name)
                .IsRequired()
                .HasMaxLength(200);

            company.Property(c => c.Website)
                .HasMaxLength(2048);

            company.Property(c => c.Location)
                .HasMaxLength(200);

            company.HasIndex(c => new { c.UserId, c.Name });

            company.HasOne(c => c.User)
                .WithMany(u => u.Companies)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Job application configuration
        builder.Entity<JobApplication>(application =>
        {
            application.HasKey(a => a.Id);

            application.Property(a => a.JobTitle)
                .IsRequired()
                .HasMaxLength(200);

            application.Property(a => a.JobUrl)
                .HasMaxLength(2048);

            application.Property(a => a.Status)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            application.HasIndex(a =>
                new { a.UserId, a.Status });

            application.HasIndex(a =>
                new { a.UserId, a.DeadlineDate });

            application.HasOne(a => a.User)
                .WithMany(u => u.Applications)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            application.HasOne(a => a.Company)
                .WithMany(c => c.Applications)
                .HasForeignKey(a =>
                    new { a.CompanyId, a.UserId })
                .HasPrincipalKey(c =>
                    new { c.Id, c.UserId })
                .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
