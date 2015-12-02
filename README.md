npm install --save react react-dom babelify babel-preset-react
browserify -t [ babelify --presets [ react ] ] app.jsx -o app.jsx
