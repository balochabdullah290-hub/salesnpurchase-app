namespace SalesnPurchase.API.Models
{
    public enum Category
    {
        iPhone = 1,
        PreBooking = 2,
        AirPodsCopy = 3,
        AirPodsPakistani = 4,
        AppleSmartwatch = 5,
        LocalSmartwatch = 6,
        AppleCableAdapter = 7
    }

    public enum ProductCondition
    {
        NewSealed = 1,
        PreOwned10By10 = 2,
        PreOwned9By10 = 3,
        Refurbished = 4
    }

    public enum UserRole
    {
        Customer = 1,
        Admin = 2
    }
}