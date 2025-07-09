const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    sidepanel: './src/sidepanel/index.tsx',
    popup: './src/popup/index.tsx',
    background: './src/background/background.ts',
    content: './src/content/content.ts',
    auth: './src/auth/auth.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript'
              ]
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@nest/shared': path.resolve(__dirname, '../shared/src'),
    },
    fallback: {
      "fs": false,
      "path": false,
      "url": false,
      "http": false,
      "https": false,
      "zlib": false,
      "stream": false,
      "crypto": false,
      "buffer": false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/sidepanel/sidepanel.html',
      filename: 'sidepanel.html',
      chunks: ['sidepanel']
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/auth/auth.html',
      filename: 'auth.html',
      chunks: ['auth']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/icons', to: 'icons' }
      ]
    })
  ],
  devtool: 'inline-source-map'
}; 