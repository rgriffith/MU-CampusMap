<?php
	if (!$markerData = @file_get_contents('../data/json/mu_campusmap_locations.json')) {
		echo $markerData;
		die();
	} else {
		$markers = simplexml_load_file('http://www.millersville.edu/directions/data/markers.xml');

		$markerData = $buildings = array();
		if (!empty($markers->marker)) {
			$currentId = 1;
			foreach ($markers->marker as $m) {	
				// Are there departments?
				// Of so, we need to record them as a marker as well.
				$mDepartments = array();
				if (@$m->departments && count($m->departments) > 0) {		
					// If the departments object is not an array, there is only one listed.
					// For convenience, turn it into an array.
					if (!is_array($m->departments)) {
						$m->departments = array($m->departments);
					}
					
					foreach ($m->departments->department as $k => $d) {
						$name = (string)$d->name;

						if (!$name) { continue; }	
						
						$department = array(
							'name' => $name,
							'url' => '',
							'keywords' => (string)$d->keywords,
							'phone' => (string)$d->phone
						);
						
						$url = (string)$d->url;							
						if ($url != '' && $url != 'http://') {
							// Make sure the URL has a leading http:// on it.
							$department['url'] = sprintf('%s%s', (!strpos($url, 'http://') ? 'http://' : ''), $url);
						}
						
						$mDepartments[$department['name']] = $department;
					}
				}
						
				// Make sure we're not looking at a callbox or parking lot...
				if (preg_match('/lot/i', @$m->{'system-data-structure'}->marker->cat)) {
					continue;
				}
				
				$marker = array(
					'id' => $currentId,
					'systemid' => (string)$m->attributes()->systemid,
					'name' => (string)$m->name,
					'buildingName' => (string)$m->name,
					'lat' => (float)$m->lat,
					'lng' => (float)$m->lng,
					'address' => !empty($m->address) ? (string)$m->address : '&nbsp;',
					'description' => (string)$m->description,
					'category' => ((string)$m->category ? (string)$m->category : ''),
					'departments' => $mDepartments,
					'image' => !empty($m->image) ? 'http://www.millersville.edu/directions'.(string)$m->image : '',
					'directionsUrl' => (string)$m->directionsUrl,
					'isDepartment' => false,
					'website' => '',
					'phone' => (string)$m->phone,
					'keywords' => (string)$m->keywords
				);	
								
				// Append the new marker.
				$markerData[$marker['name']] = $marker;
				$currentId++;
				
				// If there were matched departments, clone the original marker (i.e. building)
				// and loop through each found marker, updating only the name.
				if (count($mDepartments) > 0) {
					$tempMarker = $markerData[$marker['name']];
					foreach ($mDepartments as $k => $department) {
						$tempMarker['id'] = $currentId;
						$tempMarker['systemid'] = '';
						$tempMarker['name'] = $department['name'];						
						$tempMarker['departments'] = array();
						$tempMarker['description'] = $department['description'];
						$tempMarker['isDepartment'] = true;
						$tempMarker['website'] = $department['url'];	
						$tempMarker['phone'] = $department['phone'];
						$tempMarker['keywords'] = $department['keywords'];						
						
						$markerData[$tempMarker['name']] = $tempMarker;
						$currentId++;
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
		file_put_contents('../data/json/mu_campusmap_locations.json', $json);				
		//echo $markerJSON;

		unset($json);
		
		die();
	}
?>