var coords  =  { "lat":"", "lng":"" }; 
var jsdata = {};
var rsort=0, dsort=0, nsort=0;


function resetForm()
{
	/* Clear Form. */
/*	if(document.getElementById("auto").checked){
		document.getElementById("location").disabled = false;
		document.getElementById("auto").checked = false;
	}
*/	document.getElementById("keyword").value = "";
	document.getElementById("distance").value = "";
	document.getElementById("category").value = "default";
	document.getElementById("location").value = "0";
	
	/* Clear Result area. */
	document.getElementById("results").innerHTML = "";
}

function showResults(list)
{
	/* Render Row 0 */
	var html= list;
	document.getElementById("results").innerHTML = html;

}

function submitForm(query)
{
	var backend = "/" + query;
	var req = new XMLHttpRequest();
	
	/* Request to Google Maps Geocoding API to convert user entered address
	 * to location coordinates.
	 */
	req.open("GET", backend, false);
	req.onreadystatechange = function(){
		if(this.readyState == 4 && (this.status == 200 || this.status == 304)){
			//document.write(this.responseText);
			jsdata = this.responseText;	
					
		}
		else{
			alert("Error: XMLHttpRequest to Node.js backend failed!\nStatus: " + 
			       this.status);
		}
	}
	req.send();
}

function processForm()
{
//	var auto = document.getElementById("auto");
	var keyword = document.getElementById("keyword");
	var distance = document.getElementById("distance");
	var category = document.getElementById("category");
	var location = document.getElementById("location");
	
	/* Get location coordinates. */
/*	
	if(auto.checked)
		autoLocateCoords();//FIXME 
	else
		addressToCoords(location.value.replace(/\s/g,"+"));
	
	// Form Validation 
	if(!coords) {
		alert("Location not found. Please enter a valid location."); // TODO Prompt not found in result area.
		return;
	}
*/	if(distance.value != "patient"){
		if(distance.value != "auditor"){
		alert("Please enter a valid role.");
		return;
		}
	}

	
	/* Send form info to backend. */
	var query = "userid/" + keyword.value +  "/action/" + 
		     category.value + "/role/" + distance.value + "/recid/" + location.value;
	
	submitForm(query);
	var list = jsdata;
	showResults(list);
	
	//resetForm();
}
