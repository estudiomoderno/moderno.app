using System.Diagnostics;
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
    private static readonly Uri AppAddress = new("https://app.moderno.app/");

    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
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

    private bool initialized;

    public MainWindow()
    {
        Text = "Moderno.app";
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
            RowCount = 2
        };
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 65));
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 35));
        message.AutoSize = false;
        message.Dock = DockStyle.Fill;
        message.TextAlign = ContentAlignment.MiddleCenter;
        retry.Anchor = AnchorStyles.None;
        actions.Controls.Add(message, 0, 0);
        actions.Controls.Add(retry, 0, 1);

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
                if (initialized) browser.CoreWebView2.Reload();
            }
        };
    }

    private async Task InitializeAsync()
    {
        if (initialized) return;

        message.Text = "Conectando con Moderno.app…";
        retry.Visible = false;
        notice.Visible = true;

        try
        {
            // Un perfil por usuario Windows; conserva la sesion local como un navegador.
            // No compartir ni copiar sus cookies a otro equipo ni al repositorio.
            var profile = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Moderno.app", "Windows", "WebView2");

            Directory.CreateDirectory(profile);
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
            await browser.EnsureCoreWebView2Async(environment);

            var core = browser.CoreWebView2;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsWebMessageEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = true;

            core.NavigationStarting += (_, e) =>
            {
                if (IsAppNavigation(e.Uri)) return;
                e.Cancel = true;
                OpenInSystemBrowser(e.Uri);
            };

            core.NewWindowRequested += (_, e) =>
            {
                // Nunca abrir ventanas no verificadas dentro del contenedor.
                e.Handled = true;
                OpenInSystemBrowser(e.Uri);
            };

            core.PermissionRequested += (_, e) =>
            {
                // Ningun permiso de dispositivo se concede automaticamente.
                e.State = CoreWebView2PermissionState.Deny;
            };

            core.NavigationCompleted += (_, e) =>
            {
                if (e.IsSuccess)
                {
                    notice.Visible = false;
                    return;
                }

                // No confundir cancelaciones por enlaces externos con falta de red.
                if (browser.Source is { } current && IsAppNavigation(current.AbsoluteUri))
                {
                    ShowNotice("No se pudo cargar Moderno.app. Comprueba tu conexión a internet.", canRetry: true);
                }
            };

            core.ProcessFailed += (_, _) =>
            {
                // Un fallo del proceso web no afecta datos del servidor.
                ShowNotice("La ventana web se ha detenido. Puedes volver a cargarla.", canRetry: true);
            };

            initialized = true;
            browser.Source = AppAddress;
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowNotice(
                "Este equipo necesita Microsoft Edge WebView2 Runtime. " +
                "Instálalo desde la web oficial de Microsoft y pulsa Reintentar.",
                canRetry: true);
        }
        catch (Exception)
        {
            // No mostrar detalles internos ni rutas locales en mensajes al usuario.
            ShowNotice("No se ha podido iniciar la aplicación. Comprueba la conexión y vuelve a intentarlo.", canRetry: true);
        }
    }

    private async Task ReloadOrStartAsync()
    {
        if (!initialized)
        {
            await InitializeAsync();
            return;
        }

        message.Text = "Conectando con Moderno.app…";
        retry.Visible = false;
        notice.Visible = true;
        browser.CoreWebView2.Navigate(AppAddress.AbsoluteUri);
    }

    private void ShowNotice(string text, bool canRetry)
    {
        if (IsDisposed) return;
        if (InvokeRequired)
        {
            BeginInvoke(new Action(() => ShowNotice(text, canRetry)));
            return;
        }

        message.Text = text;
        retry.Visible = canRetry;
        notice.Visible = true;
        notice.BringToFront();
    }

    private static bool IsAppNavigation(string? location)
    {
        if (!Uri.TryCreate(location, UriKind.Absolute, out var uri)) return false;
        return uri.Scheme == Uri.UriSchemeHttps &&
               (uri.Host.Equals("app.moderno.app", StringComparison.OrdinalIgnoreCase) ||
                uri.Host.Equals("auth.moderno.app", StringComparison.OrdinalIgnoreCase));
    }

    private static void OpenInSystemBrowser(string? location)
    {
        if (!Uri.TryCreate(location, UriKind.Absolute, out var uri)) return;
        if (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp) return;

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
