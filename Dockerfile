
# Step 1: Build React frontend
FROM node:24-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Step 2: Build ASP.NET Core backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend

WORKDIR /src

COPY backend/src/ApplyFlow.Api/ApplyFlow.Api.csproj backend/src/ApplyFlow.Api/

RUN dotnet restore backend/src/ApplyFlow.Api/ApplyFlow.Api.csproj

COPY backend/ backend/

RUN dotnet publish backend/src/ApplyFlow.Api/ApplyFlow.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore


# Step 3: Run the combined website
FROM mcr.microsoft.com/dotnet/aspnet:10.0

WORKDIR /app

COPY --from=backend /app/publish ./

COPY --from=frontend /app/frontend/dist ./wwwroot

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT ["dotnet", "ApplyFlow.Api.dll"]
