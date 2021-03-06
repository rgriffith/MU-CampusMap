<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="utf-8"/>
	<title>Campus Map - Millersville University</title>
	<meta content="campus map, directions, map, buildings, houses, dorms, housing, academic buildings, administrative buildings, shuttle, bus, routes, stops, bus stops, emergency callboxes, callboxes, lots, parking, parking lots," name="keywords"/>
	<meta content="Search or browse by building name. View building information and get directions." name="description"/>
	<link rel="stylesheet" href="lib/css/bootstrap.css?v=1.4" />
</head>

<body>

<div id="header" class="navbar navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<a class="brand" href="index.php">Campus Map</a>
			<p class="navbar-text pull-right"><a href="http://www.millersville.edu" title="Millersville University Home"><img src="http://www.millersville.edu/lib/v2/img/common/millersvilleCircleM-32.png" alt="Millersville University Home" /></a></p>
		</div>
	</div>
</div>

<div id="campusmap-ui" class="row">
	<div id="map-canvas"></div> 
	
	<div id="panel-wrapper" class="span5">
		<div id="options-nav-bar" class="btn-toolbar">
			<div class="btn-group">
				<a title="Show the Search Map tab" id="tablink-search" href="#kwsearch" class="btn active">Search</a>
				<a title="Show the Location List tab" id="tablink-buildings" href="#locsearch" class="btn">Locations</a>			
				<a title="Show the Map Options tab" id="tablink-mapoptions" href="#map-overlays" class="btn">Overlays</a>
				<a title="Link to this Map" id="tablink-link" href="#link" class="btn"><i class="icon-share-alt"></i></a>
			</div>
			<a title="Close this sidebar" id="map-options-toggler" class="icon-chevron-left" href="#">Close</a>
		</div>
		
		<div id="features-panel">					
			<div id="map-search" class="tabs-content">
				<form action="" id="marker-search" method="get">
					<fieldset id="kwsearch" class="form-inline">
						<input id="kwsearch-keyword" name="query" type="text" placeholder="Search Campus Map"/> 
						<button id="kwsearch-submit" class="btn btn-primary" name="search" type="submit" title="Perform Search"><i class="icon-search icon-white"></i></button>
						<a href="#" title="Clear Search" class="close kwsearch-clear">&times;</a>	
					</fieldset>
					<fieldset id="locsearch"> 
						<?php			
						$locations = json_decode(file_get_contents('lib/data/json/mu_campusmap_locations.json'));
						$acadLocHTML = $adminLocHTML = $dormLocHTML = $otherLocHTML = '';
						foreach ($locations as $name => $l) {
							if ($l->isDepartment == false) {
								$optionHTML = '<option value="'.$l->id.'">' . (strlen($l->name) < 40 ? $l->name : substr($l->name, 0, 40) . '...' ) . '</option>';
								switch ($l->category) {
									case 'academics':
										$acadLocHTML .= $optionHTML;
										break;
									case 'administrative':
										$adminLocHTML .= $optionHTML;
										break;
									case 'dorm':
										$dormLocHTML .= $optionHTML;										
										break;
									default:
										$otherLocHTML .= $optionHTML;
										break;
								}
							}
						}							
						?>
						<label for="locsearch-select">Select a location:</label>
						<div class="input">
							<select class="span4" id="locsearch-select" name="locsearch-select">
								<option/>
								<optgroup label="Academic Buildings">
									<?php echo $acadLocHTML; ?>
								</optgroup>
								<optgroup label="Administrative Buildings">
									<?php echo $adminLocHTML; ?>
								</optgroup>
								<optgroup label="Dorm Buildings">
									<?php echo $dormLocHTML; ?>
								</optgroup>
								<optgroup label="Other Locations">
									<?php echo $otherLocHTML; ?>
								</optgroup>
							</select>
						<a title="Clear Search" class="close kwsearch-clear">&times;</a>								
					</fieldset>		
				</form>
			
				<div id="map-results-wrap">
					<div id="map-results-stats"></div>
					<div id="map-results"></div>							
					<div id="map-results-pagination" class="pagination"></div>
				</div>
			</div>
			<div id="map-overlays" class="tabs-content">
				<fieldset id="filter-map" class="form-stacked">
					<legend>Overlays</legend>
					<ul class="inputs-list">			
				 		<li class="filter-heading">Buildings</li>
				 		
						<li><label for="baseLayer" class="checkbox">
							<input type="checkbox" name="baseLayer" class="filter-checkbox" id="baseLayer" checked="checked" value="http://www.millersville.edu/directions/data/markers.kml" />
								All Buildings</label></li>
				
						<li><label for="academicsLayer" class="checkbox">
							<input type="checkbox" name="academicsLayer" class="filter-checkbox building-layer" id="academicsLayer" value="http://www.millersville.edu/directions/data/academic-buildings.kml" />
								<span class="filter-icon filter-icon-academics"></span>Academic Buildings</label></li>
				
						<li><label for="administrativeLayer" class="checkbox">
							<input type="checkbox" name="administrativeLayer" class="filter-checkbox building-layer" id="administrativeLayer" value="http://www.millersville.edu/directions/data/administrative-buildings.kml" />
								<span class="filter-icon filter-icon-administrative"></span>Administrative Buildings</label></li>
						
						<li><label for="dormLayer" class="checkbox">
							<input type="checkbox" name="dormLayer" class="filter-checkbox building-layer" id="dormLayer" value="http://www.millersville.edu/directions/data/dorm-buildings.kml" />
								<span class="filter-icon filter-icon-housing"></span>Student Housing</label></li>
						
						<li class="filter-heading">Services</li>
						
						<li><label for="muathleticLayer" class="checkbox">
							<input type="checkbox" name="muathleticLayer" class="filter-checkbox" id="muathleticLayer" value="http://www.millersville.edu/directions/data/mu-athleticareas.kml" />
								<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/athleticarea.png" alt="" /></span>Athletics
							</label></li>
						
						<li><label for="emergencycallboxesLayer" class="checkbox">
							<input type="checkbox" name="emergencycallboxesLayer" class="filter-checkbox" id="emergencycallboxesLayer" value="http://www.millersville.edu/directions/data/mu-emergencycallboxes.kml" />
								<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/callbox.png" alt="" /></span>Emergency Callboxes
							</label></li>
						
						<li><label for="muparkingLayer" class="checkbox">
							<input type="checkbox" name="muparkingLayer" class="filter-checkbox" id="muparkingLayer" value="http://www.millersville.edu/directions/data/mu-parkinglots.kml" />
								<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/parkinglot.png" alt="" /></span>Parking Lots
							</label></li>
						
						<li class="filter-heading">Shuttle Routes</li>
						
						<li><label for="mushuttleLayer" class="checkbox">
							<input type="checkbox" name="mushuttleLayer" class="filter-checkbox" id="mushuttleLayer" value="http://www.millersville.edu/directions/data/mu-shuttlebus.kml" />
								<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=FF69BB&chd=s:A9&chls=2" alt="" /></span>MU Campus Shuttle
							</label></li>
							
						<li><label for="route16" class="checkbox">
							<input type="checkbox" name="route16" class="filter-checkbox" id="route16" value="http://www.millersville.edu/directions/data/route-16.kml" />
								<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=ff694e&chd=s:A9&chls=2" alt="" /></span>MU-Lancaster Route 16
							</label></li>
							
						<li><label for="parkcity" class="checkbox">
							<input type="checkbox" name="parkcity" class="filter-checkbox" id="parkcity" value="http://www.millersville.edu/directions/data/park-city-xpress.kml" />
								<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=5577bb&chd=s:A9&chls=2" alt="" /></span>MU Park City Xpress
							</label></li>
					</ul>
				</fieldset>
			</div>
			<div id="link" class="tabs-content"></div>
			<div id="footer">
				<p><a href="files/CampusMap.pdf"><i class="icon-download-alt"></i> Download PDF map</a>
				<p id="afs"><a href="http://www.millersville.edu">Millersville University</a>. All Rights Reserved.<br />A member of the Pennsylvania State System of Higher Education. &copy; <?=date('Y');?></p>
			</div>

		</div>
	</div>
</div>

<!-- Tip Content -->
<ol id="joyRideTipContent">
	<li data-id="tablink-search" data-text="Next: Locations">
		<h2>Search by Keyword</h2>
		<p>You can search for buildings and/or departments using the keyword search tab.</p>
	</li>
	<li data-id="tablink-locations" data-text="Next: Overlays">
		<h2>Search by Location</h2>
		<p>Not sure what to search for? Try browsing a listing of location names.</p>
	</li>
	<li data-id="tablink-mapoptions" data-text="Next: Share">
		<h2>Overlays</h2>
		<p>Want a general overview of what campus looks like, or the locations for parking and emergency callboxes? How about shuttle routes, too?</p>
	</li>
	<li data-id="tablink-link" data-text="Close Tour">
		<h2>Share a URL</h2>
		<p>Want to send someone a link to a building, or a search you made? Use the share tab to easily copy a link to bookmark, e-mail, or even IM.</p>
	</li>
</ol>

<div id="modalContain" />

<script type="text/template" id="search-results-stats">
	<div id="map-results-feedback">
		<p>Showing <strong><%= lowerBound == 0 ? 1 : lowerBound+1 %> - <%= upperBound <= resultCount ? upperBound : resultCount %></strong> of <strong><%= resultCount %></strong><% print(query !== '' ? ' for <em>'+query+'</em>' : ''); %>.</p>
	</div>
</script>

<script type="text/template" id="search-results-item">
	<li>
		<span class="marker-result-label"><% print(String.fromCharCode(label + 65)); %></span>
		<a id="result-<%= id %>" href="#"><%= marker.name %><span><%= marker.address %></span></a>
	</li>
</script>

<script type="text/template" id="share-fields">
	<fieldset>
		<legend>Share via URL</legend>
		<p>Copy the link below to <strong>bookmark</strong> or share via <strong>e-mail</strong> or <strong>IM</strong>.</p>
		<label for="sharedlink" style="display:none">Map Link</label>
			<textarea id="sharedlink" class="span3" readonly="readonly"><%= shareUrl %></textarea>
	</fieldset>
</script>

<script type="text/template" id="marker-infowindow-content">
	<div style="width:380px;">
		<div style="font-weight: bold; font-size: medium; margin-bottom: 0em;"><%= marker.name %></div>
		<div class="map-infowindow">
			<%= marker.image != '' ? "<img src=\"" + marker.image + "\" align=\"right\" alt=\"Picture of " + (marker.isDepartment ? marker.buildingName : marker.name) + "\" />" : "" %>
			<address><%= marker.isDepartment ? marker.buildingName + "<br/>" : "" %><%= marker.address %><br/>Millersville, PA 17551</address>
			<%= marker.phone != '' ? "<p>Ph: " + marker.phone + "</p>" : "" %>
			<p>
				<a href="<%= marker.directionsUrl %>" target="_blank">Get directions</a> | <a href="#markerModal" data-toggle="modal" class="modal-toggler-<%= marker.id %>">View more</a>
			</p>
		</div>
	</div>
</script>

<script type="text/template" id="marker-modal-content">
	<div class="modal" id="markerModal">
		<div class="modal-header">
			<a class="close" data-dismiss="modal">&times;</a>
			<h3><%= marker.name %></h3>			 
		</div>
		<div class="modal-body">			
			<div class="span4">
				<%= marker.description != "" ? "<p>" + marker.description + "</p>" : "" %>
				<%= marker.isDepartment ? "<p><a href=\"" + marker.website + "\" target=\"_blank\" class=\"btn\">Visit website</a></p>" : "" %>
			</div>
			
			<div class="span2">
				<%= marker.image != '' ? "<img src=\"" + marker.image + "\" class=\"thumbnail\" style=\"margin-bottom:10px\" alt=\"Picture of " + (marker.isDepartment ? marker.buildingName : marker.name) + "\" />" : "" %>

				<%= marker.phone != '' ? "<p><strong>Ph:</strong> " + marker.phone + "</p>" : "" %>			
				
				<address><%= marker.isDepartment ? marker.buildingName + "<br/>" : "" %><%= marker.address %><br/>Millersville, PA 17551</address>
				
				<p><a href="<%= marker.directionsUrl %>" target="_blank" class="btn">Get directions</a></p>
			</div>
		</div>
	</div>
</script>

<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
<script src="lib/js/underscore.1.3.1-min.js"></script>
<script src="lib/js/backbone.0.5.3-min.js"></script>

<script src="//maps.google.com/maps/api/js?sensor=true" type="text/javascript"></script>
<script src="lib/js/app.js?v=1.5"></script>

<script src="lib/js/jquery.joyride.1.0.2-min.js"></script> 
<script src="lib/js/bootstrap.modal.min.js"></script> 
<script type="text/javascript">
	$(document).load(function() {
		$(this).joyride({
			'cookieMonster': true,
			'cookieName': 'mucampusmaptour',
			'cookieDomain': false
		});		
	}).ready(function(){
		window.App = new AppView;
		
		App.resizeUI();
		$(window).resize(App.resizeUI);
	});
</script>

<script type="text/javascript">
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-123021-2']);
  _gaq.push(['_setDomainName', 'millersville.edu']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
</script>

</body>
</html>