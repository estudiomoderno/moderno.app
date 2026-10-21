using Moderno.Windows;

var cases = new (string? Url, bool Internal, bool External)[]
{
    ("https://app.moderno.app/", true, true),
    ("https://APP.MODERNO.APP/projects?id=synthetic#view", true, true),
    ("https://auth.moderno.app/auth/v1/authorize", true, true),
    ("https://app.moderno.app:443/", true, true),
    ("https://app.moderno.app:444/", false, true),
    ("https://app.moderno.app.evil.example/", false, true),
    ("https://app.moderno.app@evil.example/", false, false),
    ("https://user@app.moderno.app/", false, false),
    ("http://app.moderno.app/", false, true),
    ("https://accounts.google.com/", false, true),
    ("file:///C:/Windows/test.txt", false, false),
    ("javascript:alert(1)", false, false),
    ("data:text/html,test", false, false),
    ("blob:https://app.moderno.app/synthetic", false, false),
    ("ms-settings:privacy", false, false),
    ("//app.moderno.app/", false, false),
    ("/projects", false, false),
    (null, false, false)
};
foreach (var item in cases)
{
    if (NavigationPolicy.IsInternal(item.Url) != item.Internal ||
        NavigationPolicy.IsExternal(item.Url) != item.External)
        throw new Exception($"Unexpected navigation policy: {item.Url}");
}
if (!NavigationPolicy.IsGoogleSignIn("https://accounts.google.com/o/oauth2/auth") ||
    NavigationPolicy.IsGoogleSignIn("https://accounts.google.com.evil.example/"))
    throw new Exception("Google host classification failed");
Console.WriteLine($"PASS: {cases.Length} navigation cases and Google classification; no network or credentials.");
