namespace Moderno.Windows;

internal static class NavigationPolicy
{
    internal static readonly Uri Home = new("https://app.moderno.app/");

    internal static bool IsInternal(string? location) =>
        Uri.TryCreate(location, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps && uri.IsDefaultPort &&
        string.IsNullOrEmpty(uri.UserInfo) &&
        (uri.Host.Equals(Home.Host, StringComparison.OrdinalIgnoreCase) ||
         uri.Host.Equals("auth.moderno.app", StringComparison.OrdinalIgnoreCase));

    internal static bool IsExternal(string? location) =>
        Uri.TryCreate(location, UriKind.Absolute, out var uri) &&
        string.IsNullOrEmpty(uri.UserInfo) &&
        (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);

    internal static bool IsGoogleSignIn(string? location) =>
        Uri.TryCreate(location, UriKind.Absolute, out var uri) &&
        uri.Host.Equals("accounts.google.com", StringComparison.OrdinalIgnoreCase);
}
