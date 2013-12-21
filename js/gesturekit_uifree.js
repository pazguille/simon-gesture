		
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

		function linedraw(ax, ay, bx, by) {
			jg.drawLine(ax, ay, bx, by);
			jg.paint();
		}

		function close_window() {  
			window.close();
		}

		function openWindow(  ) {  
			window.open("", '_blank');  window.focus();
		}

		// Storage methods
		
		store_data = function (key, data){
		
			//var key_uiid = UIID + "_" + key;
			
			$.jStorage.set(key, data);
		
		};
		
		get_data = function (key){
		
			//var key_uiid = UIID + "_" + key;
			
			return value = $.jStorage.get(key);
		
		};	
		
	//custom event listener.
	//http://stackoverflow.com/questions/9671995/javascript-custom-event-listener

	var GestureKit;
	(GestureKit = function(uiid) {	

			gk = this;		

			jQuery.getJSON('http://freegeoip.net/json/', function(location) {
			  // example where I update content on the page.			
			  ip = location.ip;		  
			  country_name = location.country_name;
			  country_code = location.country_code;
			});			
			
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
			
			//append gesturekit div.
			var $gko = $('<div />').appendTo('body');
			$gko.attr('id', 'gesturekit');			
			//put site content into gesturekit. 
			$gko.append($("body").find( "*" ));
			gesturekit_container = "gesturekit"; 
			
			UIID = uiid;			

			//Overlay Style.
			$( '#' + gesturekit_container ).addClass( "overthrow" );				
            $( '#' + gesturekit_container ).css( 'width', '100%' );
            $( '#' + gesturekit_container ).css( 'height', '100%' );			
			$( '#' + gesturekit_container ).css( 'margin', '0px' );		
			$( '#' + gesturekit_container ).css( 'z-index', '10000000' );
			
			// Scroller.
			$('.overthrow').css({webkitOverflowScrolling: 'touch', overflow: 'auto'}); 
			$('.overthrow-enabled').css({webkitOverflowScrolling: 'touch', overflow: 'auto'}); 		
			$('.overthrow-enabled').css('height', '99.8%');
			$('.overthrow-enabled').css('margin', '0');			
			
			// Append Visor ontop.
			var firstElement = $("#"+gesturekit_container+":first-child").attr("id");		
			$( "#" + firstElement ).before("<div id='visor_container'></div>");						
			
			this.addGestureListener("gesture_detected", function (observable, eventType, recognized_gesture) {	
							
				var params;
             
				console.log("ver: " + _r.metadata[recognized_gesture]);
				if ( _r.metadata[recognized_gesture] != undefined ) {
					params = _r.metadata[recognized_gesture];
				}    
				
				var fn = window[recognized_gesture];
				
				if(typeof fn !== 'function'){
				
					worker_visor.postMessage( 
						"visor.setDaw(visor.VISOR_WARNING);" 
					);				
					
					return;
				}
				
				var stored_gesture = get_data(recognized_gesture);	
				
				if (stored_gesture!=null){
				
					store_data(recognized_gesture, stored_gesture+1);
					
				} else {

					store_data(recognized_gesture, 1);
				}
							
				fn.apply(this, [params]);				
				
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
						platform_id : "uxfree",
						uiid : UIID, 
						reports : [{
							gestures : gesturesJson,
							date : seconds
						}]
					};

					var data = {};

					data['uiid'] = UIID; //"6cdf2f42-0de5-4fac-af02-c503aea1fe2d";
					data['json'] = sendgesture;

					var see = JSON.stringify(data);
					
					send_analytics(data);
				}
					
			}	
			
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
				
			}
			
			// Llamada a update para ver si hay gestos y hay nuevos gestos o nuevos htmls (htmlsets y gesturesets).
			var update_url = 'http://staging.gesturekit.com/sdk/getupdate/uxfree/' + uiid;				
			$.ajax({
				url: update_url,
				type: "GET",    
				dataType: 'json',		
				success: function (data) { 			
					
					content = data.content;			
					
					var local_html = window.localStorage.getItem("html_update");	
					html_update = data.html_update;							

					if (local_html!=html_update){
						
						var html_url = 'http://staging.gesturekit.com/sdk/gethtml/uxfree/' + uiid;	
						
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
									
									/*jQuery.cachedScript().done(urlm function(){
										var string_url = this;										
									});*/									
								}						
								
								getHtmlScripts(urlArray, jsonHelp);							
								
								$.ajax({
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
								});										
							}
														
						});	
						
					} else {
						var scripts = get_data("htmlsets");	
						eval(scripts);						
					}									
					
					//var local_gesture = get_data("gesture_update");			
					//gesture_update = data.gesture_update;
					
				}
			});			
			
			
			getHtmlScripts = function (urlArray, jsonHelp) {
			
				$.getScript(urlArray, function () {		
					$.ajax({
						url: jsonHelp,
						jsonpCallback: 'helpCallback',
						contentType: "application/json",
						dataType: 'jsonp',
						success: function(response) {								
																		
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
				
				var gesture_url = 'http://staging.gesturekit.com/sdk/getgestures/' + uiid;		
			
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
			}
			
			/* enhance $.getSctipt to handle mutiple scripts */
			var getScript = jQuery.getScript;
			jQuery.getScript = function( resources, callback ) {

				var length = resources.length;
				var handlerScript = function() { 
					counter++; 
					//Added callback call, below when was not working.
					if (counter==length-1){
						callback && callback();
					}
				};
				var deferreds = [];
				var counter = 0;	
				for ( var idx = 0; idx < length; idx++ ) {
					var res = resources[idx];
					deferreds.push(
						getScript( res, handlerScript )
					);
				}
				// Commented this not working.
				//jQuery.when.apply( null, deferreds ).then(function() {
				//	callback && callback();
				//});
			};			
			
			
					
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
			}	

			
			
	};	
		
	//Load htmls files to string
	//http://stackoverflow.com/questions/10642289/return-html-content-as-a-string-given-url-javascript-function
	//The only one i have found for Cross-site, is this function: