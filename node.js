
var http = require('http');
var util = require('util');
var querystring = require('querystring');
var params = {
    method: "mapAreaSearch",
    type:0,
    key:520200
};
var options = {
    host: "www.webmap.cn",
    port: 80,
    path: "/mapDataAction.do?"+querystring.stringify(params),
    method: 'GET'
};
var req = http.request(options, function (res) {
    res.setEncoding('utf8');
    var dataTemp = "";
    res.on('data', function (chunk) {
        dataTemp += chunk;
    });
    res.on('end', function () {
        console.log(dataTemp);
    })
    res.on('error', function (err) {
        util.log('请求结果错误： ' + err);
    });
});
req.on('error', function (err) {
    util.log('请求错误：' + err);
});
req.end();