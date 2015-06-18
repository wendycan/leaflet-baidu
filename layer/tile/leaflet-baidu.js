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
    transform: function (point, zoom) {
        return this._transform(point.clone(), zoom);
    },

    /**
     * transform point coordinate to pixel coordinate
     *
     * @method _transform
     * @param {Object} point point coordinate
     * @param {Number} zoom zoom level of the map
     * @return {Object} point, pixel coordinate
     */
    _transform: function (point, zoom) {
        point.x = point.x >> (this.MAXZOOM - zoom);
        point.y = point.y >> (this.MAXZOOM - zoom);
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
    untransform: function (point, zoom) {
        var x = point.x << (this.MAXZOOM - zoom);
        var y = point.y << (this.MAXZOOM - zoom);
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
        return this.transformation._transform(projectedPoint, zoom);
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
        var untransformedPoint = this.transformation.untransform(point, zoom);
        return this.projection.unproject(untransformedPoint);
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
 * @class Baidu
 */
L.Baidu = L.TileLayer.extend({
    options: {
        subdomains: ['online1', 'online2', 'online3'],
        //TODO: decode utf8 characters in attribution
        attribution: '© 2014 Baidu - GS(2012)6003;- Data © <a target="_blank" href="http://www.navinfo.com/">NavInfo</a> & <a target="_blank" href="http://www.cennavi.com.cn/">CenNavi</a>',
    },

    /**
     * initialize the map with key and tile URL
     *
     * @method initialize
     * @param {String} key access key of baidu map
     * @param {Object} options, option of the map
     */
    initialize: function (key, options) {
        this._key = key;
        var url = 'http://{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=pl';
        L.TileLayer.prototype.initialize.call(this, url, options);
    },

    /**
     * Set the corresponding position of tiles in baidu map.
     * if point.y is less or equal than 256, i.e. 35=>291, -221=>547
     * if point.y is greater than 256, i.e. 291=>35, 547=>-221
     *
     * @method _getTilePos
     * @param {Object} coords tile coordinate
     * @return {Object} point left and top property of <img>
     */
    _getTilePos: function (coords) {
        var map = this._map,
            size = map.getSize(),
            origin = this._level.origin;
        var offsetX = coords.x * this._tileSize - origin.x;
        var offsetY = origin.y + size.y - (coords.y + 1) * this._tileSize;
        return new L.Point(offsetX, offsetY);
    }
});

L.map = function (id, options) {
    var map = new L.Map(id, options);

    /**
     * load new tiles when set zoom for baidu map
     * Works well: mouse scroll. zoom level <= 14 in double click
     * Works not well: zoom level > 14. Not Accurate at all.
     * TODO: figure out why not accurate. Potential: CRS differences.
     *
     * @method _setZoomAroundBaidu
     * @param {Object} latlng position of mouse clicked on the canvas
     * @param {Number} zoom zoom level
     * @param {Object} options options of the map
     * @return {Object} TODO: not sure for now. probably the map itself
     */
    var setZoomAroundBaidu = function (latlng, zoom, options) {
        var scale = this.getZoomScale(zoom);
        var viewHalf = this.getSize().divideBy(2);
        var containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng);
        var centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale);
        var newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
        var oldCenterLat = this.getCenter().lat;
        //add offset rather than minus it
        newCenter.lat = oldCenterLat - newCenter.lat + oldCenterLat;
        return this.setView(newCenter, zoom, {zoom: options});
    };

    /**
     * Override _getTopLeftPoint method. For Baidu Map, if dragging
     * down side of the map, y will increase rather than decrease.
     * vice versa.
     *
     * @method _getTopLeftPoint
     * @return {Object} point top left point
     */
    var _getTopLeftPointBaidu = function () {
        var pixel = this.getPixelOrigin();
        var pane = this._getMapPanePos();
        var point = new L.Point(pixel.x - pane.x, pixel.y + pane.y);
        return point;
    };

    var _getNewPixelOriginBaidu = function (center, zoom) {
        var viewHalf = this.getSize()._divideBy(2);
        return this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round();
    };

    // layer point of the current center
    var _getCenterLayerPointBaidu = function () {
        return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
    };

    //if option has baidu, use custom method
    if (options.baidu === true) {
        map._getTopLeftPoint = _getTopLeftPointBaidu;
        map.setZoomAround = setZoomAroundBaidu;
        map._getNewPixelOrigin = _getNewPixelOriginBaidu;
        // TODO: just same code as Map.js
        map._getCenterLayerPoint = _getCenterLayerPointBaidu;
    }

    return map;
};

L.baiduLayer = function (key, options) {
    return new L.Baidu(key, options);
};
