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
				query = query.slice(1, query.length-1);
				return this.filter(function(loc){
					return loc.get('name').match(query) !== null;
				});
			} else {			
				return this.filter(function(loc){
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
			return this.filter(function(loc){
				return parseInt(loc.get('id')) === parseInt(locId);
			});
		}
	});
	
	// Create our global collection of Locations.
	window.Locations = new LocationCollection;
	
	
	window.MapView = Backbone.View.extend({	
		el: $("#map-canvas"),
		
		map: null,
		kmlVersion: '1.4',
		layers: {
			kml: [],
			buildings: ['academicsLayer', 'administrativeLayer', 'dormLayer']
		},
		markers: [],
		infowindow: null,
		
		initialize: function() {
			// Initialize the Google map.
			this.map = new google.maps.Map(document.getElementById('map-canvas'), {
				zoom: 16,
				zoomControl: true,
				panControl: true,
				center: new google.maps.LatLng(39.996635, -76.353929),		
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});
			
			this.render();
		},
		
		render: function() {
			var baseKmlUrl = 'http://www.millersville.edu/directions/kml/mobile/marker-dump.kml?v=' + this.kmlVersion;
			
			// Load the default KML layer onto the map.		
			this.layers.kml['baseLayer'] = new google.maps.KmlLayer(baseKmlUrl, {suppressInfoWindows: false, preserveViewport: true});
			this.layers.kml['baseLayer'].setMap(this.map);		
		},
		
		resizeMap: function() {
			google.maps.event.trigger(this.map, 'resize'); 
		},
		
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
			}
		},
		
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
		
		openMarker: function(markerId, panToMarker) {
			panToMarker = panToMarker || false;	
			google.maps.event.trigger(this.markers[markerId], 'click');
			if (panToMarker) { 
				this.map.panTo(this.markers[markerId].position); 
			}
		},
		
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
		
		setInfoWindow: function(iw) {
			if (this.infowindow !== null) { this.infowindow.close(); }
			this.infowindow = iw;
		},
		
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
		
		removeKmlLayer: function(layerId) {
			this.layers.kml[layerId].setMap(null);
		},
	});
	
	window.CampusMap = new MapView;
	
	// The Main Applicaiton UI
	// Includes search results, overlay tabs and map.
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
			count: 0,
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
			
			Locations.fetch();
			
			this.render();	
		},
		
		render: function() {
			var appObj = this,
				query = this.getQueryString('query'),
				deeplinksIds = this.getQueryString('id'),
				bldgCheckboxes = ['academicsLayer','administrativeLayer','dormLayer'];
			
			// Hide all tab content.
			// Activate first tab.
			// Show first tab content
			//$(".tab-content").hide(); 
			$("#options-nav-bar").find('a:first').addClass("selected");
			$("#map-search").show(); 	
			
			// Preload the intro text for the Search tab.
			//$('#map-overlays').css({display:'block'});
			
			$('#map-overlays').show();
			
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
			
			if (typeof query === 'string' && query !== null) {
				this.input.val(unescape(query.replace('+', ' ')));
				appObj.trigger('submit form#marker-search: "searchByKeyword"');
			}
		},
		
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
		
		// Search the Markers Collection
		updateResults: function() {
			var appObj = this;
			
			var totalPages = Math.ceil(this.searchResults.length / this.searchOpts.pageSize),
				resultsPagesHTML = '<ul id="results-page-1" class="page active">',
				i = 0;
			
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
			
			$('#map-results-stats').html(this.statsTemplate({
				lowerBound: 0,
				upperBound: this.searchOpts.pageSize,
				resultCount: this.searchResults.length,
				query: this.input.val()
			}));
			
			$('#map-results').html(resultsPagesHTML);
			
			$('#map-results li').on('click','a',function(){		
				CampusMap.openMarker(this.id.replace('result-',''));			
				return false;
			});
			
			// Add the pagination HTML and add a click event to each pagination link.
			// Each link will "show" a corresponding page.
			$('#map-results-pagination').html(this.renderPagination({totalPages: totalPages, currentPage: 1}));
			
			$('#map-results-pagination').on('click' ,'a', function() {				
				// Reset the active page and pagination link.
				$('.page.active', $('#map-results')).removeClass('active');		    	
		
				$('#map-results-pagination').html(appObj.renderPagination({
					totalPages: totalPages, 
					currentPage: $(this).text()
				}));
				
				// Make the corresponding results page active.
				$('#results-page-'+$(this).text(), $('#map-results')).addClass('active');
				
				// Update the stats.
				var lowerBound = (parseInt($(this).text()) - 1) * appObj.searchOpts.pageSize;
				var upperBound = lowerBound + appObj.searchOpts.pageSize;
				upperBound = (upperBound <= appObj.searchOpts.count ? upperBound : appObj.searchOpts.count);
				
				$('#map-results-stats').html(appObj.statsTemplate({
					lowerBound: lowerBound,
					upperBound: upperBound,
					resultCount: appObj.searchOpts.count,
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
			
			$('#map-results-wrap').css({display: 'block'});
			
			$('#map-overlays').css({display: 'none'});
						
			// Reset the map and add the new Markers.
			CampusMap.clearActiveMarkers();
			CampusMap.addMarkers(this.searchResults, this.searchOpts.pageSize);
		},
		
		searchByKeyword: function() {
			this.searchResults = Locations.searchByQuery(this.input.val());

			this.searchOpts.count = this.searchResults.length;
			
			$('.kwsearch-clear').css({display:'block'});
			this.selectbox[0].selectedIndex = 0;
			
			this.updateResults();
			
			return false;
		},
		
		searchByBuilding: function() {
			this.searchResults = Locations.searchById(this.selectbox.val());
			this.input.val('"'+this.selectbox[0].options[this.selectbox[0].selectedIndex].text+'"');
			$('.kwsearch-clear').css({display:'block'});
			this.updateResults(this.selectbox.val());	

			return false;		
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
		
		getQueryString: function(a) {
			return (a = location.search.match(new RegExp("[?&]" + a + "=([^&]*)(&?)", "i"))) ? a[1] : a;
		}
	});
	
	
	// Finally, we kick things off by creating the **App**.
	window.App = new AppView;
});


/*
$(function(){

	// Marker Model
	// ----------
	
	// Our basic **Marker** model.
	window.Marker = Backbone.Model.extend();
	
	window.MarkerCollection = Backbone.Collection.extend({
		model: Marker,
		url: "ajax/markercache2.json",
		search: function(query) {
			return this.filter(function(marker){							
				var keywords = query.split(' ');
				for (var i = 0; i < keywords.length; i++) {
					var pattern = new RegExp(keywords[i], 'i');
					if (pattern.test(marker.get('name')) 
						|| pattern.test(marker.get('address')) 
						|| pattern.test(marker.get('id')) 
						|| _.indexOf(marker.get('departments'), keywords[i]) !== -1
						) {
						return true;
					}
				}
				
				return false;
			});
		}
	});
	
	// Create our global collection of **Markers**.
	window.Markers = new MarkerCollection;
	
	
	window.TabView = Backbone.View.extend({
		el: $("#features-panel"),
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
			"click a#map-options-toggler": "toggleDisplay"
		},
		
		// At initialization we bind to the relevant events on the `Todos`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting todos that might be saved in *localStorage*.
		initialize: function() {
			this.input = this.$("#kwsearch-keyword");			
			Markers.fetch();
		},
	});	
	
	// The Feature Panel
	// ---------------
	
	// Our **AppView** is the panel piece of UI.
	window.PanelView = Backbone.View.extend({
	
		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: $("#campusmap-ui"),
		
		// Our template for the line of statistics at the bottom of the app.
		//statsTemplate: _.template($('#stats-template').html()),
		resultsTemplate: _.template($('#search-results-item').html()),
		
		searchResults: [],
		
		// Delegated events for creating new items, and clearing completed ones.
		events: {
			"submit form#marker-search": "searchAndUpdate",
			"click span.kwsearch-clear": "clearResults",
			"click a#map-options-toggler": 'toggleDisplay'
		},
		
		// At initialization we bind to the relevant events on the `Todos`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting todos that might be saved in *localStorage*.
		initialize: function() {
			this.input = this.$("#kwsearch-keyword");			
			Markers.fetch();
		},
		
		// If you hit return in the main input field, and there is text to save,
		// create new **Todo** model persisting it to *localStorage*.
		searchAndUpdate: function() {
			var text = this.input.val();
			
			this.searchResults = Markers.search(text);
			
			console.log(this.searchResults);
			
			var resultsHtml = '';
			for (var i = 0; i < this.searchResults.length; i++) {		
				resultsHtml += this.resultsTemplate({label:i,marker:this.searchResults[i].toJSON()});
			}
			
			this.$('#map-results').html(resultsHtml);
			
			// Show the clear icon.
			this.$('.kwsearch-clear').css({display:'block'});
			
			return false;
			
		},
		
		// Clear the search results.
		clearResults: function() {
			alert($(this.el).text());
		
			this.$('#map-results').html('');
			this.$('.kwsearch-clear').css({display:'none'});
			this.input.val('');
			this.searchResults = [];
			return false;
		},

		toggleDisplay: function() {
			var offset = this.$('#features-panel').offset();
			
			if (offset.left < 0 ) {
				// Show the options panel
				$("#features-panel, #map-canvas").animate({left: "0px"}, 100, "linear");
				
				// Maximize the tab bar.
				$("#options-nav-bar").animate({left: '0px', height: '29px'}, 100, "linear", function() {
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr('title','Close this sidebar').css({backgroundPosition:'48% 4px', top:'13px', right:'10px'});
				});
			} else {
				// Hide the options pabel.
				//$("#map-options, #map-canvas").animate({left: "-300px"}, 100, "linear", map.resizeMap);	
				$("#features-panel, #map-canvas").animate({left: "-320px"}, 100, "linear");					
				
				// Minify the tab bar, showing only the arrow.
				$("#options-nav-bar").animate({left: "-288px", height: '2px'}, 100, "linear", function(){
					// Switch the arrow's orientation and title.
					$('#map-options-toggler').attr('title','Open this sidebar').css({backgroundPosition:'48% -28px', top:'0', right:'-1px'});
				});
			}
			return false;
		}
	});
	
	
	// Finally, we kick things off by creating the **App**.
	window.App = new PanelView;
});
*/