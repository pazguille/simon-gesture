/*!
 * Gesturekit v1.0.0
 * http://gesturekit.com/
 *
 * Copyright (c) 2014, RoamTouch
 * Released under the MIT license.
 * http://gesturekit.com/
 */
(function (window) {
'use strict';
//
// Point class
//
function Point(x, y, id) // constructor
{
    this.X = x;
    this.Y = y;
    this.ID = id; // stroke ID to which this point belongs (1,2,...)
}

//
// PointCloud class: a point-cloud template
//
function PointCloud(name, points) // constructor
{
    this.Name = name;

    var newpoints = new Array(points[0]);
    for (var i = 1; i < points.length; i++)
        newpoints[i] = new Point(points[i].X, points[i].Y, points[i].ID);
    this.Points = newpoints;

    this.DrawingPoints = this.Points;
}
//
// Result class
//
function Result(name, score) // constructor
{
    this.Name = name;
    this.Score = score;
}
//
// PDollarRecognizer class constants
//
var NumPointClouds; // = 8;
var NumPoints = 32;
var Origin = new Point(0,0,0);
var RECOGNITION_THRESHOLD = 1.5;
var NO_MATCH_NAME = "No match.";
var NO_MATCH_SCORE = 0.0;

function setNumPointClouds(num){
    NumPointClouds = NumPointClouds + num;
}
//
// PDollarRecognizer class
//
function PDollarRecognizer() // constructor
{
    //
    // one predefined point-cloud for each gesture
    //
    this.PointClouds = new Array(NumPointClouds);
    var ScopeClouds = this;
    var PointCloudScope = this;
    this.metadata = {};
    //
    // The $P Point-Cloud Recognizer API begins here -- 3 methods: Recognize(), AddGesture(), DeleteUserGestures()
    //
    this.Recognize = function (points) {
        points = Resample(points, NumPoints);
        points = Scale(points);
        points = TranslateTo(points, Origin);

        var b1 = +Infinity;
        var u1 = -1;
        var b2 = +Infinity;
        var u2 = -1;

        for (var i = 0; i < this.PointClouds.length; i++) // for each point-cloud template
        {
            var d = GreedyCloudMatch(points, this.PointClouds[i]);
            if (d < b1) {
                b2 = b1;
                u2 = u1;

                b1 = d; // best (least) distance
                u1 = i; // point-cloud
            }
            else
                if (d < b2) {
                    b2 = d;
                    u2 = i;
                }
        }

        if (u1 == -1)
            return new Result(NO_MATCH_NAME, NO_MATCH_SCORE);
        else {
            var d1 = GestureDistance(points, this.PointClouds[u1].Points);
            var d2 = GestureDistance(points, this.PointClouds[u2].Points);
            var name = "No match.";
            var best = 0.0;
            if (d2 < d1)
            {
                name = this.PointClouds[u2].Name;
                best = b2;
            }
            else
            {
                name = this.PointClouds[u1].Name;
                best = b1;
            }
            if(best<RECOGNITION_THRESHOLD)
                return new Result(name, Math.max((best - 2.0) / -2.0, 0.0));
            else
                return new Result(NO_MATCH_NAME, NO_MATCH_SCORE);
        }
    };
    this.AddGesture = function(name, points)
    {
        this.PointClouds[this.PointClouds.length] = new PointCloud(name, points);
        var num = 0;
        for (var i = 0; i < this.PointClouds.length; i++) {
            if (this.PointClouds[i].Name == name)
                num++;
        }
        return num;
    };

    this.DeleteUserGestures = function()
    {
        this.PointClouds.length = NumPointClouds; // clear any beyond the original set
        return NumPointClouds;
    };

    this.LoadGestureSet = function(gestureset)
    {
        PointCloudScope.PointClouds = new Array(gestureset.length);
        for (var i= 0; i < gestureset.length; i++) {
            var method = gestureset[i].method;
            var pointaArray = new Array();
            var gesture = gestureset[i].gesture;
            for (var j = 0; j < gesture.length; j++) {
                var id = gesture[j].ID;
                var X = gesture[j].X;
                var Y = gesture[j].Y;
                pointaArray[j]  = new Point(X,Y,id);
            }
            PointCloudScope.PointClouds[i] = new PointCloud(method, pointaArray);
        }
        console.log(PointCloudScope.toString);
    };

}
//
// Private helper functions from this point down
//
function GreedyCloudMatch(points, P)
{
    var e = 0.50;
    var step = Math.floor(Math.pow(points.length, 1 - e));
    var min = +Infinity;
    for (var i = 0; i < points.length; i += step) {
        var d1 = CloudDistance(points, P.Points, i);
        var d2 = CloudDistance(P.Points, points, i);
        min = Math.min(min, Math.min(d1, d2)); // min3
    }
    return min;
}
function CloudDistance(pts1, pts2, start)
{
    var matched = new Array(pts1.length); // pts1.length == pts2.length
    for (var k = 0; k < pts1.length; k++)
        matched[k] = false;
    var sum = 0;
    var i = start;
    do
    {
        var index = -1;
        var min = +Infinity;
        for (var j = 0; j < matched.length; j++)
        {
            if (!matched[j]) {
                var d = Distance(pts1[i], pts2[j]);
                if (d < min) {
                    min = d;
                    index = j;
                }
            }
        }
        matched[index] = true;
        var weight = 1 - ((i - start + pts1.length) % pts1.length) / pts1.length;
        sum += weight * min;
        i = (i + 1) % pts1.length;
    } while (i != start);
    return sum;
}
function Resample(points, n)
{
    var I = PathLength(points) / (n - 1); // interval length
    var D = 0.0;
    var newpoints = new Array(points[0]);
    for (var i = 1; i < points.length; i++)
    {
        if (points[i].ID == points[i-1].ID)
        {
            var d = Distance(points[i - 1], points[i]);
            if ((D + d) >= I)
            {
                var qx = points[i - 1].X + ((I - D) / d) * (points[i].X - points[i - 1].X);
                var qy = points[i - 1].Y + ((I - D) / d) * (points[i].Y - points[i - 1].Y);
                var q = new Point(qx, qy, points[i].ID);
                newpoints[newpoints.length] = q; // append new point 'q'
                points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
                D = 0.0;
            }
            else D += d;
        }
    }
    if (newpoints.length == n - 1) // sometimes we fall a rounding-error short of adding the last point, so add it if so
        newpoints[newpoints.length] = new Point(points[points.length - 1].X, points[points.length - 1].Y, points[points.length - 1].ID);
    return newpoints;
}
function Scale(points)
{
    var minX = +Infinity, maxX = -Infinity, minY = +Infinity, maxY = -Infinity;
    for (var i = 0; i < points.length; i++) {
        minX = Math.min(minX, points[i].X);
        minY = Math.min(minY, points[i].Y);
        maxX = Math.max(maxX, points[i].X);
        maxY = Math.max(maxY, points[i].Y);
    }
    var size = Math.max(maxX - minX, maxY - minY);
    var newpoints = new Array();
    for (var i = 0; i < points.length; i++) {
        var qx = (points[i].X - minX) / size;
        var qy = (points[i].Y - minY) / size;
        newpoints[newpoints.length] = new Point(qx, qy, points[i].ID);
    }
    return newpoints;
}
function TranslateTo(points, pt) // translates points' centroid
{
    var c = Centroid(points);
    var newpoints = new Array();
    for (var i = 0; i < points.length; i++) {
        var qx = points[i].X + pt.X - c.X;
        var qy = points[i].Y + pt.Y - c.Y;
        newpoints[newpoints.length] = new Point(qx, qy, points[i].ID);
    }
    return newpoints;
}
function Centroid(points)
{
    var x = 0.0, y = 0.0;
    for (var i = 0; i < points.length; i++) {
        x += points[i].X;
        y += points[i].Y;
    }
    x /= points.length;
    y /= points.length;
    return new Point(x, y, 0);
}
function PathDistance(pts1, pts2) // average distance between corresponding points in two paths
{
    var d = 0.0;
    for (var i = 0; i < pts1.length; i++) // assumes pts1.length == pts2.length
        d += Distance(pts1[i], pts2[i]);
    return d / pts1.length;
}
function PathLength(points) // length traversed by a point path
{
    var d = 0.0;
    for (var i = 1; i < points.length; i++)
    {
        if (points[i].ID == points[i-1].ID)
            d += Distance(points[i - 1], points[i]);
    }
    return d;
}
function Distance(p1, p2) // Euclidean distance between two points
{
    if (p2==undefined){
     alert();
    }
    var dx = p2.X - p1.X;
    var dy = p2.Y - p1.Y;
    return Math.sqrt(dx * dx + dy * dy);
}

function GestureDistance(g1, g2) {
    var d = 0.0;
    var nr = g1.length;
    if(g2.length < nr)
        nr = g2.length;

    for (var i = 0; i < nr; i++) {
        d = d + Distance(g1[i], g2[i]);
    }

    return d;
}

function Choose(best, secondBest, gesture) {
    var d1 = GestureDistance(gesture, best.Points);
    var d2 = GestureDistance(gesture, secondBest.Points);
    if (d2 < d1)
        return secondBest;
    else
        return best;
}
function Emitter() {
    return this;
}

/**
 * Adds a listener to the collection for a specified event.
 * @memberof! Emitter.prototype
 * @function
 * @param {String} event The event name to subscribe.
 * @param {Function} listener Listener function.
 * @param {Boolean} once Indicate if a listener function will be called only one time.
 * @example
 * // Will add an event listener to 'ready' event.
 * emitter.on('ready', listener);
 */
Emitter.prototype.on = function (event, listener, once) {

    this._eventsCollection = this._eventsCollection || {};

    listener.once = once || false;

    if (this._eventsCollection[event] === undefined) {
        this._eventsCollection[event] = [];
    }

    this._eventsCollection[event].push(listener);

    return this;
};

/**
 * Adds a listener to the collection for a specified event to will execute only once.
 * @memberof! Emitter.prototype
 * @function
 * @param {String} event Event name.
 * @param {Function} listener Listener function.
 * @returns {Object}
 * @example
 * // Will add an event handler to 'contentLoad' event once.
 * widget.once('contentLoad', listener);
 */
Emitter.prototype.once = function (event, listener) {

    this.on(event, listener, true);

    return this;
};

/**
 * Removes a listener from the collection for a specified event.
 * @memberof! Emitter.prototype
 * @function
 * @param {String} event Event name.
 * @param {Function} listener Listener function.
 * @returns {Object}
 * @example
 * // Will remove event listener to 'ready' event.
 * widget.off('ready', listener);
 */
Emitter.prototype.off = function (event, listener) {

    if (this._eventsCollection === undefined) {
        return this;
    }

    var listeners = this._eventsCollection[event],
        i = 0,
        len;

    if (listeners !== undefined) {
        len = listeners.length;
        for (i; i < len; i += 1) {
            if (listeners[i] === listener) {
                listeners.splice(i, 1);
                break;
            }
        }
    }

    return this;
};

/**
 * Returns all listeners from the collection for a specified event.
 * @memberof! Emitter.prototype
 * @function
 * @param {String} event The event name.
 * @returns {Array}
 * @example
 * // Returns listeners from 'ready' event.
 * widget.getListeners('ready');
 */
Emitter.prototype.getListeners = function (event) {

    return this._eventsCollection[event];
};

/**
 * Execute each item in the listener collection in order with the specified data.
 * @memberof! Emitter.prototype
 * @function
 * @param {String} event The name of the event you want to emit.
 * @param {...Object} var_args Data to pass to the listeners.
 * @example
 * // Will emit the 'ready' event with 'param1' and 'param2' as arguments.
 * widget.emit('ready', 'param1', 'param2');
 */
Emitter.prototype.emit = function () {

    var args = Array.prototype.slice.call(arguments, 0), // converted to array
        event = args.shift(), // Store and remove events from args
        listeners,
        i = 0,
        len;

    if (typeof event === 'string') {
        event = {'type': event};
    }

    if (!event.target) {
        event.target = this;
    }

    if (this._eventsCollection !== undefined && this._eventsCollection[event.type] !== undefined) {
        listeners = this._eventsCollection[event.type];
        len = listeners.length;

        for (i; i < len; i += 1) {
            listeners[i].apply(this, args);

            if (listeners[i].once) {
                this.off(event.type, listeners[i]);
                len -= 1;
                i -= 1;
            }
        }
    }

    return this;
};
var helpers = {};

/**
 * Returns a shallow-copied clone of a given object.
 * @memberof Q
 * @param {Object} obj A given object to clone.
 * @returns {Object}
 * @example
 * Q.clone(object);
 */
helpers.clone = function clone(obj) {
    var copy = {},
        prop;

    for (prop in obj) {
        if (obj[prop]) {
            copy[prop] = obj[prop];
        }
    }

    return copy;
};

/**
 * Extends a given object with properties from another object.
 * @memberof Q
 * @param {Object} destination A given object to extend its properties.
 * @param {Object} from A given object to share its properties.
 * @returns {Object}
 * @example
 * var foo = {
 *     'baz': 'qux'
 * };

 * var bar = {
 *     'quux': 'corge'
 * };
 *
 * Q.extend(foo, bar);
 *
 * console.log(foo.quux) // returns 'corge'
 */
helpers.extend = function extend(destination, from) {

    var prop;

    for (prop in from) {
        if (from[prop]) {
            destination[prop] = from[prop];
        }
    }

    return destination;
};

/**
 * Inherits prototype properties from `uber` into `child` constructor.
 * @memberof Q
 * @param {Function} child A given constructor function who inherits.
 * @param {Function} uber A given constructor function to inherit.
 * @returns {Object}
 * @example
 * Q.inherit(child, uber);
 */
helpers.inherit = function inherit(child, uber) {
    var obj = child.prototype || {};
    child.prototype = helpers.extend(obj, uber.prototype);

    return uber.prototype;
};

// Module dependencies.
var _isDown = 0,
    _points = [],
    moving = false,
    defaults = {
        'version': 'uifree',
        'container': document.getElementsByTagName('body')[0],
        'visor': 'false',
        'leapmotion': false
    };

function customizeOptions(options) {
    var prop;
    for (prop in defaults) {
        if (!options.hasOwnProperty(prop)) {
            options[prop] = defaults[prop];
        }
    }
    return options;
}

/**
 * Creates ...
 * @constructor
 * @augments Emitter
 * @param {(Object | String)} options Configuration options or an string indicating UID.
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
function GestureKit(options) {
    this.init(options);

    return this;
}

// Inherits from Emitter
// helpers.inherit(GestureKit, Emitter);

/**
 * Initialize a new instance of GestureKit.
 * @memberof! GestureKit.prototype
 * @function
 * @param {(Object | String)} options Configuration options or an string indicating UID.
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
GestureKit.prototype.init = function(options) {
    var that = this;

    this.options = customizeOptions(options || {});

    this.gk_container = this.options.container;

    this[this.options.version]();

    this.create$Pinstance();

    this.gk_container.addEventListener('touchmove', function (eve) {
        eve.preventDefault();
        moving = true;
        that.setPoints(eve.touches);
    });

    this.gk_container.addEventListener('touchend', function () {
        if (!moving) { return; }

        moving = false;

        that.recognizeGesture();
    });


    return this;
};

/**
 *
 * @memberof! GestureKit.prototype
 * @function
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
GestureKit.prototype.uifree = function() {
    // Config GestureKit Container
    this.gk_container.style.cssText = 'width: 100%; height: 100%; overflow: auto; -webkit-overflow-scrolling: touch;';

    return this;
};

/**
 * Creates a $P instance.
 * @memberof! GestureKit.prototype
 * @function
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
GestureKit.prototype.create$Pinstance = function () {
    this._r = new PDollarRecognizer();

    this.getGestures();

    return this;
}

/**
 *
 * @memberof! GestureKit.prototype
 * @function
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
GestureKit.prototype.getGestures = function () {
    var that = this,
        xhr = new XMLHttpRequest(),
        response;

    xhr.open('GET', 'http://staging.gesturekit.com/sdk/getgestures/' + this.options.uid);

    // Add events
    xhr.onreadystatechange = function () {
        if (xhr.readyState === xhr.DONE) {
            status = xhr.status;

            if ((status >= 200 && status < 300) || status === 304 || status === 0) {
                response = JSON.parse(xhr.response || xhr.responseText);
                that.addGestures(response.gestureset.gestures);

            } else {
                console.log('Fail');
            }
         }
    };

    xhr.send();

    return this;
};


/**
 *
 * @memberof! GestureKit.prototype
 * @function
 * @returns {gesturekit} Returns a new instance of GestureKit.
 */
GestureKit.prototype.addGestures = function (data, callback) {

    var i = 0,
        j,
        name,
        meta,
        gesture,
        pointaArray,
        len = data.length;

    this._r.PointClouds = [];

    for (i; i < len; i += 1) {
        name = data[i].method;
        meta = data[i].metadata;

        if (meta !== "" && meta != null && this._r.metadata[name] === undefined ) {
            this._r.metadata[name] = meta;
        }

        pointaArray = [];
        gesture = data[i].gesture;

        for (j = 0; j < gesture.length; j += 1) {
            pointaArray.push(new Point(parseFloat(gesture[j].X), parseFloat(gesture[j].Y), gesture[j].ID));
        }

        this._r.PointClouds[i] = new PointCloud(name, pointaArray);
    }

    return this;
};

GestureKit.prototype.setPoints = function (touches) {

    var i = 0,
        len = touches.length,
        ts,
        x,
        y;

    _isDown = len;

    if (_isDown > 0) {

        for (i; i < len; i += 1) {

            ts = touches[i];
            x = ts.pageX;
            y = ts.pageY;

            _points.push(new Point(x, y, i));
        }

    }

    _isDown = 0;
};

GestureKit.prototype.recognizeGesture = function () {
    var result = this._r.Recognize(_points);
    console.log("gesture: " + result.Name + " score: " + result.Score);

    if (parseFloat(result.Score) !== 0.0) {
        gk.emit(result.Name, result);
    }
    _points.length = 0;
    _isDown = 0;

    return this;
}
function gk(options) {
    gk.recognizer = gk.recognizer || new GestureKit(options);
    return gk;
}

helpers.extend(gk, new Emitter());

window.gk = gk;
}(this));