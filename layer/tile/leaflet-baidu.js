/**
 * Projection class for Baidu Spherical Mercator
 *
 * @class BaiduSphericalMercator
 */
L.Projection.BaiduSphericalMercator = {
    /**
     * Project latLng to point coordinate
     *
     * @method project
     * @param {Object} latLng coordinate for a point on earth
     * @return {Object} leafletPoint point coordinate of L.Point
     */
    project: function(latLng) {
        var projection = new BMap.MercatorProjection();
        var point = projection.lngLatToPoint(
            new BMap.Point(latLng.lng, latLng.lat)
        );
        var leafletPoint = new L.Point(point.x, point.y);
        return leafletPoint;
    },

    /**
     * unproject point coordinate to latLng
     *
     * @method unproject
     * @param {Object} bpoint baidu point coordinate
     * @return {Object} latitude and longitude
     */
    unproject: function (bpoint) {
        var projection= new BMap.MercatorProjection();
        var point = projection.pointToLngLat(
            new BMap.Pixel(bpoint.x, bpoint.y)
        );
        var latLng = new L.LatLng(point.lat, point.lng);
        return latLng;
    },

    /**
     * Don't know how it used currently.
     *
     * However, I guess this is the range of coordinate.
     * Range of pixel coordinate is gotten from
     * BMap.MercatorProjection.lngLatToPoint(180, -90) and (180, 90)
     * After getting max min value of pixel coordinate, use
     * pointToLngLat() get the max lat and Lng.
     */
    bounds: (function () {
        var MAX_X= 20037726.37;
        var MIN_Y= -11708041.66;
        var MAX_Y= 12474104.17;
        var bounds = L.bounds(
            [-MAX_X, MIN_Y], //-180, -71.988531
            [MAX_X, MAX_Y]  //180, 74.000022
        );
        bounds = new L.Bounds(
            [-33554432, -33554432],
            [33554432, 33554432]
        );
        return bounds;
    })()
};

/**
 * Transformation class for Baidu Transformation.
 * Basically, it contains the conversion of point coordinate and
 * pixel coordinate.
 *
 * @class BTransformation
 */
L.BTransformation = function () {
};

L.BTransformation.prototype = {
    // MAXZOOM: 19,
    MAXZOOM: 18,
    /**
     * Don't know how it used currently.
     */
    transform: function (point, scale, zoom) {
        return this._transform(point.clone(), scale, zoom);
    },

    /**
     * transform point coordinate to pixel coordinate
     *
     * @method _transform
     * @param {Object} point point coordinate
     * @param {Number} zoom zoom level of the map
     * @return {Object} point, pixel coordinate
     */
    _transform: function (point, scale, zoom) {
        point.x = point.x >> (this.MAXZOOM - zoom);
        point.y = point.y >> (this.MAXZOOM - zoom);
        point.x = point.x + scale;
        point.y = -point.y + scale;
        return point;
    },

    /**
     * transform pixel coordinate to point coordinate
     *
     * @method untransform
     * @param {Object} point pixel coordinate
     * @param {Number} zoom zoom level of the map
     * @return {Object} point, point coordinate
     */
    untransform: function (point, scale, zoom) {
        var x1 = point.x - scale;
        var y1 = scale - point.y;
        var x = x1 << (this.MAXZOOM - zoom);
        var y = y1 << (this.MAXZOOM - zoom);
        return new L.Point(x, y);
    }
};

/**
 * Coordinate system for Baidu EPSG3857
 *
 * @class BEPSG3857
 */
L.CRS.BEPSG3857 = L.extend({}, L.CRS, {
    /**
     * transform latLng to pixel coordinate
     *
     * @method latLngToPoint
     * @param {Object} latlng latitude and longitude
     * @param {Number} zoom zoom level of the map
     * @return {Object} pixel coordinate calculated for latLng
     */
    latLngToPoint: function (latlng, zoom) { // (LatLng, Number) -> Point
        var projectedPoint = this.projection.project(latlng);
        var scale = this.scale(zoom);
        return this.transformation._transform(projectedPoint, scale, zoom);
    },

    /**
     * transform pixel coordinate to latLng
     *
     * @method pointToLatLng
     * @param {Object} point pixel coordinate
     * @param {Number} zoom zoom level of the map
     * @return {Object} latitude and longitude
     */
    pointToLatLng: function (point, zoom) { // (Point, Number[, Boolean]) -> LatLng
        var scale = this.scale(zoom);
        var untransformedPoint = this.transformation.untransform(point, scale, zoom);
        return this.projection.unproject(untransformedPoint);
    },

    // defines how the world scales with zoom
    scale: function (zoom) {
        return 256 * Math.pow(2, zoom - 1);
    },

    // returns the bounds of the world in projected coords if applicable
    getProjectedBounds: function (zoom) {
        if (this.infinite) { return null; }

        var b = this.projection.bounds,
            min = this.transformation.transform(b.min, zoom),
            max = this.transformation.transform(b.max, zoom);

        return L.bounds(min, max);
    },

    code: 'EPSG:3857',
    projection: L.Projection.BaiduSphericalMercator,

    transformation: new L.BTransformation()
});

/**
 * Tile layer for Baidu Map
 *
 * @class BaiduLayer
 */
L.TileLayer.BaiduLayer = L.TileLayer.extend({
    options: {
        subdomains: ['online1', 'online2', 'online3'],
        attribution: '© 2014 Baidu - GS(2012)6003;- Data © <a target="_blank" href="http://www.navinfo.com/">NavInfo</a> & <a target="_blank" href="http://www.cennavi.com.cn/">CenNavi</a> & <a target="_blank" href="http://www.365ditu.com/">DaoDaoTong</a>',
    },

    initialize: function (url, options) {
        url = url || 'http://{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=pl';
        L.TileLayer.prototype.initialize.call(this, url, options);
    },

    getTileUrl: function (coords) {
        var offset = Math.pow(2, coords.z - 1),
            x = coords.x - offset,
            y = offset - coords.y - 1,
            baiduCoords = L.point(x, y);
        baiduCoords.z = coords.z;
        return L.TileLayer.prototype.getTileUrl.call(this, baiduCoords);
    }
});

L.tileLayer.baiduLayer = function (url, options) {
    return new L.TileLayer.BaiduLayer(url, options);
};
