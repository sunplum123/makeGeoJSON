$(function () {
    $("#search").click(function () {
        searchAreaCode($("#searchValue").val());
    });
})

var geojson = new function () {
    return {
        type: "FeatureCollection",
        features: new Array()
    }
}

function searchAreaCode(areaName) {
    var http = require('http');
    var util = require('util');
    var querystring = require('querystring');
    var params = {
        keyword: areaName,
        key: "EQMBZ-ZB4HR-4LIWJ-WA6JE-VX6Y6-LYB2W"
    };
    var options = {
        host: "apis.map.qq.com",
        port: 80,
        path: "/ws/district/v1/search?" + querystring.stringify(params),
        method: 'GET'
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var dataTemp = "";
        res.on('data', function (chunk) {
            dataTemp += chunk;
        });
        res.on('end', function () {
            $("#show-repeat-search").empty();
            var data = JSON.parse(dataTemp);
            var result = data.result[0];
            for (var i = 0; i < result.length; i++) {
                (function (index) {
                    var a = $("<a>").attr("href", "#").attr("class", "btn btn-primary").text(result[index].address).click(function () {
                        makeGeojson(result[index].id, result[index].location);
                    });
                    $("#show-repeat-search").append(a).append("&nbsp;&nbsp;");
                })(i)
            }
        })
        res.on('error', function (err) {
            util.log('请求结果错误： ' + err);
        });
    });

    req.on('error', function (err) {
        util.log('请求错误：' + err);
    });
    req.end();
}

function makeGeojson(areaCode, location) {
    var http = require('http');
    var util = require('util');
    var querystring = require('querystring');
    var params = {
        method: "mapAreaSearch",
        type: 0,
        key: areaCode
    };
    var options = {
        host: "www.webmap.cn",
        port: 80,
        path: "/mapDataAction.do?" + querystring.stringify(params),
        method: 'GET',
    };
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var dataTemp = "";
        res.on('data', function (chunk) {
            dataTemp += chunk;
        });
        res.on('end', function () {
            var data = JSON.parse(dataTemp);
            var itemList = data.itemList;
            var item = itemList[0];
            var geom = item.geom;
            var pattern = new RegExp("MULTIPOLYGON\\({3}([\\w\\W]*)\\){3}");
            var matcher = geom.match(pattern);
            var pointStr = matcher[1];
            var s1 = pointStr.split(/\)?\),\(?\(/g);
            var multipolygon = [];
            $.each(s1, function () {
                var polygon = [];
                var s2 = this.split(",");
                $.each(s2, function () {
                    var point = [];
                    var s3 = this.split(" ");
                    point.push(Number(s3[0]));
                    point.push(Number(s3[1]));
                    polygon.push(point);
                })
                multipolygon.push(polygon);
            });
            geojson.features.push(getFeature(multipolygon, {
                areaCode: item.name,
                name: item.bname
            }));
            makeMap(location);
        })
        res.on('error', function (err) {
            util.log('请求结果错误： ' + err);
        });
    });
    req.on('error', function (err) {
        util.log('请求错误：' + err);
    });
    req.end();
}


function makeMap(location) {
    var source = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(geojson)
    });
    var vectorLayer = new ol.layer.Vector({
        source: source,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 0.3
            }),
            fill: new ol.style.Fill({
                color: "red"
            })
        })
    })
    var center = [location.lng, location.lat];
    var map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        target: 'map',
        view: new ol.View({
            center: center,
            zoom: 10,
            projection: 'EPSG:4326'
        })
    });
    map.getView().fit(source.getExtent(), map.getSize());
}

function getFeature(cd, properites) {
    var coordinates = cd;
    var type = "Polygon";
    if (cd.length > 1) {
        type = "MultiPolygon";
        coordinates = [cd];
    }
    return {
        type: "Feature",
        geometry: {
            type: type,
            coordinates: coordinates
        },
        properites: properites
    };
}


function exportGeoJSON() {
    var fs = require('fs');
    fs.writeFile('GeoJSON.json', JSON.stringify(geojson), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
    });
}
