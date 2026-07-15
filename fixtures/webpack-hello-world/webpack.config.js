const path = require('path');

module.exports = {
  // Production mode: enables Terser minification + tree shaking
  mode: 'production',

  entry: './src/app.js',

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    // Clean output before each build
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },

  // Disable source maps so the bundle is a pure ground truth for the deobfuscator
  // unless explicitly requested via GENERATE_SOURCEMAP env var
  devtool: process.env.GENERATE_SOURCEMAP === 'true' ? 'source-map' : false,

  // Target ES5 via browserslist (reinforced by .babelrc)
  target: ['web', 'es5'],
};
