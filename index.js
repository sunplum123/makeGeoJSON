var map;
var geojson;
var vectorLayer = new ol.layer.Vector({
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'steelblue',
            width: 0.4
        })
    })
});

$(function () {
    $("#search").click(function () {
        var searchValue = $("#searchValue").val();
        if (searchValue) {
            if (searchValue == "中国") {
                searchAreaCode("", "", "getchildren", getChildrenOfArea);
            } else {
                searchAreaCode("keyword", searchValue, "search", searchAreaName);
            }
        }
    });
    initGeoJSON();
    initMap();
})


/**
 * 初始化地图
 */
function initMap() {
    var layer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });
    var mapBox = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoic3VucGx1bTEyMyIsImEiOiJjaXczMDhvY3YwMTNtMnRtdzJuYXZ0OWt3In0.RYw02H_wuVnM7zieJtutTQ'
        })
    });
    map = new ol.Map({
        layers: [mapBox, vectorLayer],
        target: 'map',
        view: new ol.View({
            zoom: 3,
            center: [116, 40],
            projection: 'EPSG:4326'
        })
    });
}

/**
 * 初始化GeoJSON对象
 */
function initGeoJSON() {
    geojson = {
        type: "FeatureCollection",
        features: new Array()
    }
}

function searchAreaName(dataTemp) {
    // 清空展示条
    $("#show-repeat-search").empty();
    var data = JSON.parse(dataTemp);
    var result = data.result[0];
    // 得到行政区划数据
    if (result && result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            var area = result[i];
            if (!area.level || area.level <= 3) {
                var button = $("<button>").attr("class", "btn btn-info btn-xs").text(" " + result[i].address).click(function () {
                    $(this).addClass("active");
                    if ($("#getChildren").is(":checked")) {
                        searchAreaCode("id", result[i].id, "getchildren", getChildrenOfArea);
                    } else {
                        makeGeojson(result[i], true);
                    }
                });
                var span = $("<span>").attr("class", "glyphicon glyphicon-home");
                button.prepend(span);
                $("#show-repeat-search").append(button).append("&nbsp;&nbsp;");
            }
        }
    } else {
        var button = $("<button>").attr("class", "btn btn-default btn-xs disabled")
            .text("无可用的行政区划数据!");
        $("#show-repeat-search").append(button);
    }
}

function getChildrenOfArea(data) {
    data = JSON.parse(data);
    if (data.result && data.result[0].length > 0) {
        var result = data.result[0];
        for (let i = 0; i < result.length; i++) {
            var drawVector = false;
            if (i == (result.length - 1)) {
                drawVector = true;
            }
            makeGeojson(result[i], drawVector);
        }
    } else {
        var button = $("<button>").attr("class", "btn btn-default btn-xs disabled")
            .text("无可用的行政区划数据!");
        $("#show-repeat-search").append(button);
    }
}
/**
 * 查询行政区
 * @param areaType
 * @param areaValue
 * @param searchType
 */
function searchAreaCode(areaType, areaValue, searchType, callback) {
    var http = require('http');
    var util = require('util');
    var querystring = require('querystring');
    var params = {
        key: "EQMBZ-ZB4HR-4LIWJ-WA6JE-VX6Y6-LYB2W"
    };
    params[areaType] = areaValue;
    var options = {
        host: "apis.map.qq.com",
        port: 80,
        path: "/ws/district/v1/" + searchType + "?" + querystring.stringify(params),
        method: 'GET'
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var dataTemp = "";
        res.on('data', function (chunk) {
            dataTemp += chunk;
        });
        res.on('end', function () {
            callback.call(this, dataTemp);
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

function makeGeojson(area, drawVector) {
    console.log(area);
    var http = require('http');
    var util = require('util');
    var querystring = require('querystring');
    var params = {
        method: "mapAreaSearch",
        type: 0,
        key: area.id
    };
    var options = {
        host: "www.webmap.cn",
        port: 80,
        path: "/mapDataAction.do?" + querystring.stringify(params),
        method: 'GET',
    };
    var req = http.request(options, function (res) {
        if (res.statusCode == 200) {
            var dataTemp = "";
            res.on('data', function (chunk) {
                dataTemp += chunk;
            });
            res.on('end', function () {
                try {
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
                    if (drawVector) {
                        makeMap();
                    }
                } catch (err) {
                    console.log(dataTemp);
                    console.log(err);
                }
            })
            res.on('error', function (err) {
                console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
                util.log('请求结果错误： ' + err);
            });
        } else {
            var checkedArea = searchAdminDataStore(area, adminDataStore, 2);
            makeGeojson(checkedArea, drawVector);
        }
    });
    req.on('error', function (err) {
        util.log('请求错误：' + err);
    });
    req.end();
}
/**
 * 通过缓存校验
 */
function searchAdminDataStore(area, areas, index) {
    var code = area.id;
    var name = getName(area.fullname);
    var cCode = getCode(code, index);
    for (var i = 0; i < areas.length; i++) {
        var proc = areas[i];
        var areaCode = proc.pac;
        var areaName = getName(proc.name);
        if (areaName == name) {
            var result = {
                id: areaCode,
                fullname: proc.name
            };
            return result;
        } else {
            if (areaCode == cCode) {
                return searchAdminDataStore(area, proc.children, index + 2);
            }
        }
    }
}

function getName(name) {
    var cons = ["省", "市", "县", "区", "州"];
    for (var i = 0; i < cons.length; i++) {
        var name_fix = cons[i];
        var index = name.indexOf(name_fix);
        if (index != -1) {
            return name.substring(0, index);
        }
    }
}

function getCode(code, index) {
    code = code.substring(0, index) + '000000';
    return code.substring(0, 6);
}


function makeMap() {
    var source = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(geojson)
    });
    vectorLayer.setSource(source);
    vectorLayer.changed();
    map.getView().fit(source.getExtent(), map.getSize());
    $("#export").show();
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

function clearGeoJSON() {
    initGeoJSON();
    $("#show-repeat-search").empty();
    vectorLayer.setSource(null);
}

function exportGeoJSON() {
    var fs = require('fs');
    fs.writeFile('GeoJSON.json', JSON.stringify(geojson), function (err) {
        if (err) throw err;
        console.log('It\'s saved!');
    });
}
