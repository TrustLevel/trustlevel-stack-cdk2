const webpack = require('../../../webpack.js');

module.exports = {
  entry: {
    index: './dist/index.js',
  },
  output: {
    libraryTarget: 'commonjs',
    filename: 'bundle/[name].js', // => To ./dist
  },
  ...webpack,
};
