var g   = 9.8; // [m/s²]
var rho = 1.2; // [kg/m³]

var freq = 100;
var dt   = 1/freq;

var cd1 = 0.65;	// Drag coefficient of rocket. Value is DARK legacy.
var cd2 = 0.75; // Drag coefficient of parachute. Value is from http://www.rocketshoppe.com/info/The_Mathematics_of_Parachutes.pdf

var rodl = 1; // Length of launch rod in meters

var opts = {
	lines: 13, // The number of lines to draw
	length: 20, // The length of each line
	width: 10, // The line thickness
	radius: 30, // The radius of the inner circle
	corners: 1, // Corner roundness (0..1)
	rotate: 0, // The rotation offset
	direction: 1, // 1: clockwise, -1: counterclockwise
	color: '#000', // #rgb or #rrggbb or array of colors
	speed: 1, // Rounds per second
	trail: 60, // Afterglow percentage
	shadow: false, // Whether to render a shadow
	hwaccel: false, // Whether to use hardware acceleration
	className: 'spinner', // The CSS class to assign to the spinner
	zIndex: 2e9, // The z-index (defaults to 2000000000)
	top: '50%', // Top position relative to parent
	left: '50%' // Left position relative to parent
};

var target = document.getElementById('container');
var spinner = new Spinner(opts);

var engineData = "";
var engine = {};

// Because of an error in the definition of the eng file format, and/or because of wrong use,
// I choose here to include extra data not in the eng files.
// I assume, that propellant mass in the eng file is just that, the mass of the propellant,
// thus not including mass of delay charge, ejection charge or clay cap.
// Therefore, I must here include also Mass After Firing - from data sheets.

var massAfterFiring = [];
massAfterFiring["Estes_A8"]  = 0.0102;
massAfterFiring["Estes_B6"]  = 0.0097;
massAfterFiring["Estes_C6"]  = 0.0094;
massAfterFiring["Estes_D12"] = 0.0160;
massAfterFiring["Klima_A6"]  = 0.0100; // Unknown - using estimated mass
massAfterFiring["Klima_B4"]  = 0.0100; // Unknown - using estimated mass
massAfterFiring["Klima_C2"]  = 0.0100; // Unknown - using estimated mass
massAfterFiring["Klima_D2"]  = 0.0100; // Unknown - using estimated mass

function gid(id)
{
	return document.getElementById(id);
}

function loadEngine(engineFormValue) {
	var filename = engineFormValue.split("-")[0];
	var delay    = engineFormValue.split("-")[1];
	var xmlhttp;
	if (window.XMLHttpRequest) {
		xmlhttp = new XMLHttpRequest();
	} else {
		// code for older browsers
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			readEngine(this.responseText,filename,delay);
		}
	};
	xmlhttp.open("GET", filename+".eng", true);
	xmlhttp.send();
}

function init()
{
	$('#waiting').hide();
	selectEngine("Estes_A8-3");
}

function readEngine(responseText,filename,delay) {
	engineData = responseText.split("\r\n"); // Splitting the file into lines
	var engineSpecsRead = false;
	var engineThrust = [];
	engineThrust.push([0,0]);
	for(var i in engineData) // Looping through the lines
	{
		if( engineData[i].substr(0,1) != ";" ) {
			// This line is not a comment
			var engineLineArray = engineData[i].trim().split(" ");
			if( !engineSpecsRead ) // First line - engine specs
			{
				// Engine specs haven't been read yet, so we're doing it now
				// See format on http://www.thrustcurve.org/raspformat.shtml
				var engineSpecs = engineLineArray;
				engineSpecsRead = true;
			} else {
				// Engine specs have been read, so this must be thrust data
				if( engineLineArray.length == 2 ) {
					engineThrust.push( [ parseFloat(engineLineArray[0]) , parseFloat(engineLineArray[1]) ] );
				}
			}
		}
	}
	
	engine.delay            = parseFloat(delay);
	engine.delays           = engineSpecs[3].split("-");
	engine.diameter         = parseFloat(engineSpecs[1]);
	engine.length           = parseFloat(engineSpecs[2]);
	engine.manufacturer     = engineSpecs[6];
	engine.massAfterFiring  = massAfterFiring[filename];
	engine.name             = engineSpecs[0];
	engine.propellantWeight = parseFloat(engineSpecs[4]);
	engine.thrust           = engineThrust;
	engine.totalWeight      = parseFloat(engineSpecs[5]);

	console.debug(engine);

	chart(engine.thrust,"#thrustcurve","Thrust Curve","Time / [s]","Thrust / [N]",0);
	
	heavycheck();
	diametercheck();
}

function selectEngine(engineFormValue)
{
	loadEngine(engineFormValue);
}

function sign(x)
{
	if(isNaN(x)) {
		return NaN;
	} else if(x === 0) {
		return x;
	} else {
		return (x > 0 ? 1 : -1);
	}
}

function heavycheck()
{
	var m = parseFloat(gid("m").value)/1000 + engine.totalWeight;
	var engineY = [];
	for(var n in engine.thrust)
	{
		engineY[n] = engine.thrust[n][1];
	}
	var maxThrust = parseFloat(Math.max.apply(Math, engineY));
	if( maxThrust <= m*g )
	{
		gid("status1").innerHTML = "The rocket is too heavy for the selected engine.";
		$("#status1").slideDown();
		$('html, body').animate({scrollTop: $("#step1").offset().top}, 2000);
	}
	else
	{
		$("#status1").slideUp();
	}
}

function diametercheck()
{
	var diam            = parseFloat(gid("d").value);
	var checkDiam       = engine.diameter;
	var numberOfEngines = parseFloat(gid("noe").value);
	switch( numberOfEngines ) {
		case 1:
			checkDiam = engine.diameter;
			break;
		case 2:
			checkDiam = engine.diameter * 2;
			break;
		case 3:
		case 4:
		case 5:
			checkDiam = engine.diameter * ( 1 + 1 / Math.sin((360/numberOfEngines)/180*3.14159265) );
			break;
		case 6:
			checkDiam = engine.diameter * 3;
			break;
		case 7:
			checkDiam = engine.diameter * 3;
			break;
		default:
			checkDiam = engine.diameter;
	}
	if( diam < checkDiam )
	{
		if( numberOfEngines == 1 )
		{
			gid("status2").innerHTML = "The rocket diameter must at least match the diameter of the selected engine (" + engine.diameter + " mm).";
		}
		else
		{
			gid("status2").innerHTML = "The rocket diameter must at least match the "+numberOfEngines+" engines arranged in a symmetrical<br/>pattern (" + checkDiam.toFixed(2) + " mm).";
		}
		$("#status2").slideDown();
		$('html, body').animate({scrollTop: $("#step1").offset().top}, 2000);
	}
	else
	{
		$("#status2").slideUp();
	}
}

function transpose(array)
{
	var newArray = array[0].map(function(col, i) { 
	  return array.map(function(row) { 
	    return row[i] 
	  })
	});
	return newArray;
}

function chart(chartdata,id,charttitle,xaxistitle,yaxistitle,yfloor,xceiling)
{
	$(function () {
	    $(id).highcharts({
	        chart: {
	            type: 'spline'
	        },
		        title: {
	            text: charttitle
	        },
	        xAxis: {
	            type: 'spline',
	            title: {
	            	text: xaxistitle
	            },
	            floor: 0,
	            ceiling: xceiling,
	            gridLineWidth: 1
	        },
	        yAxis: {
	        	type: 'spline',
	        	title: {
	        		text: yaxistitle
	        	},
	        	floor: yfloor
	        },
	        legend: {
	        	enabled: false
	        },
	        series: [{
	            data: chartdata,
	            turboThreshold: 6000
	        }]
	    });
	});
}

function showSpinner()
{
	spinner.spin(gid("container"));
}

function hideSpinner()
{
	spinner.stop();
}

function start()
{
	$("#container").css({"opacity":.5});
	showSpinner();
	setTimeout(function(){launch();},1);
	// Strange function which forces the execution of commands issued until now,
	// and then starts execution of the function inside the settimeout.
}

function launch()
{
	gid("launchbutton").blur();
	gid("ignition").innerHTML         = "";
	gid("liftoff").innerHTML          = "";
	gid("rodt").innerHTML             = "";
	gid("rodv").innerHTML             = "";
	gid("burnout_time").innerHTML     = "";
	gid("burnout_altitude").innerHTML = "";
	gid("burnout_velocity").innerHTML = "";
	gid("apogee_time").innerHTML      = "";
	gid("apogee_altitude").innerHTML  = "";
	gid("deploy_time").innerHTML      = "";
	gid("deploy_altitude").innerHTML  = "";
	gid("deploy_velocity").innerHTML  = "";
	gid("landing_time").innerHTML     = "";
	gid("landing_velocity").innerHTML = "";
	
	gid("deploy_time_warning").innerHTML       = "";
	gid("rod_velocity_warning").innerHTML      = "";
	gid("acceleration_warning").innerHTML      = "";
	gid("deploy_velocity_warning").innerHTML   = "";
	gid("landing_velocity_warning").innerHTML  = "";
	
	// Read entered values for mass and diameters
	var m  = parseFloat(gid("m").value)/1000;
	var d  = parseFloat(gid("d").value)/1000;
	var d2 = parseFloat(gid("d2").value)/100;
	var cd = cd1;

	var numberOfEngines = parseFloat(gid("noe").value);

	// Make engine x and y value arrays for splines
	var engineX = [];
	var engineY = [];
	var ks      = [];
	for(var n in engine.thrust)
	{
		engineX[n] = engine.thrust[n][0];
		engineY[n] = engine.thrust[n][1];
		ks[n]      = 0; // Use zeros as first derivatives for the CSPL implementation http://blog.ivank.net/interpolation-with-cubic-splines.html
						// - until Ivan answers my question about how to find the "real" derivatives...
	}
	var Burntime = parseFloat(Math.max.apply(Math, engineX));
	var Thrust = [];
	// Call the ks generator function to generate the "natural" derivatives for the spline interpolation function
	CSPL.getNaturalKs(engineX, engineY, ks);
	// Make an array of thrust with increments of dt for the simulatino.
	for(var i = 0 ; i < Burntime/dt ; i++ )
	{
		Thrust[i] = CSPL.evalSpline(i*dt, engineX, engineY, ks);
	}
	
	if( engine.delay > 0 )
	{
		mDelay     = engine.totalWeight-engine.propellantWeight-engine.massAfterFiring;	// Mass of delay charge, ejection charge and clay cap
		mDelay     = mDelay/2;															// Assuming ejection charge and cap together weighs about the same as the delay charge
		mDelay     = mDelay * numberOfEngines;
		dmDelay    = dt/engine.delay*mDelay;
	}
	else
	{
		mDelay = 0;
		dmDelay = 0;
		$(".deploy").hide();
	}

	// Reset output section
	$("#deploy").insertAfter("#apogee");

	// Calculate total and specific impulses
	var ThrustSum = 0;
	for(var n in Thrust)
	{
		ThrustSum += Thrust[n]*numberOfEngines;
	}
	var PropMass = engine.propellantWeight*numberOfEngines;
	var TotalImp = ThrustSum*dt
	var SpeciImp = TotalImp/(PropMass*g)

	m       = m + engine.totalWeight*numberOfEngines;
	var A   = Math.PI*Math.pow(d /2,2);
	var A2  = Math.PI*Math.pow(d2/2,2);

	var i = 0;
	var t = 0;
	var h = 0;
	var v = parseFloat(0);
	var a = 0;
	var I = 0;

	var done      = false;
	var ignition  = false;
	var liftoff   = false;
	var rod       = false;
	var burnout   = false;
	var apogee    = false;
	var deploy    = false;
	var landing   = false;
	var tooheavy  = false;

	var t2      = [];
	var thrust2 = [];
	var drag2   = [];
	var F2      = [];
	var a2      = [];
	var v2      = [];
	var h2      = [];
	var m2      = [];
	var q2      = [];
	var gees2   = [];
	var weight2 = [];

	var t3      = [];
	var thrust3 = [];
	var drag3   = [];
	var F3      = [];
	var a3      = [];
	var v3      = [];
	var h3      = [];
	var m3      = [];
	var q3      = [];
	var gees3   = [];

	var runtime = 300; // Max number of seconds before stop
	
	while(!done)
	{

		if( t < Burntime && i < Thrust.length )
		{
			thrust = Thrust[i]*numberOfEngines;
			var TotalImpulseSoFar = thrust * dt;
		}
		else
		{
			thrust = 0;
		}
		if( isNaN(thrust) )
		{
			done = true;
			alert("thrust isNaN in step "+i);
		}

		var drag   = -0.5 * rho * cd * A * Math.pow(v,2) * sign(v);
		if( isNaN(drag) )
		{
			done = true;
			alert("drag isNaN in step "+i);
		}

		// Dynamic Pressure https://en.wikipedia.org/wiki/Max_Q
		var q = 0.5 * rho * Math.pow(v,2);
		
		if( ignition && !burnout )
		{
			var dm = PropMass * TotalImpulseSoFar / TotalImp;
			var m  = m - dm;
		}

		if( burnout && !deploy )
		{
			m  = m - dmDelay;
		}

		var weight = -m*g;
	
		if( isNaN(weight) )
		{
			done = true;
			alert("weight isNaN in step "+i);
		}

		var F = thrust + drag + weight;
		
		if( isNaN(F) )
		{
			done = true;
			alert("F isNaN in step "+i);
		}

		var a    = F/m;

		if( !liftoff && a<0 )
		{
			a = 0;
		}

		if( isNaN(a) )
		{
			done = true;
			alert("a isNaN in step "+i);
		}

		var gees = Math.abs(a/g+1);
		
		var dv = a * dt;
		var v  = v + dv;
		if( isNaN(v) )
		{
			done = true;
			alert("v isNaN in step "+i);
		}

		var dh = v * dt;
		var h  = h + dh;
		if( isNaN(h) )
		{
			done = true;
			alert("h isNaN in step "+i);
		}

		if( h < 0 )
		{
			h=0;
		}

		if( !ignition && thrust > 0 )
		{
			ignition = true;
			gid("ignition").innerHTML = t;
		}

		if( !liftoff && h > 0 )
		{
			liftoff = true;
			gid("liftoff").innerHTML = t.toFixed(2);
		}

		if( !rod && h > rodl )
		{
			rod = true;
			gid("rodt").innerHTML = t.toFixed(2);
			gid("rodv").innerHTML = v.toFixed(2);
			if( v < 10 ) {
				console.log(v);
				gid("rod_velocity_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> Low rod velocity";
			}
		}

		if( ignition && !burnout && ( thrust == 0 ) )
		{
			burnout = true;
			gid("burnout_time").innerHTML     = t.toFixed(2);
			gid("burnout_altitude").innerHTML = h.toFixed(2);
			gid("burnout_velocity").innerHTML = v.toFixed(2);
			gid("burnout_totalimp").innerHTML = TotalImp.toFixed(2);
			gid("burnout_speciimp").innerHTML = SpeciImp.toFixed(2);
			gid("burnout_exhauvel").innerHTML = (SpeciImp*g).toFixed(2);
 			gid("ticlass").innerHTML = " ("+ String.fromCharCode( 65 + Math.log(TotalImp)/Math.log(2) - Math.log(1.25)/Math.log(2) )+"-class)";
 			if( h == 0 )
			{
				done = true; // Rocket did not leave the pad
				gid("status3").innerHTML += "The rocket did not leave the launchpad";
				$("#status3").fadeIn();
			}
		}

		if( !apogee && liftoff && v<0 )
		{
			apogee = true;
			gid("apogee_time").innerHTML     = t.toFixed(2);
			gid("apogee_altitude").innerHTML = h.toFixed(2);
		}

		if( ( engine.delay != 0 ) && t >= ( Burntime + engine.delay ) && !deploy )
		{
			deploy = true;
			cd = cd2;
			A  = Math.max(A,A2);
			m  = m - mDelay;
			//dt = 0.001; // Temporarily switching to millisecond precision for large parachutes
			gid("deploy_time").innerHTML     = t.toFixed(2);
			gid("deploy_altitude").innerHTML = h.toFixed(2);
			gid("deploy_velocity").innerHTML = v.toFixed(2);
			$(".deploy").show();
			if( !apogee ) {
				gid("deploy_time_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> Deployment before apogee";
			}
			if( Math.abs(v) > 10 ) {
				gid("deploy_velocity_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> High deployment velocity";
			}
		}

		//if( deploy && v2[i-1] == v ) // Terminal velocity reached
		//{
		//	dt = 1/freq; // Switching back to original time resolution
		//}

		if( liftoff && ( h == 0 ) )
		{
			landing = true;
			gid("landing_time").innerHTML     = t.toFixed(2);
			gid("landing_velocity").innerHTML = v.toFixed(2);
		}

		if( landing || ( t >= runtime ) )
		{
			done = true;
			if( t>=runtime )
			{
				gid("status3").innerHTML = "Landing not detected within preset runtime - stopping";
				$("#status3").fadeIn();
			}
			if( v < -10 ) {
				gid("landing_velocity_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> High landing velocity";
			}
			if( !deploy ) {
				gid("deploy_time_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> Deployment after landing";
			}
			if( engine.delay == 0 ) {
				gid("deploy_time_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> No deployment charge";	
			}
		}

		if( deploy && !apogee ) // Deployment happened before apogee - move deploy section before apogee section
		{
			$("#deploy").insertBefore("#apogee");
		}

		t2[i]      = t;
		thrust2[i] = thrust;
		drag2[i]   = drag;
		F2[i]      = F;
		a2[i]      = a;
		v2[i]      = v;
		h2[i]      = h;
		m2[i]      = m;
		q2[i]      = q;
		gees2[i]   = gees;
		m2[i]      = m;
		weight2[i] = weight;

		// WHAT IS THIS? Why did I write this?
		if(parseFloat(i/10)==parseInt(i/10,10))
		{
			t3[i/10]      = t;
			thrust3[i/10] = thrust;
			drag3[i/10]   = drag;
			F3[i/10]      = F;
			a3[i/10]      = a;
			v3[i/10]      = v;
			h3[i/10]      = h;
			m3[i/10]      = m;
			q3[i/10]      = q;
			gees3[i/10]   = gees;
		}

		i++;
		t = i/freq;

	}
	for(var n in t3)
	{
		t3[n] = parseFloat(t3[n]).toFixed(2);
	}

	var maxgees               = Math.max(...gees2).toFixed(1);
	gid("max_gees").innerHTML = maxgees;
	if( maxgees > 20 )
	{
		gid("acceleration_warning").innerHTML = "<span style=\"color:#EE0000;font-weight:bold;\">⚠</span> High G-load";	
	}


    chart(transpose([t2,h2]),"#altitude","Altitude","Time / [s]","Altitude / [m]",0)
	chart(transpose([t2,v2]),"#velocity","Velocity","Time / [s]","Velocity / [m/s]",null)
	chart(transpose([t2,a2]),"#acceleration","Acceleration","Time / [s]","Acceleration / [m/s²]",null)
	chart(transpose([t2,gees2]),"#gees","G-force","Time / [s]","G")
	chart(transpose([t2,m2]),"#mass","Mass","Time / [s]","Mass / [kg]")
	chart(transpose([t2,drag2]),"#drag","Drag","Time / [s]","Drag / [N]")
	chart(transpose([t2,thrust2]),"#thrust","Thrust","Time / [s]","Thrust / [N]",0,Burntime)
	hideSpinner();
	$("#container").css({"opacity":1});
	$("#output").slideDown();
	$('html, body').animate({scrollTop: $("#results").offset().top}, 2000);

}
