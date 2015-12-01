var app = require('app');
var BrowserWindow = require('browser-window'); 

var mainWindow = null;

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

function createMainWindow() {
    var opts = {
        width: 1024, 
        height: 800, 
        'web-preferences': {'web-security': false}
    };

    mainWindow = new BrowserWindow(opts);

    //mainWindow.loadUrl("http://dev.gobelieve.io/");
    mainWindow.loadUrl('file://' + __dirname + '/index.html');

    //mainWindow.openDevTools();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
}

app.on('ready', function() {
    createMainWindow();
});
