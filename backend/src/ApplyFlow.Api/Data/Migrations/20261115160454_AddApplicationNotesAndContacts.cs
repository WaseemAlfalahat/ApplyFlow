using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ApplyFlow.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationNotesAndContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "FollowUpDate",
                table: "JobApplications",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "JobApplications",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecruiterEmail",
                table: "JobApplications",
                type: "nvarchar(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecruiterName",
                table: "JobApplications",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FollowUpDate",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "RecruiterEmail",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "RecruiterName",
                table: "JobApplications");
        }
    }
}
