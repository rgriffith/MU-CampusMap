function getQueryString(a) {
	return (a = location.search.match(new RegExp("[?&]" + a + "=([^&]*)(&?)", "i"))) ? a[1] : a;
}

function CampusMap(canvas) {
	var mapObj = this,
		map,
		markers = [],
		infowindow;
	
	this.canvas = canvas;
	this.kmlVersion = '1.4';
	
	this.markerJSON = null;
	
	this.layers = {
		kml: [],
		buildings: ['academicsLayer', 'administrativeLayer', 'dormLayer']
	};
	
	this.search = {
		query: '',
		results: [],
		count: 0,
		curPage: 1,
		pageSize: 6		
	};
	
	this.initialize = function () {
		// Initialize the Google map.
		map = new google.maps.Map(document.getElementById(this.canvas), {
			zoom: 16,
			zoomControl: true,
			panControl: true,
			center: new google.maps.LatLng(39.996635, -76.353929),		
			mapTypeId: google.maps.MapTypeId.ROADMAP
		});
		
		// Load the default KML layer onto the map.
		var kmlUrl = 'http://www.millersville.edu/directions/kml/mobile/marker-dump.kml?v=' + this.kmlVersion;		
		this.layers.kml['baseLayer'] = new google.maps.KmlLayer(kmlUrl, {suppressInfoWindows: false, preserveViewport: true});
		this.layers.kml['baseLayer'].setMap(map);
		
		// Preload all of the markers for quicker searching and referencing.
		// Once loaded, initialize any query variables that may be supplied.
		$.ajax({
			type: 'GET',
			url: 'http://166.66.47.86/campusmap/ajax/markercache.json',
			dataType: 'json',
			success: function(response) {
				mapObj.markerJSON = response;

				// If we have a search query, search the map...
				// If we have some deep links (i.e. building id's), parse them...
				// Deep links may be in CSV format for multiples.
				var query = getQueryString('query'),
					deeplinksIds = getQueryString('id');				

				// For simplicity, give priority to search over deep links...
				if (query !== null) {
					query = unescape(query);
					mapObj.searchMarkers(query.replace('+', ' '));
				} else if (deeplinksIds !== null) {
					mapObj.deepLinkMarkers(deeplinksIds.split(','));
				}
			}
		});
		
		
	};
	
	this.showKmlLayer = function(layerId, kmlOptions) {
		// If the layer doesn't exist yet, create one.		
		if (this.layers.kml[layerId] === undefined) { 
			this.layers.kml[layerId] = new google.maps.KmlLayer(kmlOptions.url + '?v=' + this.kmlVersion, {
				suppressInfoWindows: kmlOptions.suppressInfoWindows, 
				preserveViewport: kmlOptions.preserveViewport
			});
		}
		
		// Show the KML layer.
		this.layers.kml[layerId].setMap(map);
	}
	
	this.removeKmlLayer = function(layerId) {
		this.layers.kml[layerId].setMap(null);
	}
	
	this.resizeMap = function() {
		google.maps.event.trigger(map, 'resize'); 
	}
	
	this.openMarker = function(markerId, panToMarker) {
		panToMarker = panToMarker || false;	
		google.maps.event.trigger(markers[markerId], 'click');
		if (panToMarker) { 
			map.panTo(markers[markerId].position); 
		}
	};
	
	function setInfoWindow(iw) {
		if (infowindow !== undefined) { infowindow.close(); }
		infowindow = iw;
	}
		
	function createMarker(latlng, title, label, html, showOnMap) {
		showOnMap = showOnMap || false;	
	
		// Create the marker and push it onto the markers array.
		var marker = new google.maps.Marker({
			position: latlng,
			title: title,
			map: showOnMap ? map : null,
			icon: 'http://maps.google.com/mapfiles/marker' + String.fromCharCode(label + 65) + '.png'
		});
		
		// Add the click event on the new marker so we can open its infoWindow
		google.maps.event.addListener(marker, 'click', function() {
			// Create the infowindow
			var infowindow = new google.maps.InfoWindow({
				content: html,
				position: marker.getPosition()
			});
			setInfoWindow(infowindow);
			infowindow.open(map, marker);
		});
		
		return marker;
	};
	
	this.deepLinkMarkers = function(query) {		
		// Clear existing markers.
		this.clearActiveMarkers(true);
		
		this.search.count = query.length;	
		
		// Loop through the ID query string and load the specified markers.
		for (var i = 0; i < query.length; i++) {
			// Are there additional options?
			// 0 = Marker Id
			// 1 = (show)
			var opts = query[i].split(':');
			
			var markerData = mapObj.markerJSON[opts[0]];
		
			// If we're outside of the first page, we don't need to "show" the marker right now.
			var showMarker = i < mapObj.search.pageSize ? true : false;
					
			// Create the marker.
			var latlng = new google.maps.LatLng(parseFloat(markerData.lat), parseFloat(markerData.lng));
			var marker = createMarker(latlng, markerData.name, (i % mapObj.search.pageSize), markerData.infoWindow.content, showMarker);													
						
			markers[markers.length] = marker;
			
			// Add the result so we can parse and display it later.
			mapObj.search.results[mapObj.search.results.length] = markerData;
			
			// If the second portion of opts is true/1, open the marker and center the map.			
			if (opts[1] != null && opts[1].match(RegExp("true|1", 'i'))) {
				mapObj.openMarker(i, true);	
			}
		}
		
		// Update the results list.
		updateResults();
	}

	this.searchMarkers = function(search, greedy) {	
		// If the search is the same, simply loop through the result again.
		// Otherwise, continue with the AJAX search.
		if (this.search.query == search) {
			// Clear the current active markers.
			this.clearActiveMarkers();

			// Update the results listing and show the new markers within the given bounds.
			updateResults();
			
			// Record the lower and upper bounds so we know what markers need to be shown.
			// Show the markers within the range.
			var lowerBound = (this.search.curPage-1)*this.search.pageSize;
			var upperBound = lowerBound+this.search.pageSize;
			upperBound = (upperBound <= this.search.count ? upperBound : this.search.count);
			for (var i = lowerBound; i < upperBound; i++) {
				markers[i].setMap(map);
			}
			return;
		}
		
		greedy = greedy || false;	
	
		this.search.query = search
		
		// Clear existing markers.
		this.clearActiveMarkers(true);

		var params = {
			q: this.search.query,
			greedy: greedy
		};		
		$.getJSON('ajax/search-map.php', params, function(data) {
			if (data.length > 0) {	
				mapObj.search.count = data.length;				
				for (var i = 0; i < data.length; i++) {
					var markerData = mapObj.markerJSON[data[i].id];
				
					// If we're outside of the first page, we don't need to "show" the marker right now.
					var showMarker = i < mapObj.search.pageSize ? true : false;
							
					// Create the marker.
					var latlng = new google.maps.LatLng(parseFloat(markerData.lat), parseFloat(markerData.lng));
					var marker = createMarker(latlng, markerData.name, (i % mapObj.search.pageSize), markerData.infoWindow.content, showMarker);													
								
					markers[markers.length] = marker;
					
					// Add the result so we can parse and display it later.
					mapObj.search.results[mapObj.search.results.length] = markerData;
				}
				
			}
			
			updateResults();			
		});		
	};
	
	this.goToResultsPage = function(page) {
		this.search.curPage = page;
		this.searchMarkers(this.search.query);
	}
	
	this.prepareForSearch = function() {
		this.search.curPage = 1;
		if (infowindow !== undefined) {
			infowindow.close();
		}
	}
	
	this.clearActiveMarkers = function(resetMarkers) {
		resetMarkers = resetMarkers || false;	
	
		// Clear existing markers.
		if (markers) {
			for (var i = 0; i < markers.length; i++) {
				markers[i].setMap(null);
			}
			
			if (resetMarkers) {			
				markers = [];
				this.search.results = [];
				this.search.count = 0;
			}
		}
	}
}