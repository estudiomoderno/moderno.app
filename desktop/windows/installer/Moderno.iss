#ifndef PublishDir
  #error PublishDir is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif

[Setup]
AppId={{60D6263E-8A28-48DC-98B7-B887CC457023}
AppName=Moderno.app Beta
AppVersion=0.2.0
AppPublisher=Moderno.app
AppPublisherURL=https://app.moderno.app/
DefaultDirName={localappdata}\Programs\Moderno.app Beta
DefaultGroupName=Moderno.app Beta
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=Moderno-Windows-Beta-0.2.0-Setup-x64
SetupIconFile=..\Moderno.Windows\Assets\Moderno.ico
UninstallDisplayIcon={app}\Moderno.Windows.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no
InfoBeforeFile=beta-info.txt

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Moderno.app Beta"; Filename: "{app}\Moderno.Windows.exe"
Name: "{autodesktop}\Moderno.app Beta"; Filename: "{app}\Moderno.Windows.exe"; Tasks: desktopicon

; No borrar el perfil WebView2, no ejecutar la app durante instalación ni descargar runtimes.
