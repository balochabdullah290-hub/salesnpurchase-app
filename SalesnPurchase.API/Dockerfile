FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["SalesnPurchase.API.csproj", "./"]
RUN dotnet restore "SalesnPurchase.API.csproj"
COPY . .
RUN dotnet publish "SalesnPurchase.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SalesnPurchase.API.dll"]