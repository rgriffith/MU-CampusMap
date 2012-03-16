<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="utf-8"/>
	<title>Campus Map - Millersville University</title>
	<meta content="campus map, directions, map, buildings, houses, dorms, housing, academic buildings, administrative buildings, shuttle, bus, routes, stops, bus stops, emergency callboxes, callboxes, lots, parking, parking lots," name="keywords"/>
	<meta content="Search or browse by building name. View building information and get directions." name="description"/>
	<link rel="stylesheet" href="css/bootstrap.css?v=1.3.2" />
</head>

<body>

<div class="navbar navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<a class="brand" href="#">Campus Map</a>
			<p class="navbar-text pull-right"><a href="http://www.millersville.edu" title="Millersville University Home"><img src="http://www.millersville.edu/lib/v2/img/common/millersvilleCircleM-32.png" alt="Millersville University Home" /></a></p>
		</div>
	</div>
</div>

<div id="campusmap-ui" class="container">
	<div id="map-canvas"></div> 
	
	<div id="panel-wrapper">
		<div id="options-nav-bar" class="btn-toolbar">
			<div class="btn-group">
				<a title="Show the Search Map tab" id="tablink-search" href="#kwsearch" class="btn active">Search</a>
				<a title="Show the Building List tab" id="tablink-buildings" href="#bldgsearch" class="btn">Buildings</a>			
				<a title="Show the Map Options tab" id="tablink-mapoptions" href="#map-overlays" class="btn">Overlays</a>
				<a title="Link to this Map" id="tablink-link" href="#link" class="btn"><i class="icon-share-alt"></i></a>
			</div>
			<a title="Close this sidebar" id="map-options-toggler" class="icon-chevron-left" href="#">Close</a>
		</div>
		
		<div id="features-panel">			
			<div id="features-panel-content">			
				<div id="map-search" class="tabs-content">
					<form action="" id="marker-search" method="get">
						<fieldset id="kwsearch" class="form-inline">
							<input id="kwsearch-keyword" name="query" type="text" placeholder="Search Campus Map"/> 
							<button id="kwsearch-submit" class="btn btn-primary" name="search" type="submit" title="Perform Search"><i class="icon-search icon-white"></i></button>
							<a href="#" title="Clear Search" class="close kwsearch-clear">&times;</a>	
						</fieldset>
						<fieldset id="bldgsearch"> 
							<?php			
							$buildings = json_decode(file_get_contents('ajax/buildingcache.json'));
							$acadBldgsHTML = $adminBldgsHTML = $dormBldgsHTML = $otherBldgsHTML = '';
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
									default:
										$otherBldgsHTML .= $optionHTML;
										break;
								}
							}							
							?>
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
									<optgroup label="Other Buildings">
										<?php echo $otherBldgsHTML; ?>
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
								<input type="checkbox" name="baseLayer" class="filter-checkbox" id="baseLayer" checked="checked" value="http://www.millersville.edu/directions/kml/mobile/marker-dump.kml" />
									All Buildings</label></li>
					
							<li><label for="academicsLayer" class="checkbox">
								<input type="checkbox" name="academicsLayer" class="filter-checkbox" id="academicsLayer" value="http://www.millersville.edu/directions/kml/mobile/academic-buildings.kml" />
									<span class="filter-icon filter-icon-academics"></span>Academic Buildings</label></li>
					
							<li><label for="administrativeLayer" class="checkbox">
								<input type="checkbox" name="administrativeLayer" class="filter-checkbox" id="administrativeLayer" value="http://www.millersville.edu/directions/kml/mobile/administrative-buildings.kml" />
									<span class="filter-icon filter-icon-administrative"></span>Administrative Buildings</label></li>
							
							<li><label for="dormLayer" class="checkbox">
								<input type="checkbox" name="dormLayer" class="filter-checkbox" id="dormLayer" value="http://www.millersville.edu/directions/kml/mobile/dorm-buildings.kml" />
									<span class="filter-icon filter-icon-housing"></span>Student Housing</label></li>
							
							<li class="filter-heading">Services</li>
							
							<li><label for="emergencycallboxesLayer" class="checkbox">
								<input type="checkbox" name="emergencycallboxesLayer" class="filter-checkbox" id="emergencycallboxesLayer" value="http://www.millersville.edu/directions/kml/mu-emergencycallboxes.kml" />
									<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/callbox.png" alt="" /></span>Emergency Callboxes
								</label></li>
							
							<li><label for="muparkingLayer" class="checkbox">
								<input type="checkbox" name="muparkingLayer" class="filter-checkbox" id="muparkingLayer" value="http://www.millersville.edu/directions/kml/mu-parkinglots.kml" />
									<span class="filter-icon service-icon"><img src="http://www.millersville.edu/directions/img/icons/parking.png" alt="" /></span>Parking Lots
								</label></li>
							
							<li class="filter-heading">Shuttle Routes</li>
							
							<li><label for="mushuttleLayer" class="checkbox">
								<input type="checkbox" name="mushuttleLayer" class="filter-checkbox" id="mushuttleLayer" value="http://www.millersville.edu/directions/kml/mu-shuttlebus.kml" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=FF69BB&chd=s:A9&chls=2" alt="" /></span>MU Campus Shuttle
								</label></li>
								
							<li><label for="route16" class="checkbox">
								<input type="checkbox" name="route16" class="filter-checkbox" id="route16" value="http://www.millersville.edu/directions/kml/route-16.kml" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=ff694e&chd=s:A9&chls=2" alt="" /></span>MU-Lancaster Route 16
								</label></li>
								
							<li><label for="parkcity" class="checkbox">
								<input type="checkbox" name="parkcity" class="filter-checkbox" id="parkcity" value="http://www.millersville.edu/directions/kml/park-city-xpress.kml" />
									<span class="filter-icon route-icon"><img src="http://chart.apis.google.com/chart?chs=12x12&cht=ls&chco=5577bb&chd=s:A9&chls=2" alt="" /></span>MU Park City Xpress
								</label></li>
						</ul>
					</fieldset>
				</div>
				<div id="link" class="tabs-content"></div>
			<div id="footer">
				<p id="afs"><a href="http://www.millersville.edu">Millersville University</a>. All Rights Reserved.<br />A member of the Pennsylvania State System of Higher Education. &copy; <?=date('Y');?></p>
			</div>
			</div>
		</div>
	</div>
</div>

<!-- Tip Content -->
<ol id="joyRideTipContent">
	<li data-id="tablink-search" data-text="Next: Buildings">
		<h2>Search by Keyword</h2>
		<p>You can search for buildings and/or departments using the keyword search tab.</p>
	</li>
	<li data-id="tablink-buildings" data-text="Next: Overlays">
		<h2>Search by Building</h2>
		<p>Not sure what to search for? Try browsing a listing of building names.</p>
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

<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
<script src="js/underscore.1.3.1-min.js"></script>
<script src="js/backbone.0.5.3-min.js"></script>

<script src="//maps.google.com/maps/api/js?sensor=true" type="text/javascript"></script>
<script src="js/app.min.js?v=1.3.2"></script>

<script src="js/jquery.joyride.1.0.2-min.js"></script> 
<script type="text/javascript">
	$(window).load(function() {
		$(this).joyride({
			'cookieMonster': true,
			'cookieName': 'mucampusmaptour',
			'cookieDomain': false
		});
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