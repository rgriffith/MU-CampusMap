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
		url: "ajax/markercache.json",
		
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
			var keywords = query.split(' ');
			
			if (query.match(/^"[\w\s]*/i) !== null) {
				query = query.slice(1, query.length - 1);
				return this.filter(function(loc){
					return loc.get('name').match(query) !== null;
				});
			} else {			
				return this.filter(function(loc) {
					for (var i = 0; i < keywords.length; i++) {
						var pattern = new RegExp(keywords[i], 'i');
						if (pattern.test(loc.get('name')) 
							|| pattern.test(loc.get('address')) 
							|| pattern.test(loc.get('id')) 
							|| _.indexOf(loc.get('departments'), keywords[i]) !== -1
							) {
							return true;
						}
					}
					
					return false;
				});
			}
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
					
					location.set({showOnMap: false});
					
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
		
		map: null,
		kmlVersion: '1.4',
		layers: {
			kml: []
		},
		markers: [],
		infowindow: null,
		
		// Initialize the Google map.
		// ---------------
		initialize: function() {
			var self = this,
				baseKmlUrl = 'http://www.millersville.edu/directions/kml/mobile/marker-dump.kml?v=' + this.kmlVersion;
			
			this.map = new google.maps.Map(this.el[0], {
				zoom: 16,
				zoomControl: true,
				panControl: true,
				center: new google.maps.LatLng(39.996635, -76.353929),		
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});
			
			// Set up some bind events so we know when to manipulate the markers on the map.
			this.collection.bind('change:showOnMap', this.addMarker, this);
			this.collection.bind('change:showInfowindow', this.openMarkerInfowindow);
			
			// Load the default "base" KML layer onto the map.		
			this.layers.kml['baseLayer'] = new google.maps.KmlLayer(baseKmlUrl, {suppressInfoWindows: false, preserveViewport: true});
			this.layers.kml['baseLayer'].setMap(this.map);
			
			// Add a click event to the filter checkboxes
			$('#filter-map').on('change', 'input.filter-checkbox', function(){
				var checkbox = this,
				bldgCheckboxes = ['academicsLayer','administrativeLayer','dormLayer'];
				
				// If the checkbox is checked, activate the layer.
				// Else, remove the layer.
				if( checkbox.checked == true ) {
					var isBuilding = checkbox.value.indexOf('building') != -1 ? true : false;
					
					self.showKmlLayer(checkbox.id, {
						url: 'http://www.millersville.edu/directions/kml/'+checkbox.value+'.kml',
						suppressInfoWindows: isBuilding, 
						preserveViewport: true
					});
					
					// If the user is selecting a building layer and the full building layer is still showing,
					// remove the full layer and uncheck its checkbox.
					if (checkbox.id != 'baseLayer' && isBuilding && document.getElementById('baseLayer').checked == true) {
						document.getElementById('baseLayer').checked = false;
						self.removeKmlLayer('baseLayer');
					} else if (checkbox.id == 'baseLayer') {	
						// Loop through and build the selector string by checking for active
						// building layers.
						for (var i = 0; i < bldgCheckboxes.length; i++) {
							if (document.getElementById(bldgCheckboxes[i]).checked == true) {
								document.getElementById(bldgCheckboxes[i]).checked = false;
								self.removeKmlLayer(bldgCheckboxes[i]);
							}
						}
					}
				} else {
					self.removeKmlLayer(checkbox.id);
				}
			});
		},		
		
		// Trigger a resize on the map, useful for "refreshing" the bounds.
		// ---------------
		resizeMap: function() {
			google.maps.event.trigger(this.map, 'resize'); 
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
					content: attributes.infoWindow.content,
					position: marker.getPosition()
				});
				
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
		showKmlLayer: function(layerId, kmlOptions) {
			// If the layer doesn't exist yet, create one.		
			if (this.layers.kml[layerId] === undefined) { 
				this.layers.kml[layerId] = new google.maps.KmlLayer(kmlOptions.url + '?v=' + this.kmlVersion, {
					suppressInfoWindows: kmlOptions.suppressInfoWindows, 
					preserveViewport: kmlOptions.preserveViewport
				});
			}
			
			this.layers.kml[layerId].setMap(this.map);
		},
		
		// Remove a KML layer from the map.
		// ---------------
		removeKmlLayer: function(layerId) {
			this.layers.kml[layerId].setMap(null);
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
		
		searchResults: [],
		searchOpts: {
			curPage: 1,
			pageSize: 6		
		},
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
			"click span.kwsearch-clear": "clearResults",			
			"submit form#marker-search": "searchByKeyword",
			"change select#bldgsearch-select": "searchByBuilding"
		},
		
		initialize: function() {
			 var self = this;			
			
			this.input = this.$("#kwsearch-keyword");
			this.selectbox = this.$("#bldgsearch-select");
			this.deepLinksIds = [];
			
			$("#options-nav-bar").find('a:first').addClass("selected");
			$("#map-search").show(); 
			
			// If there are no initial results, show the overlays options.
			if (self.searchResults.length === 0) {
				$('#map-overlays').show();
			}
					
			// Add a click event to the tabs.
			$('#options-nav-bar').on('click','a.tab-button',function(){
				var tab = this;
				
				$('#options-nav-bar').find('a').removeClass("selected"); 		
				$(this).addClass("selected"); 
				
				$('fieldset', $('#marker-search')).hide();
				
				switch (tab.id) {
					case 'tablink-mapoptions':
						$('#map-search').hide();
						$("#map-overlays").show();
						break;
					case 'tablink-search':
					case 'tablink-buildings':
					default:
						$('#map-search').show();						
						$('fieldset'+$(this).attr('href'), $('#marker-search')).show();
						
						if (self.searchResults.length === 0) {
							$('#map-overlays').show();
						} else {
							$('#map-overlays').hide();
						}
						
						break;
				}	
				
				return false;			
			});	
		},
		
		// Search the Locations Collection by keyword.
		// ---------------
		searchByKeyword: function() {
			this.searchResults = this.collection.searchByQuery(this.input.val());
			this.selectbox[0].selectedIndex = 0;			
			this.updateResults();
			
			return false;
		},
		
		// Search the Locations Collection by building selectbox.
		// ---------------
		searchByBuilding: function() {
			this.searchResults = this.collection.searchById(this.selectbox.val());
			this.input.val('"'+this.selectbox[0].options[this.selectbox[0].selectedIndex].text+'"');
			this.updateResults();	

			return false;		
		},
		
		// Search the Locations Collection by IDs provided via GET request (CSV format).
		// ---------------
		searchByIDs: function() {
			var i = 0;
			
			// Loop through the IDs and load the specified markers.
			for (; i < this.deeplinksIds.length; i++) {
				var model = this.collection.get(this.deeplinksIds[i]);
				
				if (model !== undefined) {
					this.searchResults.push(model);
				}
			}
			
			this.updateResults();	
		},
		
		// Update the search results, based on searching the Locations Collection.
		// ---------------
		updateResults: function() {
			var self = this,
				totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize),
				resultsPagesHTML = '';
			
			if (this.searchResults.length < 1) {
				$('#map-results').html('<div class="alert-message block-message warning"><p>No results were found for <strong><em>' + (this.selectbox.val() !== '' ? this.selectbox.val() : this.input.val()) + '</em></strong>.<br /><br />Please make sure building or department names are spelled correctly.</p></div>');
			} else {
				// Loop through the results and generate the result HTML.			
				resultsPagesHTML += '<ul id="results-page-1" class="page active">';				
				for (var i = 0; i < this.searchResults.length; i++) {		
					var tempPage = Math.floor(i/this.searchOpts.pageSize)+1,
						label = i % this.searchOpts.pageSize;
					
					// Append to the results HTML.
					if (tempPage > this.searchOpts.curPage) {
						this.searchOpts.curPage = tempPage;
						resultsPagesHTML += '</ul><ul id="results-page-'+this.searchOpts.curPage+'" class="page">';						
					}
					
					resultsPagesHTML += this.resultsTemplate({id: this.searchResults[i].id, label: label, marker: this.searchResults[i].toJSON()});
				}				
				resultsPagesHTML += '</ul>';
				
				// Update the viewing stats.
				$('#map-results-stats').html(this.statsTemplate({
					lowerBound: 0,
					upperBound: this.searchOpts.pageSize,
					resultCount: this.searchResults.length,
					query: this.input.val()
				}));
				
				$('#map-results').html(resultsPagesHTML);
				
				$('.kwsearch-clear').css({display:'block'});
				
				$('#map-results li').on('click','a',function(){		
					var result = self.collection.get(this.id.replace('result-',''));
					result.set({showInfowindow: true});
					
					return false;
				});
				
				// Add the pagination HTML and add a click event to each pagination link.
				// Each link will "show" a corresponding page.
				$('#map-results-pagination').html(this.renderPagination({totalPages: totalPages, currentPage: 1}));
				
				// Hide the overlays options content.
				$('#map-overlays').css({display: 'none'});
							
				// Reset the shown markers and add the new set.
				this.collection.removeShownMarkers();
				for (var i = 0; i < (this.searchOpts.pageSize <= this.searchResults.length ? this.searchOpts.pageSize : this.searchResults.length); i++) {
					var result = this.collection.get(this.searchResults[i].id);
					
					result.set({
						showOnMap: true,
						showInfowindow: this.searchResults.length === 1 ? true : false,
						label: i % this.searchOpts.pageSize
					});
				}
				
				// Show the results.
				$('#map-results-wrap').css({display: 'block'});				
				
				// Add a click event to the pagination links.
				$('#map-results-pagination').on('click' ,'a', function() {				
					var pageClicked = parseInt($(this).text());
				
					// Reset the active page and pagination link.
					$('.active', $('#map-results')).removeClass('active');		    	
					
					$('#map-results-pagination').html(self.renderPagination({
						totalPages: totalPages, 
						currentPage: pageClicked
					}));
					
					// Make the corresponding results page active.
					$('#results-page-'+pageClicked, $('#map-results')).addClass('active');
					
					// Update the stats.
					var lowerBound = (pageClicked - 1) * self.searchOpts.pageSize;
					var upperBound = lowerBound + self.searchOpts.pageSize;
					upperBound = (upperBound <= self.searchResults.length ? upperBound : self.searchResults.length);
					
					$('#map-results-stats').html(self.statsTemplate({
						lowerBound: lowerBound,
						upperBound: upperBound,
						resultCount: self.searchResults.length,
						query: self.input.val()
					}));
					
					// Reset the map and add the next set of Markers.
					self.collection.removeShownMarkers();		
					for (var i = lowerBound; i < upperBound; i++) {
						var result = self.collection.get(self.searchResults[i].id);
						result.set({
							showOnMap: true,
							showInfowindow: upperBound === lowerBound ? true : false,
							label: i % self.searchOpts.pageSize
						});
					}
					
					return false;
				});
			}
		},
		
		// Clear the search results and remove any shown markers.
		// ---------------
		clearResults: function() {			
			$('#map-results-pagination, #map-results-feedback, #map-results').html('');	
			$('#map-results-wrap, .kwsearch-clear').css({display:'none'});
			$('#map-overlays').css({display: 'block'});
			
			this.input.val('');
			this.selectbox[0].options.selectedIndex = 0;
			
			this.searchResults = [];
			
			this.collection.removeShownMarkers();
			
			return false;
		},
		
		// Update the search results pagination.
		// ---------------
		renderPagination: function(opts) {
			var currentPage = opts.currentPage <= 1 ? 1 : parseInt(opts.currentPage),
				anchorSize = 2,
				html = '<ul>';
			
			if (opts.totalPages < 9) {
				for (var i = 1; i <= opts.totalPages; i++) {
					if (i == currentPage) {
					    html += '<li class="active"><a href="#">'+i+'</a></li>';
					} else {
					    html += '<li><a href="#">'+i+'</a></li>';
					}
				}
			} else {
				if (currentPage <= (anchorSize * 2) + 1) {
					for (var i = 1; i < (anchorSize * 2) + 4; i++) {
						if (i == currentPage) {
						    html += '<li class="active"><a href="#">'+i+'</a></li>';
						} else {
						    html += '<li><a href="#">'+i+'</a></li>';
						}
					}
					html += '<li class="disabled"><a href="#">...</a></li>';
					html += '<li><a href="#">'+(opts.totalPages-1)+'</a></li>';
					html += '<li><a href="#">'+opts.totalPages+'</a></li>';
				} else if (currentPage > (anchorSize * 2) && currentPage < opts.totalPages - (anchorSize * 2)) {					
					html += '<li><a href="#">1</a></li>';
					html += '<li><a href="#">2</a></li>';
					html += '<li class="disabled"><a href="#">...</a></li>';
					
					for (var i = currentPage - anchorSize; i <= currentPage + anchorSize; i++) {					
						if (i == currentPage) {
						    html += '<li class="active"><a href="#">'+i+'</a></li>';
						} else {
						    html += '<li><a href="#">'+i+'</a></li>';
						}
					}
					
					html += '<li class="disabled"><a href="#">...</a></li>';
					html += '<li><a href="#">'+(opts.totalPages-1)+'</a></li>';
					html += '<li><a href="#">'+opts.totalPages+'</a></li>';
				} else {					
					html += '<li><a href="#">1</a></li>';
					html += '<li><a href="#">2</a></li>';
					html += '<li class="disabled"><a href="#">...</a></li>';
					
					for (var i = opts.totalPages - ((anchorSize * 2) + 2); i <= opts.totalPages; i++) {
						if (i == currentPage) {
						    html += '<li class="active"><a href="#">'+i+'</a></li>';
						} else {
						    html += '<li><a href="#">'+i+'</a></li>';
						}
					}
					
				}
			}
		    
		    html += '</ul>';
		    
		    return html;
		}
	});
	
	
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
	
		el: $("#campusmap-ui"),
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
			"click a#map-options-toggler": "togglePanelDisplay",
		},
		
		initialize: function() {
			var query = this.getQueryString('query'),
				deeplinksIds = this.getQueryString('id');
			
			// Initialize the Locations collection and fetch the data.
			this.Collections.Locations = new LocationCollection;
			this.Collections.Locations.fetch();
			
			// Initialize the two UI views.
			this.Views.CampusMap = new MapView({collection: this.Collections.Locations});			
			this.Views.Panel = new PanelView({collection: this.Collections.Locations});			 				
			
			// If there is a predefined query or marker ID's (via GET request), prefill the search input
			// and load search for results.
			// Else, just show the overlays options.
			if (typeof query === 'string' && query !== null) {
				this.Views.Panel.input.val(unescape(query.replace('+', ' ')));
				
				// A slight timeout is needed to allow enough time for the Locations to load.
				var t = setTimeout('window.App.Views.Panel.searchByKeyword()', 100);
			} else if (typeof deeplinksIds === 'string' && deeplinksIds !== null) {
				this.Views.Panel.deeplinksIds = deeplinksIds.split(',');
				
				// A slight timeout is needed to allow enough time for the Locations to load.
				var t = setTimeout('window.App.Views.Panel.searchByIDs()', 100);
			}
		},
		
		// Show/Hide the features panel.
		// ---------------
		togglePanelDisplay: function() {
			var self = this,
				offset = this.Views.Panel.$('#features-panel').offset();
			
			if (offset.left < 0 ) {
				// Show the options panel
				$("#features-panel, #map-canvas").animate({left: "0px"}, 100, "linear");
				
				// Maximize the tab bar.
				$("#options-nav-bar").animate({left: '0px', height: '29px', padding: '15px'}, 100, "linear", function() {
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr('title','Close this sidebar').css({backgroundPosition:'48% 4px', top:'17px', right:'10px'});
				});
			} else {
				// Hide the options pabel.
				//$("#map-options, #map-canvas").animate({left: "-300px"}, 100, "linear", map.resizeMap);	
				$("#features-panel, #map-canvas").animate({left: "-340px"}, 100, "linear", function() {
					self.Views.CampusMap.resizeMap();
				});					
				
				// Minify the tab bar, showing only the arrow.
				$("#options-nav-bar").animate({left: "-300px", height: '10px', padding: '5px'}, 100, "linear", function(){
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr('title','Open this sidebar').css({backgroundPosition:'48% -28px', top:'-1px', right:'-2px'});
				});
			}
			return false;
		},
		
		// Returns the value for a given GET variable.
		// ---------------
		getQueryString: function(a) {
			return (a = location.search.match(new RegExp("[?&]" + a + "=([^&]*)(&?)", "i"))) ? a[1] : a;
		}
	});
	
	
	// Create the "App"
	window.App = new AppView;
});