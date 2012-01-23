<!DOCTYPE html> 
<html> 
<head> 
	<meta name="viewport" content="initial-scale=1.0, user-scalable=no" /> 
	<meta http-equiv="content-type" content="text/html; charset=UTF-8"/> 
	
	<title>Millersville Campus Map v3</title> 
	
	<link rel="stylesheet" media="all" href="css/directions.css?v=1.1" />
</head> 

<body> 
	<div id="header">
		<a href="#" id="millersville-logo"><img src="http://www.millersville.edu/lib/v2/img/common/millersville-university-logo.jpg" alt="Millersville University Home" /></a>
		<h1 id="the-title">Campus Map</h1>
		<form action="http://www.millersville.edu/searchresults.php" id="search-mu" method="get" name="search">
			<fieldset> 
				<input id="search-mu-keyword" name="query" type="text" value="Search web &amp; directory"/> 
				<input alt="Search" id="search-mu-submit" name="search" src="http://www.millersville.edu/lib/v2/img/common/magnifyer.png" type="image"/> 						
			</fieldset>
		</form>
	</div>

	<div id="map-canvas"></div> 
	
	<div id="options-nav-bar">				
		<a title="Close this sidebar" id="map-options-toggler" href="#">Close</a>
		<a title="Show the Search Map tab" id="tablink-search" href="#map-search" class="tab-button left selected">Search</a>
		<a title="Show the Building List tab" id="tablink-buildings" href="#map-buildings" class="tab-button mid">Building List</a>			
		<a title="Show the Map Options tab" id="tablink-mapoptions" href="#map-overlays" class="tab-button right">Overlays</a>
	</div>
	
	<div id="map-options">		
		<div id="map-options-content">
		
			<div id="tabs">		
				<div id="map-search" class="tabs-content">
					<form action="" id="kwsearch" method="get">
						<fieldset>
							<input id="kwsearch-keyword" name="query" type="text" placeholder="Search Campus Map"/> 
							<input id="kwsearch-submit" name="search" type="submit" value="Search" />
							<span class="kwsearch-clear" title="Clear the current search">Clear Search</span>
						</fieldset>
					</form>
				</div>
				<div id="map-buildings" class="tabs-content">
					<form action="" id="bldgsearch" class="form-stacked" method="get">
						<fieldset> 
							<?php
							
							$buildings = json_decode(file_get_contents('ajax/buildingcache.json'));
							$acadBldgsHTML = $adminBldgsHTML = $dormBldgsHTML = '';
							foreach ($buildings as $name => $b) {
								$optionHTML = '<option value="'.$b->id.'">'.$b->name.'</option>';
								switch ($b->category) {
									case 'academics':
										$acadBldgsHTML .= $optionHTML;
										break;
									case 'administrative':
										$adminBldgsHTML .= $optionHTML;
										break;
									case 'dorm':
										$dormBldgsHTML .= $optionHTML;
										break;
								}
							}
							
							?>
							
							<div class="clearfix">
								<label for="bldgsearch-select">Select a building:</label>
								<div class="input">
									<select class="span4" id="bldgsearch-select" name="bldgsearch-select">
										<option/>
										<optgroup label="Academic Buildings">
											<?php echo $acadBldgsHTML; ?>
										</optgroup>
										<optgroup label="Administrative Buildings">
											<?php echo $adminBldgsHTML; ?>
										</optgroup>
										<optgroup label="Dorm Buildings">
											<?php echo $dormBldgsHTML; ?>
										</optgroup>
									</select>
								</div>
							</div>
							<span class="kwsearch-clear" title="Clear the current search">Clear Search</span>
						</fieldset>
					</form>
				</div>				
				<div id="map-overlays" class="tabs-content">		
					<!--<h4>Looking for something?</h4>
					<p>Try searching for a building or department in the text box above <strong>(e.g. Lyle Hall or Biology)</strong> and hitting enter, or, try selecting a building from the <a href="#" onclick="$('#tablink-buildings').click();return false;">Building List</a>.</p> 
					<p>Or, use the <a href="#" onclick="$('#tablink-mapoptions').click();return false;">Map Options tab</a> to show/hide various building categories and other campus services.</p>
					<h4 style="margin-top:20px;">Need Directions?</h4>
					<p><a href="http://maps.google.com/maps?f=d&amp;source=s_d&amp;daddr=39.996635,-76.353929&amp;hl=en" target="_blank">Get general directions to the Millersville Campus</a></p>
					<p>Or, click on a building/department and use the <em>Get directions</em> link within the info window.</p>-->
					<fieldset id="filter-map" class="form-stacked">
						<legend>Overlays</legend>
						<ul class="inputs-list">			
					 		<li class="filter-heading">Buildings</li>
					 		
							<li><label for="baseLayer">
								<input type="checkbox" name="baseLayer" class="filter-checkbox" id="baseLayer" checked="checked" value="marker-dump" />
									All Buildings</label></li>
					
							<li><label for="academicsLayer">
								<input type="checkbox" name="academicsLayer" class="filter-checkbox" id="academicsLayer" value="academic-buildings" />
									<span class="filter-icon filter-icon-academics"></span>Academic Buildings</label></li>
					
							<li><label for="administrativeLayer">
								<input type="checkbox" name="administrativeLayer" class="filter-checkbox" id="administrativeLayer" value="administrative-buildings" />
									<span class="filter-icon filter-icon-administrative"></span>Administrative Buildings</label></li>
							
							<li><label for="dormLayer">
								<input type="checkbox" name="dormLayer" class="filter-checkbox" id="dormLayer" value="dorm-buildings" />
									<span class="filter-icon filter-icon-housing"></span>Student Housing</label></li>
							
							<li class="filter-heading">Services</li>
							
							<li><label for="emergencycallboxesLayer">
								<input type="checkbox" name="emergencycallboxesLayer" class="filter-checkbox" id="emergencycallboxesLayer" value="mu-emergencycallboxes" />
									<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/callbox.png" alt="" /></span>Emergency Callboxes
								</label></li>
							
							<li><label for="muparkingLayer">
								<input type="checkbox" name="muparkingLayer" class="filter-checkbox" id="muparkingLayer" value="mu-parkinglots" />
									<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/parking.png" alt="" /></span>Parking Lots
								</label></li>
							
							<li class="filter-heading">Shuttle Routes</li>
							
							<li><label for="mushuttleLayer">
								<input type="checkbox" name="mushuttleLayer" class="filter-checkbox" id="mushuttleLayer" value="mu-shuttlebus" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=FF69BB&chd=s:A9&chls=2" alt="" /></span>MU Campus Shuttle
								</label></li>
								
							<li><label for="route16">
								<input type="checkbox" name="route16" class="filter-checkbox" id="route16" value="route-16" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=ff694e&chd=s:A9&chls=2" alt="" /></span>MU-Lancaster Route 16
								</label></li>
								
							<li><label for="parkcity">
								<input type="checkbox" name="parkcity" class="filter-checkbox" id="parkcity" value="park-city-xpress" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=5577bb&chd=s:A9&chls=2" alt="" /></span>MU Park City Xpress
								</label></li>
						</ul>
					</fieldset>
				</div>
				
				<div id="map-results-wrap">
					<div id="map-results-feedback"></div>
					<dl id="map-results"></dl>	
					<div id="map-results-pagination" class="pagination"></div>
				</div>
				
				<div id="footer">
					<p id="afs"><a href="http://www.millersville.edu">Millersville University</a>. All Rights Reserved.<br />A member of the Pennsylvania State System of Higher Education. &copy; <?=date('Y');?></p>
				</div>
			</div>
		</div>
	</div>
	
	
</body> 

<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script> 

<script src="//maps.google.com/maps/api/js?sensor=true" type="text/javascript"></script>

<script src="js/map.js" type="text/javascript"></script>

<script type="text/javascript"> 

// Initialize the campus map...
var map = new CampusMap('map-canvas');
map.initialize();

// Some globals for later use...
var bldgCheckboxes = [
	'academicsLayer','administrativeLayer','dormLayer',
];

// When page loads...
$(function() {
	// Function used to clear the current results HTML and markers.
	var clearResults = function(resetMarkers) {
		resetMarkers = resetMarkers || false;				
		$('#map-results-pagination, #map-results-feedback, #map-results').html('');	
		$('#map-overlays').css({display:'none'});
		map.clearActiveMarkers(resetMarkers);	
	};

	// Hide all tab content.
	// Activate first tab.
	// Show first tab content
	$("#map-search, #map-buildings, #map-overlays").hide(); 
	$("#options-nav-bar").find('a:first').addClass("selected");
	$("#map-search").show(); 	
	
	// Preload the intro text for the Search tab.
	$('#map-overlays').css({display:'block'});

	//On Click/Change Events
	$('#options-nav-bar').on('click','a',function(){
		var tab = this;
	
		// We don't want to add this click event to the panel's toggler.
		if (tab.id == 'map-options-toggler') { 
			toggleSidebar();
		} else {							
			// If we're showing the options tab, hide the results container.						
			$('#map-results-wrap').css({display: (tab.id == 'tablink-mapoptions' ? 'none' : 'block')});			
			
			// 1. Remove any "active" class.
			// 2. Add "active" class to selected tab.
			// 3. Hide all tab content
			$('#options-nav-bar').find('a').removeClass("selected"); 		
			$(tab).addClass("selected"); 
			$("#map-search, #map-buildings, #map-overlays").hide();
			
			// Fade in the active ID content based on the link's HREF.
			$($(tab).attr('href')).fadeIn(); 			
			
			// If there are no results to display, show the overlays options as well.
			if (tab.id != 'tablink-mapoptions') {
				$('#map-overlays').css({display: (map.search.count !== 0 ? 'none' : 'block')});
			}
		}
		return false;
	});
	
	$('#bldgsearch-select').on('change', function() {
		// If the user chose no building, just clear everything and reset
		// by triggering the clear icon's click event.
		if (this.value === '') {
			$('.kwsearch-clear').click();
		} else {
			// Show the selected marker, this will hide the previous selection
			// if applicable.
			clearResults();
			$('input#kwsearch-keyword').val('"'+this.options[this.selectedIndex].text+'"');
			map.deepLinkMarkers([this.value]);
		}
		return false;
	});
	
	$('#filter-map').on('change', 'input.filter-checkbox', function(){
		var checkbox = this;
		
		// If the checkbox is checked, activate the layer.
		// Else, remove the layer.
		if( checkbox.checked == true ) {
			var isBuilding = checkbox.value.indexOf('building') != -1 ? true : false;
			
			map.showKmlLayer(checkbox.id, {
				url: 'http://www.millersville.edu/directions/kml/'+checkbox.value+'.kml',
				suppressInfoWindows: isBuilding, 
				preserveViewport: true
			});
			
			// If the user is selecting a building layer and the full building layer is still showing,
			// remove the full layer and uncheck its checkbox.
			if (checkbox.id != 'baseLayer' && isBuilding && document.getElementById('baseLayer').checked == true) {
				document.getElementById('baseLayer').checked = false;
				map.removeKmlLayer('baseLayer');
			} else if (checkbox.id == 'baseLayer') {	
				// Loop through and build the selector string by checking for active
				// building layers.
				for (var i = 0; i < bldgCheckboxes.length; i++) {
					if (document.getElementById(bldgCheckboxes[i]).checked == true) {
						document.getElementById(bldgCheckboxes[i]).checked = false;
						map.removeKmlLayer(bldgCheckboxes[i]);
					}
				}
			}
		} else {
			map.removeKmlLayer(checkbox.id);
		}
	});		
	
	// When results are added, we'll show a nice little clear icon.
	// This will add the click event to reset and clear the results.
	$('.kwsearch-clear').on('click', function(){
		var kwsearchInput = $('input#kwsearch-keyword');
		var bldgsearchSelect = $('select#bldgsearch-select');

		kwsearchInput.val('');
		bldgsearchSelect[0].options.selectedIndex = 0;
		
		$('.kwsearch-clear').hide();
		
		clearResults(true);
		$('#map-overlays').css({display:'block'});
		
		kwsearchInput.focus();
		bldgsearchSelect.focus();
	});
	
	// When a keyword is added and the user searches, show the clear icon.
	$('input#kwsearch-keyword').on('change', function(){
		// Toggle the clear icon visibility as needed.
		var display = $(this).val() != '' ? 'block' : 'none';
		$('.kwsearch-clear').css({display:display});
	});
	
	// When the search form is submitted, clear the results, add a placeholder and search
	// the markers for the given query.
	$('form#kwsearch').on('submit', function() {
		var searchValue = document.getElementById('kwsearch-keyword').value;
		var resultsDL = document.getElementById('map-results');
		
		// Clear the results area before we perform the search.
		clearResults();
		
		// Ensure the query is at least 2 characters.
		if (searchValue.length < 2) {
			resultsDL.innerHTML = '<dd>Please enter a keyword that is <strong>at least 2 characters</strong> in length.</dd>';
		} else {
			map.prepareForSearch();
			
			// Add a placeholder
			resultsDL.innerHTML = '<dd>Loading...</dd>';			
			map.searchMarkers(searchValue);
		}

		return false;
	});
});

// =========================================================================== //
// Results display logic and code.

function updateResults() {
	var resultsHtml = '';
	var paginationHtml = '';
	
	if (map.search.count > 0) {		
		var lowerBound = (map.search.curPage-1)*map.search.pageSize;
		var upperBound = lowerBound+map.search.pageSize;
		upperBound = (upperBound <= map.search.count ? upperBound : map.search.count);
		
		var index = lowerBound;
		for (var i = 0; i < (upperBound-lowerBound); i++) {		
			resultsHtml += '<dt>'+String.fromCharCode(i + 65)+'</dt>';
			resultsHtml += '<dd><a id="result-'+index+'" href="#">'+map.search.results[index].name+'<span>'+map.search.results[index].address+'</span></a></dd>';
			index++;
		}
		
		// Hide the Overlays conent.
		$('#map-overlays').css({display: 'none'});
		
		document.getElementById('map-results-feedback').innerHTML = '<p>Showing <strong>'+(lowerBound == 0 ? 1 : lowerBound+1)+'-'+(upperBound <= map.search.count ? upperBound : map.search.count)+'</strong> of <strong>'+map.search.count+'</strong>'+(map.search.query != '' ? ' for <em>'+map.search.query+'</em>' : '')+'.</p>';
		
		// Add marker results and a click event to each one so the corresponding
		// marker's infowindow opens.
		document.getElementById('map-results').innerHTML = resultsHtml;
		$('dl#map-results').on('click','a',function(){		
			map.openMarker(this.id.replace('result-',''));			
			return false;
		});		
		
		// Unfocus the keyword field now that the results are shown.
		// This should help avoid repetetive submissions.
		var keywordInput = document.getElementById('kwsearch-keyword');
		keywordInput.blur();
		if (keywordInput.value == '' && map.search.query != '') {
			keywordInput.value = map.search.query
		}
		
		// Toggle the clear icon visibility so the user can clear the results.
		$('.kwsearch-clear').css({display:'block'});
		
		// Setup the pagination HTML and add a click event to the appropriate links.
		document.getElementById('map-results-pagination').innerHTML = setupPagination(map.search.count);
		$('#map-results-pagination').on('click','a',function() {
			// We don't want to add a click event to disabled or active links.
			if ($(this).hasClass('disabled') || $(this).hasClass('active')) { return false; }
		
			// Add a placeholder and remove the feedback content.
			document.getElementById('map-results').innerHTML = '<dd>Loading...</dd>';
			$('#map-results-feedback, #map-results-pagination').html('');
			map.goToResultsPage(parseInt($(this).text()));
			return false;
		}); 		
		
		// If there is only one result, open up the marker for convenience.
		if (map.search.count == 1) {
			map.openMarker(lowerBound, true);
		}
	} else {
		document.getElementById('map-results').innerHTML = '<dd>No results were found for <em>'+map.search.query+'</em>.<br /><br />Please make sure building or department names were spelled correctly.</dd>';
	}
}

// =========================================================================== //
// Pagination HTML generation logic and code.

function setupPagination(count) {
	var html = '<ul>';

	var totalPages = Math.ceil(count / map.search.pageSize);
	var currentPage = map.search.curPage == 0 ? 1 : map.search.curPage;

	var anchorSize = 1;
	var halfWindowSize = 2;	        
    var elipsesCount = 0;
    
    for (var page = 1; page <= totalPages; page++) {
    	// If there are less than 9 pages, just display them all.
    	// Otherwise, add in some elipses and seperation so they fit nicely.
    	if (totalPages < 9) {
    		if (page == currentPage) {
    		    html += '<li class="active"><a href="#">'+page+'</a></li>';
    		} else {
    		    html += '<li><a href="#">'+page+'</a></li>';
    		}
    	} else {
	        // Do we display a link for this page or not?
	        if ( page <= anchorSize ||  
	            page > totalPages - anchorSize ||
	            (page >= currentPage - halfWindowSize && page <= currentPage + halfWindowSize) ||
	            (page == anchorSize + 1 && page == currentPage - halfWindowSize - 1) ||
	            (page == totalPages - anchorSize &&  page == currentPage + halfWindowSize + 1 )
			) {
	            elipsesCount = 0;
	            if (page == currentPage) {
	                html += '<li class="active"><a href="#">'+page+'</a></li>';
	            } else {
	                html += '<li><a href="#">'+page+'</a></li>';
				}
	        // If not, have we already shown the elipses?
	        } else if (elipsesCount == 0) {
	            html += '<li class="disabled"><a href="#">...</a></li>';
	            elipsesCount++; // make sure we only show it once
	        }
		}
    }
    
    html += '</ul>';
    
    return html;
}

// =========================================================================== //
// Open/Close the sidebar code

function toggleSidebar() {
	var offset = $('#map-options').offset();
	(offset.left < 0 ) ? openSidebar() : closeSidebar();
	return false;
}

function closeSidebar() {
	// Hide the options pabel.
	$("#map-options, #map-canvas").animate({left: "-300px"}, 100, "linear", map.resizeMap);	
	// Minify the tab bar, showing only the arrow.
	$("#options-nav-bar").animate({left: "-278px", height: '2px'}, 100, "linear", function(){
		// Switch the arrow's orientation and title.
		$('#map-options-toggler').attr('title','Open this sidebar').css({backgroundPosition:'48% -28px', top:'0', right:'-1px'});
	});
		
}

function openSidebar() {
	// Show the options panel
	$("#map-options, #map-canvas").animate({left: "0px"}, 100, "linear");
	// Maximize the tab bar.
	$("#options-nav-bar").animate({left: '0px', height: '29px'}, 100, "linear", function() {
		// Switch the arrow's orientation and title.
		$('#map-options-toggler').attr('title','Close this sidebar').css({backgroundPosition:'48% 4px', top:'13px', right:'10px'});
	});
}

</script>

</html> 