##编译jsx文件
1.npm install --save react react-dom babelify babel-preset-react
2.browserify --ignore-missing  --no-commondir --insert-global-vars=\"global\" --no-browser-field -t [ babelify --presets [ es2015 react ] --plugins [ transform-object-rest-spread ] ] app.jsx -o app.js




watchify --debug --ignore-missing  --no-commondir --insert-global-vars=\"global\" --no-browser-field -t [ babelify --presets [ es2015 react ] --plugins [ transform-object-rest-spread ] ]  app.jsx -o app.js


##编译scss
1. 安装sass gem install sass

2. 编译scss cd app/css; sass --watch style.scss:style.css



##codesign
https://gist.github.com/jorangreef/27e708c67b7e6746a98a
