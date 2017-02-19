const electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var Tray = electron.Tray;
var Menu = electron.Menu;

var mainWindow = null;

var appIcon = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

//v0.30.2
app.on('activate-with-no-open-windows', function() {
    console.log("activate-with-no-open-windows");
    if (!mainWindow) {
        createMainWindow();
    }
});

//v0.34.2
app.on("activate", function(event, hasVisibleWindows) {
    console.log("app activate:" + hasVisibleWindows);
    if (!mainWindow) {
        createMainWindow();
    }
});

console.log("exec path:" + process.execPath);
console.log("user data path:" + app.getPath("userData"));
console.log("app path:" + app.getAppPath());


function createAppTray() {
    var iconPath = __dirname + '/icon.png';
    var appIcon = new Tray(iconPath);
    var contextMenu = Menu.buildFromTemplate([
        { 
            label: '退出', type: 'normal',
            click:function() { 
                console.log("quit");
                app.quit();
            },
        },
    ]);
    appIcon.setToolTip('This is my application.');
    appIcon.setContextMenu(contextMenu);
    return appIcon;
}

function createMainWindow() {
    var opts = {
        width: 1024, 
        height: 800, 
        'web-preferences': {'web-security': true}
    };

    mainWindow = new BrowserWindow(opts);

    //mainWindow.loadUrl("http://dev.gobelieve.io/");
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    mainWindow.openDevTools();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
}

// In main process.
var ipc = require('electron').ipcMain;
ipc.on('set-badge', function(event, arg) {
    if (process.platform == 'darwin') {
        app.dock.setBadge(arg);
    }
    event.returnValue = "ok";
});

app.on('ready', function() {
    createAppTray();
    createMainWindow();
});
