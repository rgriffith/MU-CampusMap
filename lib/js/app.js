$(function(){
	
	// Location Model and Collection
	// ----------
	window.Location = Backbone.Model.extend({
		defaults: {
			label: 0,
			showOnMap: false,
			showInfowindow: false,
			marker: null
		},
		
		initialize: function() {
			var attributes = this.toJSON(),
				marker = new google.maps.Marker({
							position: new google.maps.LatLng(parseFloat(attributes.lat), parseFloat(attributes.lng)),
							title: attributes.name,
							map: null,
							icon: 'http://maps.google.com/mapfiles/marker' + String.fromCharCode(attributes.label + 65) + '.png'
						});		
			
			// Update the location's marker attribute with the new google marker.
			this.set({marker: marker});
		}
	});
	
	window.LocationCollection = Backbone.Collection.extend({
		model: Location,
		url: "lib/data/mu_campusmap_locations.json",
		
		initialize: function() {
			// Bind a change event to the label because the marker's icon
			// will change according to its location in the search results.
			this.bind('change:label', this.updateMarkerIcon);
		},
		
		// Filter the collection by a supplied query.
		// If the query begins with a double quoute, we're
		// performing a greedy match on the marker's nam.
		// Otherwise, we're searching for the query/keywords
		// within the name, address, depertments, and id.
		// ---------------
		searchByQuery: function(query) {
			return this.filter(function(loc) {
				var pattern = new RegExp(query, 'i');
				if (pattern.test(loc.get('name')) 
					|| pattern.test(loc.get('keywords'))
					|| pattern.test(loc.get('address')) 
					|| pattern.test(loc.get('id')) 
					|| _.indexOf(loc.get('departments'), query) !== -1
					) {
					return true;
				}
				
				return false;
			});
		},
		
		// Filter the collection by the location's unique id.
		// ---------------
		searchById: function(locId) {
			return this.filter(function(loc) {
				return parseInt(loc.get('id')) === parseInt(locId);
			});
		},
		
		// Filter the collection by those that have markers that are shown on a google map.
		// ---------------
		getShownMarkers: function() {
			return this.filter(function(location){ 
					return location.get('marker').getMap() !== null;
				});
		},
		
		// Remove all location markers from a google map.
		// ---------------
		removeShownMarkers: function() {
			var shown = this.getShownMarkers();
			
			if (shown.length > 0) {
				_.each(shown, function(location) {
					var marker = location.get('marker');
					
					location.set({showOnMap: false, showInfowindow: false});
					
					// Remove from map and remove click listener.
					marker.setMap(null);
					google.maps.event.clearListeners(marker, 'click');					
				});
			}
		},
		
		// Update a location marker's icon url.
		// ---------------
		updateMarkerIcon: function(location) {
			var marker = location.get('marker'),
				label = location.get('label');
				
			marker.setIcon('http://maps.google.com/mapfiles/marker' + String.fromCharCode(label + 65) + '.png')
		}
	});
	
	
	// The Map portion of the UI
	// Includes methods to interact with a Google Map object.
	// ---------------
	window.MapView = Backbone.View.extend({	
		el: $("#map-canvas"),
		
		infoWindowTemplate: _.template($('#marker-infowindow-content').html()),
		
		map: null,
		defaults: {
			center: null,
			zoom: 16
		},
		mapCenter: null,
		kmlVersion: '1.4.7',
		layers: {
			kml: [],
			bldgLayers: ['academicsLayer','administrativeLayer','dormLayer'],
			infoLayers: ['muathleticLayer']
		},
		markers: [],
		infowindow: null,
		
		// Initialize the Google map.
		// ---------------
		initialize: function() {
			var self = this,
				baseKmlUrl = 'http://www.millersville.edu/directions/data/markers.kml';
			
			this.defaults.center = new google.maps.LatLng(39.996635, -76.353929);
			
			this.map = new google.maps.Map(this.el[0], {
				zoom: this.defaults.zoom,
				zoomControl: true,
				zoomControlOptions: {
					position: google.maps.ControlPosition.RIGHT_TOP
				},
				panControl: false,
				center: this.defaults.center,		
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});
			
			// Set up some bind events so we know when to manipulate the markers on the map.
			this.collection.bind('change:showOnMap', this.addMarker, this);
			//this.collection.bind('change:showInfowindow', this.openMarkerInfowindow, this);
			
			// Load the default "base" KML layer onto the map.	
			this.addKmlLayer('baseLayer', {
				url: baseKmlUrl,
				suppressInfoWindows: true, 
				preserveViewport: true
			});			
		},		
		
		// Trigger a resize on the map, useful for "refreshing" the bounds.
		// ---------------
		resizeMap: function() {
			google.maps.event.trigger(this.map, 'resize'); 
			
			if (this.infowindow !== null) {
				this.map.setCenter(this.infowindow.position);
			} else {
				this.map.setCenter(this.defaults.center);
			}
		},
		
		// Pan the map to the center of campus and reset zoom.
		// ---------------
		resetMap: function() {
			this.map.panTo(this.defaults.center);
			this.map.setZoom(this.defaults.zoom);
			this.setInfoWindow(null);
		},
		
		// Add the marker to the map and create its click event listener.
		// ---------------
		addMarker: function(result) {
			var self = this,
				attributes = result.toJSON(),
				marker = attributes.marker;		

			marker.setMap(this.map);
			
			// Add the click event on the new marker so we can open its infoWindow
			google.maps.event.addListener(marker, 'click', function() {
				// Create the infowindow
				var infowindow = new google.maps.InfoWindow({
					content: self.infoWindowTemplate({marker:attributes}),
					position: marker.getPosition()
				});
				
				google.maps.event.addListener(infowindow, 'closeclick', function() {				
					result.set({showInfowindow: false});
				});
				
				result.set({showInfowindow: true});
				self.setInfoWindow(infowindow);
				infowindow.open(self.map, marker);
			});
		},
		
		// Open a given marker's infowindow.
		// ---------------
		openMarkerInfowindow: function(result) {
			var marker = result.get('marker');
			
			// Make sure the marker is to be shown and that it's on the map first.
			if (result.get('showInfowindow') === true && marker.getMap() !== null) {
				google.maps.event.trigger(marker, 'click');
			} else {
				this.setInfoWindow(null);
			}
		},
		
		// Set the active infowindow, we only want one at a time.
		// ---------------
		setInfoWindow: function(iw) {		
			if (this.infowindow !== null) { this.infowindow.close(); }
			this.infowindow = iw;
		},
		
		// Show a given KML layer on the map. Add to lookup if it non-existent.
		// ---------------
		addKmlLayer: function(layerId, kmlOptions) {
			// If the layer doesn't exist yet, create one.		
			if (this.layers.kml[layerId] === undefined) { 
				this.layers.kml[layerId] = new google.maps.KmlLayer(kmlOptions.url + '?v=' + this.kmlVersion, {
					suppressInfoWindows: kmlOptions.suppressInfoWindows, 
					preserveViewport: kmlOptions.preserveViewport
				});
			}
			
			// Add the layer to the map.
			this.layers.kml[layerId].setMap(this.map);
			
			// Register a click event on the layer, see function comments.
			this.addKMLLayerClickEvent(layerId);
		},

		// Remove a KML layer from the map.
		// ---------------
		removeKmlLayer: function(layerId) {
			var layer = this.layers.kml[layerId];

			if (typeof layer === "object" && layer.map !== null) {			
				this.layers.kml[layerId].setMap(null);
			}
		},
		
		// Remove all KML layers from the map.
		// ---------------
		resetKmlLayers: function() {
			for (i in this.layers.kml) {
				this.removeKmlLayer(i);				
			}
		},
		
		// Add a click event to the KML layer so we can force one infowindow at a time.
		// Only applicable for base or building layers.
		// ---------------
		addKMLLayerClickEvent: function(layerId) {
			var self = this;
			
			if (layerId === 'baseLayer' || _.indexOf(self.layers.bldgLayers, layerId, true) !== -1 || _.indexOf(self.layers.infoLayers, layerId, true) !== -1) {			
				google.maps.event.addListener(self.layers.kml[layerId], "click", function(event) { 
					// Create the infowindow with the KmlMouseEvent info.
					var infowindow = new google.maps.InfoWindow({
						content: event.featureData.infoWindowHtml,
						position: new google.maps.LatLng(event.latLng.lat(), event.latLng.lng())
					});
					
					// Set the master infowindow and open it.
					self.setInfoWindow(infowindow);
					infowindow.open(self.map);
		       });
		   }
		}
	});
	
	// The Side Panel UI
	// Includes search results and overlay tabs.
	// ---------------
	
	window.PanelView = Backbone.View.extend({	
		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: $("#panel-wrapper"),
		
		statsTemplate: _.template($('#search-results-stats').html()),
		resultsTemplate: _.template($('#search-results-item').html()),
		shareFieldsTemplate: _.template($('#share-fields').html()),	

		searchResults: [],
		searchOpts: {
			curPage: 1,
			totalPages: 1,
			pageSize: 6		
		},
		
		routeUrl: '',
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
		},
		
		initialize: function() {
			var self = this;			
			
			this.input = this.$("#kwsearch-keyword");
			this.selectbox = this.$("#locsearch-select");
			this.deepLinksIds = [];
			
			$("#options-nav-bar").find('a:first').addClass("selected");
			$("#map-search").show(); 
			
			// If there are no initial results, show the overlays options.
			if (self.searchResults.length === 0) {
				$('#map-overlays').show();
			}
					
			// Add a click event to the tabs.
			$('#options-nav-bar').on('click','a.btn',function(){
				var tab = this;
				
				$('#options-nav-bar').find('a').removeClass("active"); 		
				$(this).addClass("active"); 
				
				$('fieldset', $('#marker-search')).hide();
				$('#sharedlink').blur();
				
				switch (tab.id) {
					case 'tablink-mapoptions':
						$('#map-search, #link').hide();
						$("#map-overlays").show();
						break;
					case 'tablink-link':
						$('#map-search, #map-overlays').hide();
						$('#link').show();
						$('#sharedlink').focus().select();
						break;
					case 'tablink-search':
					case 'tablink-buildings':
					default:
						$("#link").hide();						
						$('#map-search').show();						
						$('fieldset'+$(this).attr('href'), $('#marker-search')).show();
						
						if (self.input.val() === '' && self.searchResults.length === 0) {
							$('#map-overlays').show();
						} else {
							$('#map-overlays').hide();
						}
						
						break;
				}	
				
				return false;			
			});	
		},
		
		setCurrentPage: function(page) {
			// Make sure we have a valid starting point.
			if (typeof page !== 'number' || page < 1 || page > this.searchOpts.totalPages) {
				this.searchOpts.curPage = 1;
			} else {
				this.searchOpts.curPage = page;
			}
		},
		
		// Search the Locations Collection by keyword.
		// ---------------
		searchByKeyword: function(query, page) {
			this.input.val(query);			
			this.searchResults = this.collection.searchByQuery(query);
			this.searchOpts.totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize);
			
			this.setCurrentPage(page);
			
			this.selectbox[0].selectedIndex = 0;			
			this.updateResults();
			
			return false;
		},
		
		// Search the Locations Collection by IDs provided (initially CSV format).
		// ---------------
		searchByIDs: function(ids) {
			var i = 0;
			
			this.searchResults = [];
			this.deepLinksIds = ids || [];
			
			// Loop through the IDs and load the specified markers.
			for (; i < this.deepLinksIds.length; i++) {
				var model = this.collection.get(this.deepLinksIds[i]);
				
				if (model !== undefined) {
					this.searchResults.push(model);
				}
			}
			
			// If there's only one result, prefill the search and select boxes.
			if (this.searchResults.length === 1) {
				this.input.val(this.searchResults[0].get('name'));
				this.selectbox.val(ids[0]);
			} else {
				this.input.val('');
				this.selectbox[0].options.selectedIndex = 0;
			}
			
			this.searchOpts.totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize);
			
			this.updateResults();	
		},
		
		// Update the search results, based on searching the Locations Collection.
		// ---------------
		updateResults: function() {	
			var self = this,
				page = this.searchOpts.curPage,
				totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize),
				resultsPagesHTML = '',
				currentLowerBound = (page - 1) * this.searchOpts.pageSize,
				currentUpperBound = currentLowerBound + this.searchOpts.pageSize;	
			
			currentUpperBound = (currentUpperBound <= this.searchResults.length ? currentUpperBound : this.searchResults.length)
			
			// Hide the overlays options content.
			$('#map-overlays').css({display: 'none'});
			
			// Show the clear icon.
			$('.kwsearch-clear').css({display:'block'});
			
			if (this.searchResults.length < 1) {
				$('#map-results').html('<div class="alert alert-block"><p>No results were found for <strong><em>' + (this.selectbox.val() !== '' ? this.selectbox.val() : this.input.val()) + '</em></strong>.<br /><br />Please make sure building or department names are spelled correctly.</p></div>');
			} else {
				// Loop through the results and generate the result HTML.			
				resultsPagesHTML = '<ul id="results-page-' + page + '" class="page active">';	
				
				for (var i = currentLowerBound; i < currentUpperBound; i++) {		
					var label = i % this.searchOpts.pageSize;
					
					resultsPagesHTML += this.resultsTemplate({id: this.searchResults[i].id, label: label, marker: this.searchResults[i].toJSON()});
				}
							
				resultsPagesHTML += '</ul>';
				
				// Update the viewing stats.
				$('#map-results-stats').html(this.statsTemplate({
					lowerBound: currentLowerBound,
					upperBound: currentUpperBound,
					resultCount: this.searchResults.length,
					query: this.input.val()
				}));
				
				$('#map-results').html(resultsPagesHTML);				
				
				$('#map-results li').on('click','a',function(){		
					var result = self.collection.get(this.id.replace('result-',''));
					google.maps.event.trigger(result.get('marker'), 'click');
					
					return false;
				});
				
				// Add the pagination HTML and add a click event to each pagination link.
				// Each link will "show" a corresponding page.
				$('#map-results-pagination').html(this.renderPagination());
							
				// Show the new range of markers.
				if (this.searchResults.length === 1) {
					var result = this.collection.get(this.searchResults[0].id);
					result.set({
						showOnMap: true,
						showInfowindow: true,
						label: 0
					});
					google.maps.event.trigger(result.get('marker'), 'click');
				} else {
					for (var i = currentLowerBound; i < currentUpperBound; i++) {
						var result = this.collection.get(this.searchResults[i].id);
						
						result.set({
							showOnMap: true,
							showInfowindow: false,
							label: i % this.searchOpts.pageSize
						});
					}		
				}					
			}
			
			// Show the results.
			$('#map-results-wrap').css({display: 'block'});	
		},
		
		clearResults: function() {
			$('#map-results-pagination, #map-results-feedback, #map-results').html('');	
			$('#map-results-wrap, .kwsearch-clear').css({display:'none'});
			$('#map-overlays').css({display: 'block'});
			
			this.input.val('');
			this.selectbox[0].options.selectedIndex = 0;
			this.searchOpts.curPage = 1;
			this.searchResults = [];
		},
		
		// Update the search results pagination.
		// ---------------
		renderPagination: function() {
			var currentPage = this.searchOpts.curPage <= 1 ? 1 : parseInt(this.searchOpts.curPage),
				anchorSize = 2,
				html = '<ul>',
				routeUrl = this.routeUrl + 'p',
				middlePagesLoop = function(start, end) {
					var output = '';
					for (var i = start; i <= end; i++) {
						if (i == currentPage) {
						    output += '<li class="active"><a href="' + routeUrl + i + '">'+i+'</a></li>';
						} else {
						    output += '<li><a href="' + routeUrl + i + '">'+i+'</a></li>';
						}
					}
					return output;
				};
			
			if (this.searchOpts.totalPages < 9) {
				html += middlePagesLoop(1, this.searchOpts.totalPages);
			} else {
				if (currentPage <= (anchorSize * 2) + 1) {
					html += middlePagesLoop(1, (anchorSize * 2) + 4);
					
					html += '<li class="disabled"><span>...</span></li>';
					html += '<li><a href="' + routeUrl + (this.searchOpts.totalPages-1) + '">'+(this.searchOpts.totalPages-1)+'</a></li>';
					html += '<li><a href="'+ routeUrl + this.searchOpts.totalPages + '">'+this.searchOpts.totalPages+'</a></li>';
				} else if (currentPage > (anchorSize * 2) && currentPage < this.searchOpts.totalPages - (anchorSize * 2)) {					
					html += '<li><a href="' + routeUrl + '1">1</a></li>';
					html += '<li><a href="' + routeUrl + '2">2</a></li>';
					html += '<li class="disabled"><span>...</span></li>';
					
					html += middlePagesLoop(currentPage - anchorSize, currentPage + anchorSize);
					
					html += '<li class="disabled"><span>...</span></li>';
					html += '<li><a href="' + routeUrl + (this.searchOpts.totalPages-1) + '">'+(this.searchOpts.totalPages-1)+'</a></li>';
					html += '<li><a href="' + routeUrl + this.searchOpts.totalPages + '">'+this.searchOpts.totalPages+'</a></li>';
				} else {					
					html += '<li><a href="' + routeUrl + '1">1</a></li>';
					html += '<li><a href="' + routeUrl + '2">2</a></li>';
					html += '<li class="disabled"><span>...</span></li>';
					
					html += middlePagesLoop(this.searchOpts.totalPages - ((anchorSize * 2) + 2), this.searchOpts.totalPages);					
				}
			}
		    
		    html += '</ul>';
		    
		    return html;
		},
		
		updateShareFields: function() {
			$('#link').html(this.shareFieldsTemplate({shareUrl: location.href}));
		}
	});
	
	
	// The Application's Router
	// ----------
	window.AppRouter = Backbone.Router.extend();
	
	
	// The full Campus Map UI
	// Includes search results, overlay tabs, and map canvas.
	// Handles any initial GET requests (via ?query=george or ?id=1,2)
	// ---------------
	
	window.AppView = Backbone.View.extend({
		Collections: {
			Locations: {}
		},
		
		Views: {
			Panel: {},
			CampusMap: {}
		},
		
		Router: {},
	
		el: $("#campusmap-ui"),
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
			"click a#map-options-toggler": "togglePanelDisplay",
			"click #map-results-pagination a": "paginate",
			"click a.kwsearch-clear": "clearResults",
			"submit form#marker-search": "searchByKeyword",
			"change select#locsearch-select": "searchByBuilding",
			"change .filter-checkbox": "toggleKmlLayer"			
		},
		
		initialize: function() {
			var self = this;
			
			// Initialize the Locations collection and fetch the data.
			this.Collections.Locations = new LocationCollection;
			this.Collections.Locations.fetch();
			
			this.Router = new AppRouter;	
			
			// Initialize the two UI views.
			this.Views.CampusMap = new MapView({
				collection: this.Collections.Locations, 
				router: this.Router
			});			
			
			this.Views.Panel = new PanelView({
				collection: this.Collections.Locations, 
				router: this.Router
			});	
			
			// Initialize with whatever the starting route URL is.
			// Mainly used if the entrance is a deep link.
			this.Views.Panel.routeUrl = this.getRouteUrl();
			
			// Update shared links.			
			this.Views.Panel.updateShareFields();
			
			var searchLocations = function(query, page) {				
				page = parseFloat(page) || 1;			
				query = unescape(query.replace('+', ' '));	

				if (query !== '') {
					self.Collections.Locations.removeShownMarkers();
					
					self.trackVirtualPageView();

					_.delay(function() {	
						// Update the route URL so the pagination links are up to date.
						self.Views.Panel.routeUrl = self.getRouteUrl();
						
						// Search and update results.
						self.Views.Panel.searchByKeyword(query, page);
						
						// Update shared links.
						self.Views.Panel.updateShareFields();													
					}, 300);
				} else {
					self.clearResults();
				}
			};
			
			this.Router.route("", "", function() { 
				// Reset everything.
				self.Collections.Locations.removeShownMarkers();
				self.Views.Panel.routeUrl = '';
				self.Views.Panel.clearResults();				
				self.trackVirtualPageView();
				
				// Update shared links.
				self.Views.Panel.updateShareFields();
				
				// Center the map.
				self.Views.CampusMap.resetMap();

				return false;
			});
			
			this.Router.route("search/:query", "search", searchLocations);
			this.Router.route("search/:query/p:page", "search", searchLocations);
			
			this.Router.route("locations/:ids", "locations", function(ids) {				
				ids = ids.split(',');
				self.Collections.Locations.removeShownMarkers();
				
				self.trackVirtualPageView();
				
				_.delay(function() {
					// Update the route URL so the pagination links are up to date.
					self.Views.Panel.routeUrl = self.getRouteUrl();
					
					// Search and update results.
					self.Views.Panel.searchByIDs(ids);
					
					// Update shared links.
					self.Views.Panel.updateShareFields();					
				}, 300);
			});
			
			this.Router.route("overlays/q/:layers", "overlays", function(layers) {				
				if (layers === "") {
					self.Router.navigate('', true);
					return false;
				}
			
				layers = layers.split(',');
				self.Collections.Locations.removeShownMarkers();
								
				self.trackVirtualPageView();

				_.delay(function() {
					// Update the route URL so the pagination links are up to date.
					self.Views.Panel.routeUrl = self.getRouteUrl();

					// Reset, then update KML Layers
					self.Views.CampusMap.resetKmlLayers();
					$(".filter-checkbox").attr("checked", false);
					_.each(layers, function(layer) {
						$(".filter-checkbox[id *= \"" + layer + "\"]").trigger("click");
					});										
				}, 300);
			});
			
			Backbone.history.start();
		},
		
		// Event method used for keyword search, calls the search route.
		// ---------------
		searchByKeyword: function(evt) {
			evt.preventDefault();			
			this.Router.navigate('search/' + escape($('#kwsearch-keyword').val()), true);
		},
		
		// Event method used for building select, calls the locations route.
		// ---------------
		searchByBuilding: function(evt) {
			evt.preventDefault();
			this.Router.navigate('locations/' + escape(evt.currentTarget.value), true);
		},
		
		// Adds routing to the pagination links.
		// ---------------
		paginate: function(evt) {
			var page = parseInt(evt.currentTarget.innerHTML);

			if (typeof page !== 'number' || isNaN(page)) {
				page = 1;
			}
			
			// Update shared links.			
			this.Views.Panel.updateShareFields();			
			this.Views.Panel.updateResults(page);
		},
		
		// Returns the "route" URL, or the hash created by the Backbone Router.
		// ---------------
		getRouteUrl: function() {
			var routeUrl = location.hash !== '' ? location.hash.match(/^#([a-z0-9,%-]*\/?){2}/i)[0] : '#';
			return routeUrl.charAt(routeUrl.length - 1) !== '/' ? routeUrl + '/' : routeUrl;
		},
		
		// Clear the search results and remove any shown markers.
		// ---------------
		clearResults: function() {		
			this.Router.navigate('', true);
		},
		
		// Registers a virtual pageview with Google Analytics.
		// ---------------
		trackVirtualPageView: function(virtualPath) {
			virtualPath = virtualPath || location.pathname + location.search  + location.hash;

			if (_gaq && typeof _gaq === 'object') {				
				_gaq.push(['_trackPageview', virtualPath]);
			}
		},
		
		resizeUI: function() {
			
			var body = $('body'),
				bodyHeight = body.height(),
				bodyWidth = body.width(),
				headerHeight = $('#header').height(),
				height = bodyHeight - headerHeight;
				
			if (height >= 0) {
				$('#panel-wrapper, #map-canvas').height(height);
				
				var featuresPanel = $('#features-panel');
				var tabsHeight = $('#options-nav-bar').height()*2; // Multiplied by 2 to account for scroll areas.
		
				featuresPanel.height(height - tabsHeight - parseInt(featuresPanel.css('padding-top')) - parseInt(featuresPanel.css('padding-bottom')));
			}
		},
		
		// Show/Hide the features panel.
		// ---------------
		togglePanelDisplay: function() {
			var self = this,
				offset = this.Views.Panel.$('#features-panel').offset();
			
			if (offset.left < 0 ) {
				// Show the options panel
				$("#panel-wrapper").animate({left: "0px"}, 100, "linear");
				$("#map-canvas").animate({left: "380px"}, 100, "linear", function() {
					self.Views.CampusMap.resizeMap();
				});
				
				// Maximize the tab bar.
				$("#options-nav-bar").animate({left: '0px', height: '29px', top: '0px', padding: '15px'}, 100, "linear", function() {
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr({
						'title': 'Close this sidebar',
						'class': 'icon-chevron-left'
					}).css({top:'19px', right:'15px'});
				});
			} else {
				// Hide the options pabel.
				//$("#map-options, #map-canvas").animate({left: "-300px"}, 100, "linear", map.resizeMap);	
				$("#panel-wrapper, #map-canvas").animate({left: "-380px"}, 100, "linear", function() {
					self.Views.CampusMap.resizeMap();
				});					
				
				// Minify the tab bar, showing only the arrow.
				$("#options-nav-bar").animate({left: "27px", height: '17px', padding: '5px'}, 100, "linear", function(){
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr({
						'title': 'Open this sidebar',
						'class': 'icon-chevron-right'
					}).css({top:'5px', right:'1px'});
				});
			}
			return false;
		},
		
		toggleKmlLayer: function(evt) {
			var self = this,
				checkbox = evt.currentTarget;			
			
			if (!checkbox) {
				return false;
			}
			
			// If the checkbox is checked, activate the layer.
			// Else, remove the layer.
			if (checkbox.checked === true) {
				var isBuilding = _.indexOf(self.Views.CampusMap.layers.bldgLayers, checkbox.id, true) !== -1;
				
				self.Views.CampusMap.addKmlLayer(checkbox.id, {
					url: checkbox.value,
					suppressInfoWindows: true, 
					preserveViewport: true
				});
				
				// If the user is selecting a building layer and the full building layer is still showing,
				// remove the full layer and uncheck its checkbox.
				if (checkbox.id !== 'baseLayer' && isBuilding && document.getElementById('baseLayer').checked === true) {
					document.getElementById('baseLayer').checked = false;
					self.Views.CampusMap.removeKmlLayer('baseLayer');
				} else if (checkbox.id === 'baseLayer') {	
					// Loop through and build the selector string by checking for active
					// building layers.
					for (var i = 0; i < self.layers.bldgLayers.length; i++) {
						if (document.getElementById(self.layers.bldgLayers[i]).checked == true) {
							document.getElementById(self.layers.bldgLayers[i]).checked = false;
							self.Views.CampusMap.removeKmlLayer(self.Views.CampusMap.layers.bldgLayers[i]);
						}
					}
				}
				
				self.trackVirtualPageView(location.pathname + location.search + '#overlays/c/' + checkbox.id);
			} else {
				self.Views.CampusMap.removeKmlLayer(checkbox.id);
			}
		}
	});	
});