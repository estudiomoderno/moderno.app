using System.Text;
using Microsoft.Web.WebView2.Core;
using Moderno.Windows;

internal static class Program
{
    private static int version = 1;
    private static bool unavailable;
    private static CoreWebView2? core;
    private static int exitCode = 1;
    private static readonly TaskCompletionSource ready = new();

    [STAThread]
    private static int Main()
    {
        ApplicationConfiguration.Initialize();
        MainWindow.TestProfile = Path.Combine(Path.GetTempPath(), "Moderno-Smoke-" + Guid.NewGuid());
        MainWindow.ConfigureTestBrowser = browser =>
        {
            core = browser;
            Console.WriteLine("WebView2 runtime: " + core.Environment.BrowserVersionString);
            // TODAS las solicitudes reciben respuestas ficticias. Nunca acceder a producción.
            core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All,
                CoreWebView2WebResourceRequestSourceKinds.All);
            core.WebResourceRequested += (_, e) =>
            {
                Console.WriteLine("Intercepted synthetic request: " + e.Request.Uri);
                var body = $"<!doctype html><title>Synthetic v{version}</title><p id='version'>{version}</p>" +
                    "<a id='popup' href='/synthetic-module' target='_blank'>Módulo ficticio</a>";
                e.Response = core.Environment.CreateWebResourceResponse(
                    new MemoryStream(Encoding.UTF8.GetBytes(body)), unavailable ? 503 : 200,
                    unavailable ? "Service Unavailable" : "OK", "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store");
            };
            core.NavigationCompleted += (_, e) => ready.TrySetResult();
        };
        using var window = new MainWindow();
        window.Shown += async (_, _) =>
        {
            try
            {
                await ready.Task.WaitAsync(TimeSpan.FromSeconds(45));
                await CheckAsync(window);
                Console.WriteLine("PASS: real WebView2 shell; synthetic navigation, popup, local storage/cookie, refresh, HTTP failure/retry, Google notice. No production access.");
                exitCode = 0;
            }
            catch (Exception e) { Console.Error.WriteLine(e.GetType().Name + ": " + e.Message); }
            finally { window.Close(); }
        };
        Application.Run(window);
        return exitCode;
    }

    private static async Task CheckAsync(MainWindow window)
    {
        Assert(!window.NoticeVisible, "Initial document must load");
        Assert(await core!.ExecuteScriptAsync("document.title") == "\"Synthetic v1\"", "Synthetic response");
        await core.ExecuteScriptAsync("localStorage.setItem('synthetic', 'saved'); document.cookie='synthetic=saved; Secure; SameSite=Lax; path=/'");
        await NavigateAsync(() => core.ExecuteScriptAsync("document.getElementById('popup').click()"));
        Assert(core.Source == "https://app.moderno.app/synthetic-module", "Internal popup remains inside shell");
        await core.ExecuteScriptAsync("document.body.dataset.draft='synthetic-unsaved'");
        window.SetNetworkForTest(false);
        Assert(window.NoticeVisible, "Disconnected adapter notice");
        window.SetNetworkForTest(false);
        Assert(window.NoticeVisible, "Repeated disconnect must not hide notice");
        window.SetNetworkForTest(true);
        Assert(!window.NoticeVisible, "Adapter recovery restores existing page");
        Assert(await core.ExecuteScriptAsync("document.body.dataset.draft") == "\"synthetic-unsaved\"", "Reconnect preserves unsaved DOM");
        var popupTitle = await core.ExecuteScriptAsync("document.title");
        Assert(popupTitle == "\"Synthetic v1\"", "Internal popup document finished: " + popupTitle);
        version = 2;
        await Task.Delay(200);
        var unchangedTitle = await core.ExecuteScriptAsync("document.title");
        Assert(unchangedTitle == "\"Synthetic v1\"", "No automatic reload: " + unchangedTitle);
        await NavigateAsync(() => { core.Reload(); return Task.CompletedTask; });
        Assert(await core.ExecuteScriptAsync("document.title") == "\"Synthetic v2\"", "Web update without native rebuild");
        Assert(await core.ExecuteScriptAsync("localStorage.getItem('synthetic')") == "\"saved\"", "Local storage retained");
        Assert((await core.ExecuteScriptAsync("document.cookie")).Contains("synthetic=saved"), "Cookie retained");
        unavailable = true;
        await NavigateAsync(() => { core.Reload(); return Task.CompletedTask; });
        Assert(window.NoticeVisible, "HTTP failure must show notice");
        unavailable = false;
        await NavigateAsync(window.RetryForTestAsync);
        Assert(!window.NoticeVisible, "Retry recovers");
        await NavigateAsync(() => { core.Navigate("https://accounts.google.com/o/oauth2/auth"); return Task.CompletedTask; }, includeCancellation: true);
        Assert(window.NoticeVisible, "Google must explain unsupported return");
        await NavigateAsync(window.RetryForTestAsync);
        Assert(core.Source == "https://app.moderno.app/", "Google retry returns home");
    }

    private static async Task NavigateAsync(Func<Task> action, bool includeCancellation = false)
    {
        var completed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        ulong? navigationId = null;
        EventHandler<CoreWebView2NavigationStartingEventArgs> starting = (_, e) => navigationId = e.NavigationId;
        EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = (_, e) =>
        {
            Console.WriteLine($"Synthetic navigation complete: status={e.HttpStatusCode}, error={e.WebErrorStatus}");
            if (e.NavigationId == navigationId &&
                (includeCancellation || e.WebErrorStatus != CoreWebView2WebErrorStatus.OperationCanceled))
                completed.TrySetResult();
        };
        core!.NavigationStarting += starting;
        core.NavigationCompleted += handler;
        try { await action(); await completed.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
        finally
        {
            core.NavigationStarting -= starting;
            core.NavigationCompleted -= handler;
        }
    }

    private static void Assert(bool value, string message)
    {
        if (!value) throw new Exception(message);
    }
}
