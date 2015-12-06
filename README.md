##编译jsx文件
1.npm install --save react react-dom babelify babel-preset-react
2.browserify -t [ babelify --presets [ react ] ] app.jsx -o app.js
