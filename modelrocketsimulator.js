var g   = 9.8; // [m/s²]

// Atmosphere
var p0 = 101325;    // Pa
var L  = -0.0065;    // K/m
var T0 = 288.15;    // K
var M  = 0.0289644; // kg/mol
var R  = 8.31447;   // J/(mol·K)

var freq = 100;
var dt   = 1/freq;

var enginesData = {};
enginesData["A8"]  = [[0,0],[0.041,0.512],[0.084,2.115],[0.127,4.358],[0.166,6.794],[0.192,8.588],[0.206,9.294],[0.226,9.73],[0.236,8.845],[0.247,7.179],[0.261,5.063],[0.277,3.717],[0.306,3.205],[0.351,2.884],[0.405,2.499],[0.467,2.371],[0.532,2.307],[0.589,2.371],[0.632,2.371],[0.652,2.243],[0.668,1.794],[0.684,1.153],[0.703,0.448],[0.73,0]];
enginesData["B6"]  = [[0,0],[0.023,0.688],[0.057,2.457],[0.089,4.816],[0.116,7.274],[0.148,9.929],[0.171,12.14],[0.191,11.695],[0.2,10.719],[0.209,9.24],[0.23,7.667],[0.255,6.488],[0.305,5.505],[0.375,4.816],[0.477,4.62],[0.58,4.62],[0.671,4.521],[0.746,4.226],[0.786,4.325],[0.802,3.145],[0.825,1.572],[0.86,0]];
enginesData["C6"]  = [[0,0],[0.031,0.946],[0.092,4.826],[0.139,9.936],[0.192,14.09],[0.209,11.446],[0.231,7.381],[0.248,6.151],[0.292,5.489],[0.37,4.921],[0.475,4.448],[0.671,4.258],[0.702,4.542],[0.723,4.164],[0.85,4.448],[1.063,4.353],[1.211,4.353],[1.242,4.069],[1.303,4.258],[1.468,4.353],[1.656,4.448],[1.821,4.448],[1.834,2.933],[1.847,1.325],[1.86,0]];
enginesData["D12"] = [[0,0],[0.049,2.569],[0.116,9.369],[0.184,17.275],[0.237,24.258],[0.282,29.73],[0.297,27.01],[0.311,22.589],[0.322,17.99],[0.348,14.126],[0.386,12.099],[0.442,10.808],[0.546,9.876],[0.718,9.306],[0.879,9.105],[1.066,8.901],[1.257,8.698],[1.436,8.31],[1.59,8.294],[1.612,4.613],[1.65,0]];
enginesData["C2"]  = [[0,0],[0.297,2],[0.477,5],[0.702,2],[4.8,2],[5.1,0]];
enginesData["D3"]  = [[0,0],[0.305,5],[0.589,9],[0.702,6],[1.063,2,5],[1.86,2],[5.6,2],[6,0]];
enginesData["TEST1"]  = [[0,0],[0.1,0.95],[0.2,1.8],[0.3,2.55],[0.4,3.2],[0.5,3.75],[0.6,4.2],[0.7,4.55],[0.8,4.8],[0.9,4.95],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[18,5],[19,5],[19.1,4.95],[19.2,4.8],[19.3,4.55],[19.4,4.2],[19.5,3.75],[19.6,3.2],[19.7,2.55],[19.8,1.8],[19.9,0.95],[20,0]];

var enginesSpecs = {};
// Mass of propellant - Mass before firing - Mass after firing
enginesSpecs["A8"]   = [ .0033 , .01635 , .0102 ];
enginesSpecs["B6"]   = [ .0056 , .01823 , .0097 ];
enginesSpecs["C6"]   = [ .0108 , .02400 , .0094 ];
enginesSpecs["D12"]  = [ .0211 , .04260 , .0160 ]; 	
enginesSpecs["C2"]   = [ .0108 , .02400 , .0094 ]; // Unknown - copied directly from Estes C6
enginesSpecs["D3"]   = [ .0108 , .02400 , .0094 ]; // Unknown - copied directly from Estes C6
enginesSpecs["TEST1"]= [ .0814 , .46252 , .3811 ];

var cd1 = 0.65;	// Drag coefficient of rocket. Value is DARK legacy.
var cd2 = 0.75; // Drag coefficient of parachute. Value is from http://www.rocketshoppe.com/info/The_Mathematics_of_Parachutes.pdf

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

function gid(id)
{
	return document.getElementById(id);
}

function init()
{
	 $('#waiting').hide();
	 $("div.engine.selected input").show();
	 chart(enginesData["A8"], "#thrustcurve", "Thrust Curve", "Time / [s]", "Thrust / [N]",0);
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
	var engine      = gid('engine').value;
	var engineData  = enginesData[engine.split("-")[0]];
	var engineSpecs = enginesSpecs[engine.split("-")[0]];
	var m           = parseFloat(gid("m").value)/1000;
	m               = m + engineSpecs[1];
	var engineY = [];
	for(var n in engineData)
	{
		engineY[n] = engineData[n][1];
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

function getEngineDiameter(engine)
{
	if( engine.substr(0,1) == "D" )
	{
		return(0.024);
	}
	else
	{
		return(0.018);
	}
}

function diametercheck()
{
	var engineDiam  = getEngineDiameter( gid('engine').value );
	var diam        = parseFloat(gid("d").value)/1000;
	if( diam < engineDiam )
	{
		gid("status2").innerHTML = "The rocket diameter must at least match the diameter of the selected engine (" + engineDiam*1000 + " mm).";
		$("#status2").slideDown();
		$('html, body').animate({scrollTop: $("#step1").offset().top}, 2000);
	}
	else
	{
		$("#status2").slideUp();
	}
}

function selectEngine(engine,obj)
{
	chart(enginesData[engine.split('-')[0]], '#thrustcurve', 'Thrust Curve', 'Time / [s]', 'Thrust / [N]',0);
	gid("engine").value = engine;
	$("div.engine.selected").removeClass("selected");
	$(obj).addClass("selected");
	heavycheck();
	diametercheck();
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
	setTimeout(function(){launch();},1); // Strange function which forces the execution of commands issued until now, and then starts execution of the function inside the settimeout.
}

function launch()
{
	gid("launchbutton").blur();
	gid("ignition").innerHTML         = "";
	gid("liftoff").innerHTML          = "";
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
	
	// Read entered values for mass and diameters
	var m  = parseFloat(gid("m").value)/1000;
	var d  = parseFloat(gid("d").value)/1000;
	var d2 = parseFloat(gid("d2").value)/100;
	var cd = cd1;

	// Get engine data
	var engine          = gid('engine').value;
	var engineData      = enginesData[engine.split("-")[0]];
	var engineSpecs     = enginesSpecs[engine.split("-")[0]];
	var delay           = parseFloat(engine.split("-")[1]);
	var numberOfEngines = parseFloat(gid("noe").value);

	// Make engine x and y value arrays for splines
	var engineX = [];
	var engineY = [];
	var ks      = [];
	for(var n in engineData)
	{
		engineX[n] = engineData[n][0];
		engineY[n] = engineData[n][1];
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
	
	if( delay > 0 )
	{
		mDelay     = engineSpecs[1]-engineSpecs[2]-engineSpecs[0];	// Mass of delay charge, ejection charge and clay cap
		mDelay     = mDelay/2;										// Assuming ejection charge and cap together weighs about the same as the delay charge
		mDelay     = mDelay * numberOfEngines;
		dmDelay    = dt/delay*mDelay;
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
	var PropMass = engineSpecs[0]*numberOfEngines;
	var TotalImp = ThrustSum*dt
	var SpeciImp = TotalImp/(PropMass*g)

	m       = m + engineSpecs[1]*numberOfEngines;
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
	var T2      = [];

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

		//if( t < Burntime && !Thrust[i].isNaN )
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

		// ATMOSPHERE

		var T    = T0 + L*h;
		var p    = p0*Math.pow( 1-L*h/T0 , g*M/(R*L) );
		var rho  = p*M/(R*T);
		
		var q    = 0.5 * rho * Math.pow(v,2); // Dynamic Pressure https://en.wikipedia.org/wiki/Max_Q
		var drag = - q * cd * A * sign(v);
		
		if( isNaN(drag) )
		{
			done = true;
			alert("drag isNaN in step "+i);
		}

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

		if( ( delay != 0 ) && t >= ( Burntime + delay ) && !deploy )
		{
			deploy = true;
			cd = cd2;
			A  = A2;
			m  = m - mDelay;
			//dt = 0.001; // Temporarily switching to millisecond precision for large parachutes
			gid("deploy_time").innerHTML     = t.toFixed(2);
			gid("deploy_altitude").innerHTML = h.toFixed(2);
			gid("deploy_velocity").innerHTML = v.toFixed(2);
			$(".deploy").show();
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
		//T2[i]      = T;

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
    chart(transpose([t2,h2]),"#altitude","Altitude","Time / [s]","Altitude / [m]",0)
	chart(transpose([t2,v2]),"#velocity","Velocity","Time / [s]","Velocity / [m/s]",null)
	chart(transpose([t2,a2]),"#acceleration","Acceleration","Time / [s]","Acceleration / [m/s²]",null)
	chart(transpose([t2,gees2]),"#gees","G-force","Time / [s]","G")
	chart(transpose([t2,m2]),"#mass","Mass","Time / [s]","Mass / [kg]")
	//chart(transpose([t2,F2]),"#force","Force","Time / [s]","Force / [N]")
	chart(transpose([t2,drag2]),"#drag","Drag","Time / [s]","Drag / [N]")
	//chart(transpose([t2,weight2]),"#weight","Weight","Time / [s]","Weight / [N]")
	chart(transpose([t2,thrust2]),"#thrust","Thrust","Time / [s]","Thrust / [N]",0,Burntime)
	//chart(transpose([t2,ks]),"#ks","ks","Time / [s]","ks",0,Burntime)
	//for(var n in t2)
	//{
	//	document.writeln(t2[n]+" "+h2[n]+"<br>");
	//}
	//chart(transpose([t2,T2]),"#temp","Temperature","Time / [s]","Temperature / [K]")
	//document.write(t2);
	hideSpinner();
	$("#container").css({"opacity":1});
	$("#output").slideDown();
	$('html, body').animate({scrollTop: $("#results").offset().top}, 2000);
}
