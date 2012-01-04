<?php
/*
	if(empty($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest') {
		die('Direct access to this script is forbidden');
	}
*/
	$search = isset($_GET['q']) ? $_GET['q'] : '';
	$page = (isset($_GET['page']) || $_GET['page'] < 0) ? $_GET['page'] : 1;
	$s = isset($_GET['s']) ? $_GET['s'] : 6;
	
	$markers = json_decode(file_get_contents('markercache.json'));
	
	$markerData = array();
	if (!empty($search)) {
		foreach ($markers as $m) {
			$foundBuilding = false;
			$departmentMatches = array();		
			
			$keywords = explode(' ', $search);
			
			// Are there departments?
			// Of so, we need to record them so we can search.
			$mDepartments = array();
			if (@$m->departments && count($m->departments) > 0) {						
				foreach ($m->departments as $k => $d) {
					$mDepartments[] = $d->name;
				}
			}
					
			// Make sure we're not looking at a callbox or parking lot...
			if (preg_match('/lot|athletics/i', @$m->category) 
				|| preg_match('/call box/i', @$m->name)
				) {
				continue;
			}
					
			// Test the name and addrsss for the entire phrase.
			if (stripos($m->name, $search) !== false || stripos(@$m->address, $search) !== false || stripos(@$m->id, $search) !== false) {				
				$foundBuilding = true;
			}
			
			// Look for any department names that contain the phrase.
			$departmentMatches = preg_grep('/'.$search.'/i', $mDepartments);
			
			// If we have keywords, then loop over them.
			if (count($keywords) > 1) {		
				// Loop over the keyword(s).
				// If we find a match, record it and break the loop.
				foreach ($keywords as $v) {
					// Does the marker's name or address contain the keyword?
					if (stripos($m->name, $v) !== false || stripos($m->address, $v) !== false || stripos($m->id, $v) !== false) {				
						$foundBuilding = true;
					}
					
					// Does one of the marker's departments contain the keyword?
					$departmentMatches = array_merge($departmentMatches, preg_grep('/'.$v.'/i', $mDepartments));
				}
			}
			
			// If we found a match, record it to the results array and increment the results count.
			if ($foundBuilding || count($departmentMatches) > 0) {
				$marker = array(
					'id' => $m->id,
					'name' => $m->name,
					'lat' => $m->lat,
					'lng' => $m->lng,
					'address' => $m->address,
					'category' => ($m->category ? $m->category : '')
				);	
				
				// Append the new marker.
				$markerData[$marker['name']] = $marker;
			}
		}		
		
		if (count($markerData) > 0) {
			// Sort the results alphabetically by their key.
			ksort($markerData);
			
			// The "alphabetical" keys are only needed to sort,
			// the following will reset them to numbers.
			$markerData = array_values($markerData);
			
			// Slice the array for pagination.
			//$markerData = array_slice($markerData, (($page-1)*$s), $s, true);
		}
	}
		
	// Output the JSON.
	echo json_encode($markerData);
	die();
?>