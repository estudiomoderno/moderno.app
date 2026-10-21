using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Moderno.Windows;

/// <summary>
/// Contenedor de la web de Moderno.app. No incluye datos del negocio ni API propia.
/// </summary>
internal sealed class MainWindow : Form
{
    private static readonly Uri AppAddress = NavigationPolicy.Home;

    private WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly Panel notice = new()
    {
        Dock = DockStyle.Fill,
        BackColor = Color.FromArgb(246, 244, 235),
        Visible = true
    };
    private readonly Label message = new()
    {
        Dock = DockStyle.Top,
        Height = 90,
        TextAlign = ContentAlignment.BottomCenter,
        Font = new Font("Segoe UI", 12, FontStyle.Regular),
        Text = "Conectando con Moderno.app…"
    };
    private readonly Button retry = new()
    {
        Text = "Reintentar",
        Width = 145,
        Height = 44,
        Visible = false,
        FlatStyle = FlatStyle.System
    };

#if WINDOWS_SMOKE_TESTS
    internal static string TestProfile = "";
    internal static Action<CoreWebView2>? ConfigureTestBrowser;
    internal bool NoticeVisible => notice.Visible;
    internal void SetNetworkForTest(bool available) => UpdateNetworkAvailability(available);
    internal Task RetryForTestAsync() => ReloadOrStartAsync();
#endif
    private bool initialized;
    private bool initializing;
    private bool recreateBrowser;
    private bool networkNotice;
    private bool returnHome;
    private readonly LinkLabel help = new() { Text = "Abrir Moderno.app en el navegador", AutoSize = true, Anchor = AnchorStyles.None };
    private string helpAddress = "https://app.moderno.app/";

    public MainWindow()
    {
        Text = "Moderno.app";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(800, 520);
        BackColor = Color.FromArgb(246, 244, 235);
        KeyPreview = true;

        var center = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3,
            BackColor = notice.BackColor
        };
        center.RowStyles.Add(new RowStyle(SizeType.Percent, 45));
        center.RowStyles.Add(new RowStyle(SizeType.Absolute, 180));
        center.RowStyles.Add(new RowStyle(SizeType.Percent, 55));

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3
        };
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 30));
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 20));
        message.AutoSize = false;
        message.Dock = DockStyle.Fill;
        message.TextAlign = ContentAlignment.MiddleCenter;
        retry.Anchor = AnchorStyles.None;
        actions.Controls.Add(message, 0, 0);
        actions.Controls.Add(retry, 0, 1);
        actions.Controls.Add(help, 0, 2);
        help.LinkClicked += (_, _) => OpenInSystemBrowser(helpAddress);

        center.Controls.Add(new Panel(), 0, 0);
        center.Controls.Add(actions, 0, 1);
        center.Controls.Add(new Panel(), 0, 2);
        notice.Controls.Add(center);
        Controls.Add(browser);
        Controls.Add(notice);
        notice.BringToFront();

        retry.Click += async (_, _) => await ReloadOrStartAsync();
        Shown += async (_, _) => await InitializeAsync();
        KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R))
            {
                e.Handled = true;
                e.SuppressKeyPress = true;
                if (initialized && !recreateBrowser) browser.CoreWebView2.Reload();
            }
        };
        NetworkChange.NetworkAvailabilityChanged += NetworkAvailabilityChanged;
        FormClosed += (_, _) => NetworkChange.NetworkAvailabilityChanged -= NetworkAvailabilityChanged;
    }

    private void NetworkAvailabilityChanged(object? sender, NetworkAvailabilityEventArgs e)
    {
        if (IsDisposed || !IsHandleCreated) return;
        try
        {
            BeginInvoke(new Action(() => UpdateNetworkAvailability(e.IsAvailable)));
        }
        catch (InvalidOperationException) { /* La ventana se está cerrando. */ }
    }

    private void UpdateNetworkAvailability(bool available)
    {
        if (IsDisposed) return;
        if (!available && !notice.Visible)
        {
            ShowNotice("Sin conexión. Conecta internet para continuar. Tu ventana se conserva.", true);
            networkNotice = true;
        }
        else if (available && networkNotice)
        {
            // Nunca recargar al volver la red: podría haber un formulario pendiente.
            networkNotice = false;
            notice.Visible = false;
        }
    }

    private async Task InitializeAsync()
    {
        if (initialized || initializing) return;
        initializing = true;

        message.Text = "Conectando con Moderno.app…";
        help.Text = "Abrir Moderno.app en el navegador";
        helpAddress = AppAddress.AbsoluteUri;
        retry.Visible = false;
        notice.Visible = true;

        try
        {
            // Un perfil por usuario Windows; conserva la sesion local como un navegador.
            // No compartir ni copiar sus cookies a otro equipo ni al repositorio.
            var profile = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Moderno.app", "Windows", "WebView2");

#if WINDOWS_SMOKE_TESTS
            profile = TestProfile;
#endif
            Directory.CreateDirectory(profile);
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
            await browser.EnsureCoreWebView2Async(environment);

            var core = browser.CoreWebView2;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsWebMessageEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = true;

            core.NavigationStarting += (_, e) =>
            {
                if (NavigationPolicy.IsInternal(e.Uri)) return;
                e.Cancel = true;
                HandleExternalNavigation(e.Uri);
            };

            core.NewWindowRequested += (_, e) =>
            {
                // Nunca abrir ventanas no verificadas dentro del contenedor.
                e.Handled = true;
                if (NavigationPolicy.IsInternal(e.Uri))
                    core.Navigate(e.Uri);
                else
                    HandleExternalNavigation(e.Uri);
            };

            core.PermissionRequested += (_, e) =>
            {
                // Ningun permiso de dispositivo se concede automaticamente.
                e.State = CoreWebView2PermissionState.Deny;
            };

            core.DownloadStarting += (_, e) =>
            {
                var deferral = e.GetDeferral();
                // Salir del callback WebView2 antes de abrir un diálogo modal.
                BeginInvoke(new Action(() =>
                {
                    try
                    {
                        if (IsDisposed) { e.Cancel = true; return; }
                        using var save = new SaveFileDialog
                        {
                            FileName = Path.GetFileName(e.ResultFilePath),
                            Filter = "Todos los archivos (*.*)|*.*",
                            OverwritePrompt = true,
                            RestoreDirectory = true
                        };
                        if (save.ShowDialog(this) == DialogResult.OK)
                            e.ResultFilePath = save.FileName;
                        else
                            e.Cancel = true;
                    }
                    finally { deferral.Complete(); }
                }));
                // Conservar UI de WebView2 para progreso, cancelación y fallos.
            };

            core.NavigationCompleted += (_, e) =>
            {
                if (e.IsSuccess && e.HttpStatusCode < 400)
                {
                    notice.Visible = networkNotice;
                    return;
                }

                // Cancelaciones y descargas no son fallos de internet.
                if (e.WebErrorStatus == CoreWebView2WebErrorStatus.OperationCanceled) return;
                if (browser.Source is { } current && NavigationPolicy.IsInternal(current.AbsoluteUri))
                {
                    ShowNotice("No se pudo cargar Moderno.app. Comprueba tu conexión a internet.", canRetry: true);
                }
            };

            core.ProcessFailed += (_, e) =>
            {
                if (e.ProcessFailedKind != CoreWebView2ProcessFailedKind.BrowserProcessExited &&
                    e.ProcessFailedKind != CoreWebView2ProcessFailedKind.RenderProcessExited &&
                    e.ProcessFailedKind != CoreWebView2ProcessFailedKind.RenderProcessUnresponsive) return;
                recreateBrowser = e.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited;
                ShowNotice("La ventana web se ha detenido. Puedes volver a cargarla.", canRetry: true);
            };

            // Desactivar caché HTTP no borra cookies ni almacenamiento de sesión.
            await core.CallDevToolsProtocolMethodAsync("Network.enable", "{}");
            await core.CallDevToolsProtocolMethodAsync("Network.setCacheDisabled", "{\"cacheDisabled\":true}");
#if WINDOWS_SMOKE_TESTS
            ConfigureTestBrowser!(core);
#endif
            initialized = true;
            browser.Source = AppAddress;
        }
        catch (WebView2RuntimeNotFoundException)
        {
            help.Text = "Instalar WebView2 desde Microsoft";
            helpAddress = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/";
            ShowNotice(
                "Este equipo necesita Microsoft Edge WebView2 Runtime. " +
                "Instálalo desde la web oficial de Microsoft y pulsa Reintentar.",
                canRetry: true);
        }
        catch (Exception)
        {
            recreateBrowser = true;
            // No mostrar detalles internos ni rutas locales en mensajes al usuario.
            ShowNotice("No se ha podido iniciar la aplicación. Comprueba la conexión y vuelve a intentarlo.", canRetry: true);
        }
        finally
        {
            initializing = false;
        }
    }

    private async Task ReloadOrStartAsync()
    {
        if (initializing) return;
        if (networkNotice)
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) return;
            networkNotice = false;
            notice.Visible = false;
            return;
        }
        if (recreateBrowser)
        {
            Controls.Remove(browser);
            browser.Dispose();
            browser = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(browser);
            notice.BringToFront();
            initialized = false;
            recreateBrowser = false;
        }
        if (!initialized)
        {
            await InitializeAsync();
            return;
        }

        message.Text = "Conectando con Moderno.app…";
        retry.Visible = false;
        notice.Visible = true;
        try
        {
            if (returnHome)
            {
                returnHome = false;
                browser.CoreWebView2.Navigate(AppAddress.AbsoluteUri);
            }
            else browser.CoreWebView2.Reload();
        }
        catch (InvalidOperationException)
        {
            recreateBrowser = true;
            ShowNotice("La ventana necesita reiniciarse. Pulsa Reintentar.", true);
        }
    }

    private void ShowNotice(string text, bool canRetry)
    {
        if (IsDisposed) return;
        if (InvokeRequired)
        {
            BeginInvoke(new Action(() => ShowNotice(text, canRetry)));
            return;
        }

        networkNotice = false;
        message.Text = text;
        retry.Visible = canRetry;
        notice.Visible = true;
        notice.BringToFront();
    }

    private void HandleExternalNavigation(string? location)
    {
        if (NavigationPolicy.IsGoogleSignIn(location))
        {
            returnHome = true;
            ShowNotice("El inicio con Google aún no es compatible con esta beta. " +
                "Puedes usar Moderno.app en tu navegador habitual; esa sesión no se transfiere a esta ventana.", true);
            return;
        }
        OpenInSystemBrowser(location);
    }

    private static void OpenInSystemBrowser(string? location)
    {
        if (!NavigationPolicy.IsExternal(location)) return;
        var uri = new Uri(location!);

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
        catch
        {
            // Un enlace externo no debe cerrar ni bloquear la app.
        }
    }
}
