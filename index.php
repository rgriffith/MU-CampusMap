<!DOCTYPE HTML>
<html>
<head>
<title>Backbone Campus Map</title>
<link rel="stylesheet" href="css/main.css?v=1" />

</head>

<body>

<div id="header">
	<a href="#" id="millersville-logo"><img src="http://www.millersville.edu/lib/v2/img/common/millersvilleCircleM-32.png" alt="Millersville University Home" /></a>
	<h1 id="the-title">Campus Map</h1>
	<form action="http://www.millersville.edu/searchresults.php" id="search-mu" method="get" name="search">
		<fieldset> 
			<input id="search-mu-keyword" name="query" type="text" value="Search web &amp; directory"/> 
			<input alt="Search" id="search-mu-submit" name="search" src="http://www.millersville.edu/lib/v2/img/common/magnifyer.png" type="image"/> 						
		</fieldset>
	</form>
</div>

<div id="campusmap-ui">
	
	<div id="map-canvas"></div> 
	
	<div id="panel-wrapper">
		<div id="options-nav-bar">				
			<a title="Close this sidebar" id="map-options-toggler" href="#">Close</a>
			<a title="Show the Search Map tab" id="tablink-search" href="#kwsearch" class="tab-button left selected">Search</a>
			<a title="Show the Building List tab" id="tablink-buildings" href="#bldgsearch" class="tab-button mid">Building List</a>			
			<a title="Show the Map Options tab" id="tablink-mapoptions" href="#map-overlays" class="tab-button right">Overlays</a>
		</div>	
		
		<div id="features-panel">
			
			<div id="features-panel-content">
			
				<div id="map-search" class="tabs-content">
					<form action="" id="marker-search" method="get">
						<fieldset id="kwsearch">
							<input id="kwsearch-keyword" name="query" type="text" placeholder="Search Campus Map"/> 
							<input id="kwsearch-submit" name="search" type="submit" value="Search" />
							<span class="kwsearch-clear" title="Clear the current search">Clear Search</span>		
						</fieldset>
						<fieldset id="bldgsearch"> 
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
			
			<div id="footer">
				<p id="afs"><a href="http://www.millersville.edu">Millersville University</a>. All Rights Reserved.<br />A member of the Pennsylvania State System of Higher Education. &copy; <?=date('Y');?></p>
			</div>
			</div>
		</div>
	</div>
</div>

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


<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
<script src="js/underscore.1.3.1-min.js"></script>
<script src="js/backbone.0.5.3-min.js"></script> 

<script src="//maps.google.com/maps/api/js?sensor=true" type="text/javascript"></script>
<script src="js/main.js"></script> 

</body>
</html>