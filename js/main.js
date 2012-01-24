$(function(){
	
	// Location Model and Collection
	// ----------
	window.Location = Backbone.Model.extend();
	
	window.LocationCollection = Backbone.Collection.extend({
		model: Location,
		url: "ajax/markercache.json",
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
		searchById: function(locId) {
			return this.filter(function(loc) {
				return parseInt(loc.get('id')) === parseInt(locId);
			});
		}
	});
	
	// Create our global collection of Locations.
	window.Locations = new LocationCollection;
	
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
		initialize: function() {			
			this.map = new google.maps.Map(document.getElementById('map-canvas'), {
				zoom: 16,
				zoomControl: true,
				panControl: true,
				center: new google.maps.LatLng(39.996635, -76.353929),		
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});
			
			this.render();
		},
		
		// Load the default "base layer" with everything on it.
		render: function() {
			var baseKmlUrl = 'http://www.millersville.edu/directions/kml/mobile/marker-dump.kml?v=' + this.kmlVersion;
			
			// Load the default KML layer onto the map.		
			this.layers.kml['baseLayer'] = new google.maps.KmlLayer(baseKmlUrl, {suppressInfoWindows: false, preserveViewport: true});
			this.layers.kml['baseLayer'].setMap(this.map);		
		},
		
		// Trigger a resize on the map, useful for "refreshing" the bounds.
		resizeMap: function() {
			google.maps.event.trigger(this.map, 'resize'); 
		},
		
		// Loop over marker data and create new markers.
		addMarkers: function(markerData, pageSize) {
			var i = 0,
				pageSize = pageSize || 6;
				
			if (markerData.length > 0) {	
				for (; i < markerData.length; i++) {
					var markerJSON = markerData[i].toJSON();
				
					// If we're outside of the first page on the AppView, we don't need to "show" the marker right now.
					var showMarker = i < pageSize ? true : false;
							
					// Create the marker.
					var latlng = new google.maps.LatLng(parseFloat(markerJSON.lat), parseFloat(markerJSON.lng));
					var marker = this.createMarker(latlng, markerJSON.name, (i % pageSize), markerJSON.infoWindow.content, showMarker);													
								
					this.markers[i] = marker;				
				}
				
				// If there is only one marker, open it and pan the map.
				if (markerData.length === 1) {
					this.openMarker(0, true);
				}
			}
		},
		
		// Create a new marker based on provided data.
		createMarker: function(latlng, title, label, html, showOnMap) {
			var mapObj = this,
				showOnMap = showOnMap || false;			
		
			// Create the marker and push it onto the markers array.
			var marker = new google.maps.Marker({
				position: latlng,
				title: title,
				map: showOnMap ? mapObj.map : null,
				icon: 'http://maps.google.com/mapfiles/marker' + String.fromCharCode(label + 65) + '.png'
			});
			
			// Add the click event on the new marker so we can open its infoWindow
			google.maps.event.addListener(marker, 'click', function() {
				// Create the infowindow
				var infowindow = new google.maps.InfoWindow({
					content: html,
					position: marker.getPosition()
				});
				mapObj.setInfoWindow(infowindow);
				infowindow.open(mapObj.map, marker);
			});
			
			return marker;
		},
		
		// Open a given marker.
		openMarker: function(markerId, panToMarker) {
			panToMarker = panToMarker || false;	
			google.maps.event.trigger(this.markers[markerId], 'click');
			if (panToMarker) { 
				this.map.panTo(this.markers[markerId].position); 
			}
		},
		
		// Clear the currently active markers.
		clearActiveMarkers: function(resetMarkers) {
			resetMarkers = resetMarkers || false;	
		
			// Clear existing markers.
			if (this.markers) {
				for (var i = 0; i < this.markers.length; i++) {
					this.markers[i].setMap(null);
				}
				
				if (resetMarkers === true) {			
					this.markers = [];
				}
			}
		},
		
		// Set the active infowindow.
		setInfoWindow: function(iw) {
			if (this.infowindow !== null) { this.infowindow.close(); }
			this.infowindow = iw;
		},
		
		// Show a given KML layer. Add if it non-existent.
		showKmlLayer: function(layerId, kmlOptions) {
			// If the layer doesn't exist yet, create one.		
			if (this.layers.kml[layerId] === undefined) { 
				this.layers.kml[layerId] = new google.maps.KmlLayer(kmlOptions.url + '?v=' + this.kmlVersion, {
					suppressInfoWindows: kmlOptions.suppressInfoWindows, 
					preserveViewport: kmlOptions.preserveViewport
				});
			}
			
			// Show the KML layer.
			this.layers.kml[layerId].setMap(this.map);
		},
		
		// Remove a KML layer from the map.
		removeKmlLayer: function(layerId) {
			this.layers.kml[layerId].setMap(null);
		}
	});
	
	window.CampusMap = new MapView;
	
	// The Main Applicaiton UI
	// Includes search results and overlay tabs.
	// Manipulates the CampusMap object
	// ---------------
	
	window.AppView = Backbone.View.extend({	
		appObj: this,
		
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
			"click a#map-options-toggler": "togglePanelDisplay",
			"click span.kwsearch-clear": "clearResults",			
			"submit form#marker-search": "searchByKeyword",
			"change select#bldgsearch-select": "searchByBuilding"
		},
		
		initialize: function() {
			this.input = this.$("#kwsearch-keyword");
			this.selectbox = this.$("#bldgsearch-select");
			this.deepLinksIds = [];
			
			Locations.fetch();
			
			this.render();	
		},
		
		render: function() {
			var appObj = this,
				query = this.getQueryString('query'),
				deeplinksIds = this.getQueryString('id'),
				bldgCheckboxes = ['academicsLayer','administrativeLayer','dormLayer'];

			$("#options-nav-bar").find('a:first').addClass("selected");
			$("#map-search").show(); 				
			
			// If there is a predefined query or marker ID's (via GET request), prefill the search input
			// and load search for results.
			// Else, just show the overlays options.
			if (typeof query === 'string' && query !== null) {
				this.input.val(unescape(query.replace('+', ' ')));
				
				// A slight timeout is needed to allow enough time for the Locations to load.
				var t = setTimeout('window.App.searchByKeyword()', 100);
			} else if (typeof deeplinksIds === 'string' && deeplinksIds !== null) {
				this.deeplinksIds = deeplinksIds.split(',');
				
				// A slight timeout is needed to allow enough time for the Locations to load.
				var t = setTimeout('window.App.searchByIDs()', 100);
			} else {
				// Preload the intro text for the Search tab.
				$('#map-overlays').css({display:'block'});
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
						
						if (appObj.input.val() === '' && appObj.selectbox.val() === '') {
							$('#map-overlays').show();
						} else {
							$('#map-overlays').hide();
						}
						
						break;
				}	
				
				return false;			
			});	
			
			// Add a click event to the filter checkboxes
			$('#filter-map').on('change', 'input.filter-checkbox', function(){
				var checkbox = this;
				
				// If the checkbox is checked, activate the layer.
				// Else, remove the layer.
				if( checkbox.checked == true ) {
					var isBuilding = checkbox.value.indexOf('building') != -1 ? true : false;
					
					CampusMap.showKmlLayer(checkbox.id, {
						url: 'http://www.millersville.edu/directions/kml/'+checkbox.value+'.kml',
						suppressInfoWindows: isBuilding, 
						preserveViewport: true
					});
					
					// If the user is selecting a building layer and the full building layer is still showing,
					// remove the full layer and uncheck its checkbox.
					if (checkbox.id != 'baseLayer' && isBuilding && document.getElementById('baseLayer').checked == true) {
						document.getElementById('baseLayer').checked = false;
						CampusMap.removeKmlLayer('baseLayer');
					} else if (checkbox.id == 'baseLayer') {	
						// Loop through and build the selector string by checking for active
						// building layers.
						for (var i = 0; i < bldgCheckboxes.length; i++) {
							if (document.getElementById(bldgCheckboxes[i]).checked == true) {
								document.getElementById(bldgCheckboxes[i]).checked = false;
								CampusMap.removeKmlLayer(bldgCheckboxes[i]);
							}
						}
					}
				} else {
					CampusMap.removeKmlLayer(checkbox.id);
				}
			});	
		},
		
		// Show/Hide the features panel.
		togglePanelDisplay: function() {
			var offset = this.$('#features-panel').offset(),
				appObj = this;
			
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
					CampusMap.resizeMap();
				});					
				
				// Minify the tab bar, showing only the arrow.
				$("#options-nav-bar").animate({left: "-300px", height: '10px', padding: '5px'}, 100, "linear", function(){
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr('title','Open this sidebar').css({backgroundPosition:'48% -28px', top:'-1px', right:'-2px'});
				});
			}
			return false;
		},
		
		// Update the search results, based on searching the Locations Collection.
		updateResults: function() {
			var appObj = this,
				totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize),
				resultsPagesHTML = '',
				i = 0;
			
			if (this.searchResults.length < 1) {
				$('#map-results').html('<div class="alert-message block-message warning"><p>No results were found for <strong><em>' + (this.selectbox.val() !== '' ? this.selectbox.val() : this.input.val()) + '</em></strong>.<br /><br />Please make sure building or department names are spelled correctly.</p></div>');
			} else {	
				// Loop through the results and generate the result HTML.			
				resultsPagesHTML += '<ul id="results-page-1" class="page active">';				
				for (; i < this.searchResults.length; i++) {		
					var tempPage = Math.floor(i/this.searchOpts.pageSize)+1,
						label = i % this.searchOpts.pageSize;
					
					if (tempPage > this.searchOpts.curPage) {
						this.searchOpts.curPage = tempPage;
						resultsPagesHTML += '</ul><ul id="results-page-'+this.searchOpts.curPage+'" class="page">';						
					}
					
					resultsPagesHTML += this.resultsTemplate({id: i, label: label, marker: this.searchResults[i].toJSON()});
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
					CampusMap.openMarker(this.id.replace('result-',''));			
					return false;
				});
				
				// Add the pagination HTML and add a click event to each pagination link.
				// Each link will "show" a corresponding page.
				$('#map-results-pagination').html(this.renderPagination({totalPages: totalPages, currentPage: 1}));
				
				// Add a click event to the pagination links.
				$('#map-results-pagination').on('click' ,'a', function() {				
					var pageClicked = parseInt($(this).text());
				
					// Reset the active page and pagination link.
					$('.active', $('#map-results')).removeClass('active');		    	
					
					$('#map-results-pagination').html(appObj.renderPagination({
						totalPages: totalPages, 
						currentPage: pageClicked
					}));
					
					// Make the corresponding results page active.
					$('#results-page-'+pageClicked, $('#map-results')).addClass('active');
					
					// Update the stats.
					var lowerBound = (pageClicked - 1) * appObj.searchOpts.pageSize;
					var upperBound = lowerBound + appObj.searchOpts.pageSize;
					upperBound = (upperBound <= appObj.searchResults.length ? upperBound : appObj.searchResults.length);
					
					$('#map-results-stats').html(appObj.statsTemplate({
						lowerBound: lowerBound,
						upperBound: upperBound,
						resultCount: appObj.searchResults.length,
						query: appObj.input.val()
					}));
					
					// Reset the map and add the next set of Markers.				
					CampusMap.clearActiveMarkers();
					for (var i = lowerBound; i < upperBound; i++) {
						// The markers are already created, so all we need to do is add them
						// to the map.
						CampusMap.markers[i].setMap(CampusMap.map);
					}
					
					return false;
				});
			}
			
			// Hide the overlays options content.
			$('#map-overlays').css({display: 'none'});
						
			// Reset the map and add the new Markers.
			CampusMap.clearActiveMarkers();
			CampusMap.addMarkers(this.searchResults, this.searchOpts.pageSize);
			
			// Show the results.
			$('#map-results-wrap').css({display: 'block'});
		},
		
		// Search the Locations Collection by keyword.
		searchByKeyword: function() {
			this.searchResults = Locations.searchByQuery(this.input.val());
			this.selectbox[0].selectedIndex = 0;			
			this.updateResults();
			
			return false;
		},
		
		// Search the Locations Collection by building selectbox.
		searchByBuilding: function() {
			this.searchResults = Locations.searchById(this.selectbox.val());
			this.input.val('"'+this.selectbox[0].options[this.selectbox[0].selectedIndex].text+'"');
			this.updateResults();	

			return false;		
		},
		
		// Search the Locations Collection by IDs provided via GET request (CSV format).
		searchByIDs: function() {
			var i = 0;
			
			// Loop through the IDs and load the specified markers.
			for (; i < this.deeplinksIds.length; i++) {
				var model = Locations.get(this.deeplinksIds[i]);
				
				if (model !== undefined) {
					this.searchResults.push(model);
				}
			}
			
			this.updateResults();	
		},
		
		// Clear the search results.
		clearResults: function() {			
			$('#map-results-pagination, #map-results-feedback, #map-results').html('');	
			$('#map-results-wrap, .kwsearch-clear').css({display:'none'});
			$('#map-overlays').css({display: 'block'});
			
			this.input.val('');
			this.selectbox[0].options.selectedIndex = 0;
			
			this.searchResults = [];
			
			CampusMap.clearActiveMarkers();
			
			return false;
		},
		
		// Update the search results pagination.
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
		},
		
		// Returns the value for a given GET variable.
		getQueryString: function(a) {
			return (a = location.search.match(new RegExp("[?&]" + a + "=([^&]*)(&?)", "i"))) ? a[1] : a;
		}
	});
	
	// Create the "app"
	window.App = new AppView;
});