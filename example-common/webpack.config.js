const path = require('path');
const HtmlWebpackPlugin=require('html-webpack-plugin');
// const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry:{
        main:'./src/index.js'
    },
    mode: 'development',
    output:{
        filename:'[name].bundle.js',
        path:path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    devtool: 'cheap-module-eval-source-map',
    devServer: {
        contentBase: './dist/index.html',
        hot:true
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins:[
        // new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            title:'Output Management'
        }),
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin()
    ]
}