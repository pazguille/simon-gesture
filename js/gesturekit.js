
	//
	// Startup
	//
	var _isDown, _points, _strokeID, _r, _g, _rc; // global variables
	var _threshold = 400;
	var canvas;
	var jg;
	var gestures_loaded = false;
	var loading_worker_url;

	var loadscroll;

	var worker_loading, worker_visor, worker_cache;

	// Storage methods
	store_data = function (key, data){
		$.jStorage.set(key, data);
	};
	get_data = function (key){
		return value = $.jStorage.get(key);
	};

	// Js dynamic Loader function. Zepto compatible.
	function loadScript (src, callback)
	{
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = src;
		s.async = false;
		s.onload = callback;
		document.body.appendChild(s);
	};

	var GestureKit;
	(GestureKit = function(id) {

			gk = this;

			// Load zepto.
			loadScript('http://zeptojs.com/zepto.min.js', function() {

				// Fetch variables for device_id to analytics.
				Zepto.getJSON('http://freegeoip.net/json/', function(location) {
				  ip = location.ip;
				  country_name = location.country_name;
				  country_code = location.country_code;
				});

				var version;
				var container;

				// typeof
				if (typeof id === 'string') {

					UIID = id;
					version = 'uifree';
					leapmotion = false;
					gk_container = 'gesturekit';

				} else {
					var options = $.extend({}, id);

					version = options.version;
					UIID = options.id;

					if ( options.container === undefined ){
						gk_container = "gesturekit";
					} else {
						gk_container = options.container;
					}


					if ( options.container === undefined ){
						leapmotion = false;
					} else {
						leapmotion = options.leapmotion;
					}

				}

				// Filter action per version
				if (version=='uifree'){

					version = "uxfree"; //real name on the server, we will change.

					try
					{
						// wrap all site into new gesturekit container to applñy scroll kynect.
						/*$all = $('body').children( "*" ).not('SCRIPT');
						var $gko = $("<div id='gesturekit'></div>").appendTo('body');
						$gko.append($all);*/
						$('body').attr("id",  gk_container);

					}
					catch(err) { console.log("err: " + err); }

					// Overlay kinect class & style.
					$( '#' + gk_container ).addClass( "overthrow" );
					$( '#' + gk_container ).css( 'width', '100%' );
					$( '#' + gk_container ).css( 'height', '100%' );
					$( '#' + gk_container ).css( 'margin', '0px' );
					$( '#' + gk_container ).css( 'z-index', '10000000' );

					// Scroller kynect
					$('.overthrow').css({webkitOverflowScrolling: 'touch', overflow: 'auto'});
					$('.overthrow-enabled').css({webkitOverflowScrolling: 'touch', overflow: 'auto'});
					$('.overthrow-enabled').css('height', '99.8%');
					$('.overthrow-enabled').css('margin', '0');

					// Append visor overlay on top of GestureKit
					var gkelement = document.getElementById('gesturekit');
					var visor_container = document.createElement('div');
					visor_container.id = 'visor_container';
					gkelement.appendChild(visor_container);
					//document.getElementsByTagName("body")[0].insertBefore(visor_container, gkelement);

				} else if (version=='inkwell'){

					// For defining area on page
					if (gk_container != "gesturekit"){

					}

					var overdiv = document.createElement('div');
					overdiv.setAttribute('id','gesturekit');
					overdiv.style.width = '100%';
					overdiv.style.height = '100%';
					overdiv.style.margin = '0px';
					overdiv.style.zIndex = "10000000";
					overdiv.style.position = "absolute";
					document.body.insertBefore(overdiv, document.body.firstChild);

					var visor_container = document.createElement('div');
					visor_container.id = 'visor_container';
					overdiv.appendChild(visor_container);

				} else {
					console.log("GestureKit: '" + version + "' is not recognized as a known version.");
					return;
				}

				// UIID service url
				var service_url = version + '/' + UIID;

				//Optional clear data from cache comment after debug.
				window.localStorage.clear();

				// Creating global blob worker
				window.URL = window.URL || window.webkitURL;
				response = "self.onmessage=function(e){postMessage(e.data);}";
				try {
					blob = new Blob([response],{type:"text/javascript"});
				} catch (e) {
					window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
					blob = new BlobBuilder();
					blob.append(response);
					blob = this.blob.getBlob();
				}

				// Llamada a update para ver si hay gestos y hay nuevos gestos o nuevos htmls (htmlsets y gesturesets).
				var update_url = 'http://staging.gesturekit.com/sdk/getupdate/' + service_url;
				$.ajax({
					url: update_url,
					type: "GET",
					dataType: 'json',
					success: function (data) {

						content = data.content;

						var local_html = window.localStorage.getItem("html_update");
						html_update = data.html_update;

						if ((local_html!=html_update)||(local_html==null)){

							var html_url = 'http://staging.gesturekit.com/sdk/gethtml/' + service_url;

							$.ajax({
								url: html_url,
								type: "GET",
								dataType: 'json',
								success: function (data) {

									var urlArray = [];
									var jsonHelp, jsonCache;
									var htmlArray = data.html;

									for (var i = 0; i < htmlArray.length; i++) {

										var src = htmlArray[i].src;
										var url = htmlArray[i].url;

										var ext =  url.split('.').pop();

										if (ext=="js"){

											//Check if
											if ( url.indexOf("loader.js") != -1 ){

												var script = document.createElement('script');
												script.src = url;
												document.getElementsByTagName('head')[0].appendChild(script);

												script.onload = function() {

													worker_loading = new Worker(URL.createObjectURL(blob));

													//Loader.

													var load_visor = "loader = new Loader();" +
														" loader.start();";

													worker_loading.postMessage( load_visor );

													worker_loading.onmessage = function (e) {
														eval(e.data);
													};


												};


											} else {
												urlArray.push(url);
											}

										} else if (ext=="json") {

											if ( url.indexOf("html_cache") != -1 ){

												jsonCache = url;

											} else if ( url.indexOf("help") != -1 ){

												jsonHelp = url;

											}

										} else if (ext=="css") {
											$('<style type="text/css"></style>')
												.html('@import url("' + url + '")')
												.appendTo("head");
										}

									}

									getHtmlScripts(urlArray, jsonHelp);

									// Local storage, please verify Guille,
									//trying to call all javascript via jsonp and reloaded as chache.
									/*$.ajax({
										url: jsonCache,
										jsonpCallback: 'htmlCallback',
										contentType: 'application/json',
										dataType: 'jsonp',
										success: function(cahe) {
											var jscripts = cahe[0].js;
											// Store Scripts
											window.localStorage.setItem("html_update", html_update);
											window.localStorage.setItem("htmlsets", jscripts);
										},
										error: function(e) {
											console.log(e.message);
										}
									});*/

								}

							});

						} else {
							// Guille load cache from somewhere.
							//var scripts = get_data("htmlsets");
							//eval(scripts);
						}
						//var local_gesture = get_data("gesture_update");
						//gesture_update = data.gesture_update;

					}
				});

				var getScript = Zepto.getScript;
				Zepto.getScript = function( resources, callback ) {

					var length = resources.length;
					var handlerScript = function() {
						counter++;
						//Callback to continue with help gesture after...here also Images array.
						if (counter==length-1){
							callback && callback();
						}
					};
					var counter = 0;
					for ( var idx = 0; idx < length; idx++ ) {
						var res = resources[idx];
						loadScript(res, handlerScript);

					};
				};

			});

			window.onbeforeunload = function (e) {
			  var e = e || window.event;

			  //IE & Firefox
			  if (e) {
				buil_analytics();
			  }

			};

			function buil_analytics(){

				var device_type;

				if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
					device_type = "mobile";
				} else {
					device_type = "pc";
				}

				var device_id = device_type + "-" + ip + "-" + country_name + "-" + country_code;

				var seconds = new Date().getTime() / 1000 | 0;

				var keys = $.jStorage.index();

				var jsonObj = [];

				for (var i = 0; i < keys.length; i++) {
					if ( keys[i].indexOf("GK_") != -1 ){
						var value = $.jStorage.get(keys[i]);
						item = {};
						item ["gesture_id"] = keys[i];
						item ["count"] = value;
						jsonObj.push(item);
					}
				}

				var gesturesJson = JSON.stringify(jsonObj);

				if (jsonObj.length>0){

					var sendgesture = {
						device_id : device_id,
						platform_id : "inkwell",
						uiid : UIID,
						reports : [{
							gestures : gesturesJson,
							date : seconds
						}]
					};

					var data = {};

					data['uiid'] = UIID, //"6cdf2f42-0de5-4fac-af02-c503aea1fe2d";
					data['json'] = sendgesture;

					send_analytics(data);
				}

			};

			function send_analytics(data) {
				// Send analytics
				$.ajax({
					type: 'POST',
					url: 'http://staging.gesturekit.com/sdk/sendanalytics/',
					crossDomain: true,
					data: {
						json : JSON.stringify(data.json),
						uiid : data.uiid
					},
					dataType: 'json',
				});

			};


			getHtmlScripts = function (urlArray, jsonHelp) {

				Zepto.getScript(urlArray, function () {
					$.ajax({
						url: jsonHelp,
						jsonpCallback: 'helpCallback',
						contentType: "application/json",
						dataType: 'jsonp',
						success: function(response) {

								// Load touchy in case touch has been called or else
								if (typeof(load_graphics_and_listeners) != "undefined") {
									load_graphics_and_listeners(gk_container);
								}

								// Verify if loadPDollarForWeb() method is loaded
								if (typeof(loadPDollarWeb) != "undefined") {

									// Remove me;
									$.jStorage.flush();

									store_data("application_name", content[0].application_name);
									store_data("application_description", content[0].application_description);
									store_data("user_first_name", content[0].user_first_name);
									store_data("user_last_name", content[0].user_last_name);

									// Load $p Object
									loadPDollarWeb();

									// Call and load Gestures.
									getGestures(response);

								}

								//Scroll
								if (typeof(LoadScroll) != "undefined") {

									LoadScroll();

								}

								// Variable containing the html help file
								helpGestures = response;

							},
							error: function(e) {
								console.log(e.message);
							}
						});

						function jsonpCallback(response){

							var resp = response;
						}
				});
			}

			getGestures = function (response) {

				var gesture_url = 'http://staging.gesturekit.com/sdk/getgestures/' + UIID;

				$.ajax({
					url: gesture_url,
					type: "GET",
					dataType: 'json',
					success: function (data_gestures) {

						var gestureset = data_gestures.gestureset;
						var gestures = gestureset.gestures;
							//var t = gestures.length;
						var all_gestures = gestures.concat(response);

						// Help Gestures
						helpArray = [];

						for (var j = 0; j < gestures.length; j++) {

							var method = gestures[j].method;
							var metadata = gestures[j].metadata;
							var img = gestures[j].img;

							if (img != undefined){

								var img_description = gestures[j].img_description;

								var tempArray = {};

								tempArray.method = method;
								tempArray.img_description = img_description;
								tempArray.img = img;

								helpArray.push(tempArray);

							}

						}

						// Push gestures into $p
						loadGesturesWeb(all_gestures, function(state) {

							gestures_loaded = state;

							worker_visor = new Worker(URL.createObjectURL(blob));

							//Visor.
							var load_visor = "loader.stop();" +
								" visor = new Visor();" +
								" visor.setDaw(visor.VISOR_LOGO);";

							worker_visor.postMessage( load_visor );

							worker_visor.onmessage = function (e) {
								eval(e.data);
							};

						});

					},

					error: function(e) {
						console.log(e.message);
					}
				});

			};


			this.addGestureListener("gesture_detected", function (observable, eventType, recognized_gesture) {

				console.log("ver: " + _r.metadata[recognized_gesture]);

				// Analytics
				var stored_gesture = get_data(recognized_gesture);
				if (stored_gesture!=null){
					store_data(recognized_gesture, stored_gesture+1);
				} else {
					store_data(recognized_gesture, 1);
				}

				// Metadata
				var params;
				if ( _r.metadata[recognized_gesture] != undefined ) {
					params = _r.metadata[recognized_gesture];
				}

				// Check Method created
				var fn = window[recognized_gesture];

				if(typeof fn !== 'function'){
					worker_visor.postMessage(
						"visor.setDaw(visor.VISOR_WARNING);"
					);
					//return;
				} else {
					//Trigger Method
					fn.apply(this, [params]);
				}

				// Finnaly fire event
				gk.fire('gesture-recognized', recognized_gesture, params);


			});

		}).prototype = {

			addGestureListener: function(type, method, scope, context) {
				var listeners, handlers, scope;
				if (!(listeners = this.listeners)) {
					listeners = this.listeners = {};
				}
				if (!(handlers = listeners[type])){
					handlers = listeners[type] = [];
				}
				handlers.push({
					method: method,
					scope: scope,
					context: (context ? context : scope)
				});
			},
			fireEvent: function(type, data, context) {
				var listeners, handlers, i, n, handler, scope;
				if (!(listeners = this.listeners)) {
					return;
				}
				if (!(handlers = listeners[type])){
					return;
				}
				for (i = 0, n = handlers.length; i < n; i++){
					handler = handlers[i];
					if (handler.method.call(
						handler.scope, this, type, data
					)===false) {
						return false;
					}
				}
				return true;
			},
			on: function(event, listener) {

                var listening = this.listeners[event];

                if (!listening) { listening = []; }

                listening.push(listener);

                this.listeners[event] = listening;

                return this;
			},
			fire: function(event, method_name, metadata) {

                var listening = this.listeners[event];

                if (listening) {

                        var args = Array.prototype.slice.call(arguments);

                        args.shift();

                        for (var i = 0, l = listening.length; i < l; i++) { listening[i].apply(this, args); }
                }

                return this;
			}

	};