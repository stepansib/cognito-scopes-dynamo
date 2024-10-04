const slsw = require('serverless-webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

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

  plugins: [
    new CopyPlugin({
      patterns: [
        __dirname + '/api.yaml',
      ],
    }),
  ],

  module: {
    rules: [{
      test: /\.(tsx?)$/,
      loader: 'ts-loader',
      exclude: [[__dirname + '/node_modules', __dirname + '/.serverless', __dirname + '/.webpack']],
      options: {
        transpileOnly: true, experimentalWatchApi: true,
      },
    }],
  },
};
