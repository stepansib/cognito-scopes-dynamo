const slsw = require('serverless-webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  context: __dirname,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  devtool: slsw.lib.webpack.isLocal ? 'eval-cheap-module-source-map' : 'source-map',
  entry: slsw.lib.entries,
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.mjs', '.js', '.json', '.ts'],
    plugins: [new TsconfigPathsPlugin()],
  },

  module: {
    rules: [{
      test: /\.(tsx?)$/,
      loader: 'ts-loader',
      exclude: [[__dirname + 'node_modules', __dirname + '.serverless', __dirname + '.webpack']],
      options: {
        transpileOnly: true, experimentalWatchApi: true,
      },
    }],
  },
};
