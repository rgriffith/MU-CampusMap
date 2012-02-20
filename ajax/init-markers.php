<?php
/*
	if(empty($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest') {
		die('Direct access to this script is forbidden');
	}
*/
	if ($markerData = @file_get_contents('markercache.json')) {
		echo $markerData;
		die();
	} else {
		$markers = json_decode(file_get_contents('http://www.millersville.edu/lib/inc/utility/jsonservice/?url=http://www.millersville.edu/directions/markers.xml&path=//system-page'));
		
		$markerData = $buildings = array();
		if (!empty($markers)) {
			foreach ($markers->query->results->{'system-page'} as $m) {	
				// Are there departments?
				// Of so, we need to record them as a marker as well.
				$mDepartments = array();
				if (@$m->{'system-data-structure'}->marker->departments && count($m->{'system-data-structure'}->marker->departments) > 0) {		
					// If the departments object is not an array, there is only one listed.
					// For convenience, turn it into an array.
					if (!is_array($m->{'system-data-structure'}->marker->departments)) {
						$m->{'system-data-structure'}->marker->departments = array($m->{'system-data-structure'}->marker->departments);
					}
					
					foreach ($m->{'system-data-structure'}->marker->departments as $k => $d) {
						if (!$d->name) { continue; }	
						
						$department = array(
							'name' => $d->name,
							'url' => ''
						);
														
						if ($d->{'link-page'}->path != '/') {
							$department['url'] = str_replace('/millersville', 'http://www.millersville.edu', $d->{'link-page'}->path);
						} else if ($d->{'link-url'} != '' && $d->{'link-url'} != 'http://') {
							// Make sure the URL has a leading http:// on it.
							if (strpos($d->{'link-url'}, 'http://')) {
								$department['url'] = $d->{'link-url'};
							} else {
								$department['url'] = 'http://'.$d->{'link-url'};
							}
						}
						
						$mDepartments[$department['name']] = $department;
					}
				}
						
				// Make sure we're not looking at a callbox or parking lot...
				if (preg_match('/lot|athletics/i', @$m->{'system-data-structure'}->marker->cat) 
					|| preg_match('/call box/i', $m->{'system-data-structure'}->marker->name)
					) {
					continue;
				}
				
				$marker = array(
					'id' => count($markerData),
					'name' => $m->{'system-data-structure'}->marker->name,
					'lat' => $m->{'system-data-structure'}->marker->lat,
					'lng' => $m->{'system-data-structure'}->marker->lng,
					'address' => $m->{'system-data-structure'}->marker->address,
					'description' => $m->{'system-data-structure'}->marker->description,
					'category' => ($m->{'system-data-structure'}->marker->cat ? $m->{'system-data-structure'}->marker->cat : ''),
					'departments' => $mDepartments,
					'image' => '',
					'infoWindow' => array(
						'directionsUrl' => 'http://maps.google.com/maps?f=d&amp;source=s_d&amp;daddr='.$m->{'system-data-structure'}->marker->lat.','.$m->{'system-data-structure'}->marker->lng.'&amp;hl=en',
						'shareUrl' => '',
						'content' => ''
					)
				);	
				
				if (empty($marker['address'])) {
					$marker['address'] = '&nbsp';
				}
				
				// Is there a photo?
				// If so, replace the internal Cascade path with the real URL.
				if ($m->{'system-data-structure'}->marker->image && $m->{'system-data-structure'}->marker->image->path != '/') {
					$marker['image'] = str_replace('/millersville', 'http://www.millersville.edu', $m->{'system-data-structure'}->marker->image->path);
				}
				
				$marker['infoWindow']['shareUrl'] = 'http://166.66.47.86/campusmap/#locations/'.$marker['id'];
				
				$marker['infoWindow']['content'] = '<div style="font-family: Arial,sans-serif; font-size: small; height:auto;width:380px;">
					<div style="font-weight: bold; font-size: medium; margin-bottom: 0em;">'.$marker['name'].'</div>
					<div><div style="overflow: hidden;">
						<img src="'.$marker['image'].'" align="right" alt="Picture of '.$marker['name'].'" />
						<p>'.$marker['address'].'<br/>Millersville, PA 17551</p>
						<p><a href="'.$marker['infoWindow']['directionsUrl'].'" target="_blank">Get directions</a> | <a href="'.$marker['infoWindow']['shareUrl'].'" target="_blank">Share</a></p>
					</div></div></div>';
				
				// Append the new marker.
				$markerData[$marker['name']] = $marker;
				
				// Record the building info for later use.
				$buildings[$marker['name']] = array(
					'id' => $marker['id'],
					'name' => $marker['name'],
					'category' => $marker['category']
				);
				
				// If there were matched departments, clone the original marker (i.e. building)
				// and loop through each found marker, updating only the name.
				if (count($mDepartments) > 0) {
					$tempMarker = $markerData[$marker['name']];
					foreach ($mDepartments as $k => $department) {
						$tempMarker['id'] = count($markerData);
						$tempMarker['name'] = $department['name'];
						$tempMarker['address'] = $marker['name'].'<br/>'.$marker['address'];
						$tempMarker['infoWindow']['shareUrl'] = 'http://166.66.47.86/campusmap/#locations/'.$tempMarker['id'];
						$tempMarker['infoWindow']['content'] = '<div style="font-family: Arial,sans-serif; font-size: small; height:auto;width:380px;">
							<div style="font-weight: bold; font-size: medium; margin-bottom: 0em;">'.$department['name'].'</div>
							<div><div style="overflow: hidden;">
								<img src="'.$marker['image'].'" align="right" alt="Picture of '.$marker['name'].'" />
								<p>'.$marker['name'].'<br/>'.$marker['address'].'<br/>Millersville, PA 17551</p>
								<p><a href="'.$marker['infoWindow']['directionsUrl'].'" target="_blank">Get directions</a> | <a href="'.$tempMarker['infoWindow']['shareUrl'].'" target="_blank">Share</a>';
						
						if (!empty($department['url'])) {
							$tempMarker['infoWindow']['content'] .= ' | <a href="'.$department['url'].'" target="_blank">Visit website</a>';
						}
						
						$tempMarker['infoWindow']['content'] .= '</p>
						</div></div></div>';
						
						unset($tempMarker['departments']);
						$tempMarker['description'] = '';
						
						$markerData[$tempMarker['name']] = $tempMarker;
					}
				}
			}		
		}
		
		ksort($markerData);
		
		// The "alphabetical" keys are only needed to sort,
		// the following will reset them to numbers.
		$markerData = array_values($markerData);
		
		// Encode, write and output the marker JSON.
		$json = json_encode($markerData);		
		file_put_contents('markercache.json', $json);				
		//echo $markerJSON;
		
		// Encode, write and output the building JSON.
		$json = json_encode($buildings);		
		file_put_contents('buildingcache.json', $json);				
		//echo $markerJSON;

		unset($json);
		
		die();
	}
?>