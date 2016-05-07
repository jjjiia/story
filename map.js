$(function() {
	queue()
	//	.defer(d3.json,msas)
	//	.defer(d3.json,tracts)
        .defer(d3.json,diversityScores)
        .defer(d3.csv,msaData)
        .defer(d3.csv,tractData)
        .defer(d3.json, msaTractDictionary)
        .defer(d3.json, msaTopo)
        .defer(d3.json, tractTopo)
		.await(dataDidLoad);
})
var width = Math.max(660, window.innerWidth)
var height = Math.max(400, window.innerHeight)

var globals = {
    "center":[-88,42.3],
    "scale":12000
}
// invisible map of polygons
var polyCanvas = d3.select("#map")
	.append("canvas")
	.attr("width",width)
	.attr("height",height)
	.style("display","none");

// using this div to crop the map; it has messy edges
var container = d3.select("#map")
	.append("div")
	.style({
		"position": "relative",
		"width": (width) + "px",
		"height": (height) + "px",
//		"overflow": "hidden"
	});

// canvas for dot map
var dotCanvas = container
	.append("canvas")
	.attr("width",width)
	.attr("height",height)
	.style({
		"position": "fixed",
        "z-index":0,
		"top": "0px",
		"left": "0px"
	});
var polyContext = polyCanvas.node().getContext("2d"),
	dotContext = dotCanvas.node().getContext("2d");
var races = ["white","hispanic","black","asian","other"]

function dataDidLoad(error,diversityScores,msaData,tractData,msaTractDictionary,msaTopo,tractTopo) {
   // var msaById = formatMsaDataById(msaData)

   
    var colors = {
      "white":"#5C83D9",
      "black":"#7DD694",
      "hispanic":"#DF9B3A",
      "asian":"#DF4C30",
      "other":"#B468D2"
    }
    
    
    
    
    var msaTopoFeatures = topojson.feature(msaTopo, msaTopo.objects["cbsa"]).features
    var msaTopoFeaturesById = reformatFeaturesById(msaTopoFeatures)
    var chicagoData = formatMsaDataById(msaData)["16980"]
    //filter chicag
    var chicagoTopo = [msaTopoFeaturesById["16980"]]
////    var chicagoData = msaById["16980"]
    var chicagoTracts = msaTractDictionary["16980"].tracts
    var boundingBox = findBoundingBox(chicagoTopo)
    var centerLat = (boundingBox.max[1]+boundingBox.min[1])/2
    var centerLng = (boundingBox.max[0]+boundingBox.min[0])/2
    globals.center = [centerLng,centerLat]
    var latDistance = boundingBox.max[1]-boundingBox.min[1]
    globals.scale = globals.scale*latDistance

    console.log(latDistance)
    
    var projection = d3.geo.mercator().scale(globals.scale).center(globals.center).translate([width / 2, height / 2]);
    var path = d3.geo.path().projection(projection);
    
    
    var tractTopoFeatures = topojson.feature(tractTopo,tractTopo.objects["alltracts"]).features
    var tractTopoFeaturesById =  formatTractTopoById(tractTopoFeatures)
      
     var tractsFeatures = []
    for(var t in chicagoTracts){
        var tract = chicagoTracts[t]
        tractsFeatures.push(tractTopoFeaturesById[tract])
    }
    var tractByRace = formatTractDataByRace(tractData)
    
   //console.log(tractsFeatures)
    for(var r in races){
        var race = races[r]
        drawTracts(tractsFeatures,tractByRace[race],colors[race])   
    }
    
  //  drawTracts(tractsFeatures,tractByRace["white"],colors["white"])   
  //  drawTracts(tractsFeatures,tractByRace["black"],colors["black"])   
  //  drawTracts(tractsFeatures,tractByRace["hispanic"],colors["hispanic"])   
  //  drawTracts(tractsFeatures,tractByRace["asian"],colors["asian"])   
  //  drawTracts(tractsFeatures,tractByRace["other"],colors["other"])   
}
function findBoundingBox(poly){
    console.log(poly)
    var coordinates = poly[0]["geometry"]["coordinates"][0]
    var maxLat = 0
    var minLat = 90
    var maxLng = -180
    var minLng = 0
    //cycle through coordinates
    for(var i in coordinates){
        var coordinate = coordinates[i]
        var lat = coordinate[1]
        var lng = coordinate[0]
        if(lat > maxLat){maxLat = lat}
        if(lat < minLat){minLat = lat}
        if(lng > maxLng){maxLng = lng}
        if(lng < minLng){minLng = lng}
    }
    //sort
    var lngs = [minLng, maxLng].sort()
    var lats = [minLat,maxLat].sort()
    //format
    boundingBox = {"min":[lngs[0],lats[0]],"max":[lngs[1],lats[1]]}
    return boundingBox
}

function drawTracts(features,tractsData,color){
    var projection = d3.geo.mercator().scale(globals.scale).center(globals.center).translate([width / 2, height / 2]);
    var path = d3.geo.path().projection(projection);
    var i=features.length;
    while(i--){
    		var r = parseInt(i / 256),
    			g = i % 256;
    		drawPolygon( features[i], polyContext, "rgb(" + r + "," + g + ",0)" );
    	};
    var imageData = polyContext.getImageData(0,0,width,height);
    var colorRgb = hexToRgb(color)
    var cr = colorRgb.r
    var cg = colorRgb.g
    var cb = colorRgb.b
   // drawDots(features[0],imageData,r,g,population,color)

    i=features.length;
    	while(i--){
            var tract =features[i].properties.AFFGEOID
            //console.log(tractsData[tract])
    		var pop = tractsData[tract]/20;	// one dot = 2 people
    		if ( !pop ) continue;

    		var bounds = path.bounds(features[i]),
    			x0 = bounds[0][0],
    			y0 = bounds[0][1],
    			w = bounds[1][0] - x0,
    			h = bounds[1][1] - y0,
    			hits = 0,
    			count = 0,
    			limit = pop*10,	// limit tests just in case of infinite loops
    			x,
    			y,
    			r = parseInt(i / 256),
    			g = i % 256;

    		// test random points within feature bounding box
    		while( hits < pop-1 && count < limit ){	// we're done when we either have enough dots or have tried too many times
    			x = parseInt(x0 + Math.random()*w);
    			y = parseInt(y0 + Math.random()*h);

    			// use pixel color to determine if point is within polygon. draw the dot if so.
    			if ( testPixelColor(imageData,x,y,width,r,g) ){
    				drawPixel(x,y,cr,cg,cb,255);	// #09c, vintage @indiemaps
    				hits++;
    			}
    			count ++;
    		}
    	}
}

function drawCity(cityTopo,cityData,imageData,r,g){
    console.log("draw dots")
    drawDots(cityTopo,imageData,r,g,cityData["white"],colors["white"])
    drawDots(cityTopo,imageData,r,g,cityData["black"],colors["black"])
    drawDots(cityTopo,imageData,r,g,cityData["hispanic"],colors["hispanic"])
    drawDots(cityTopo,imageData,r,g,cityData["asian"],colors["asian"])
    drawDots(cityTopo,imageData,r,g,cityData["other"],colors["other"])
 //  var races = ["white","hispanic","black","asian","other"]
  //  for(var r in races){
  //      var race = races[r]
  //      console.log(race)
  //      console.log(cityData[race])
  //      console.log(colors[race])
  //      drawDots(cityTopo,imageData,r,g,cityData[race],colors["other"])
  //  }
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function testPixelColor(imageData,x,y,w,r,g){
	var index = (x + y * w) * 4;
	return imageData.data[index + 0] == r && imageData.data[index + 1] == g;
}

function drawPolygon(feature, context, fill ){
    var projection = d3.geo.mercator().scale(globals.scale).center(globals.center).translate([width / 2, height / 2]);
    
	var coordinates = feature.geometry.coordinates;
	context.fillStyle = fill || "#000";
	context.beginPath();
	coordinates.forEach( function(ring){
		ring.forEach( function(coord, i){
			var projected = projection( coord );
			if (i == 0) {
                context.moveTo(projected[0], projected[1]);
            } else {
                context.lineTo(projected[0], projected[1]);
            }
		});
	});
	context.closePath();
	context.fill();
}

function drawPixel (x, y, r, g, b, a) {
	dotContext.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
	dotContext.fillRect( x, y, .5,1 );
}
function drawDots(features,imageData,r,g,population,color){
	// now draw dots
	i=features.length;
	while(i--){
//		var pop = features[i].properties.POP10;	// one dot = 2 people
	  var pop = population/5
  	if ( !pop ) continue;
		var bounds = path.bounds(features[i]),
			x0 = bounds[0][0],
			y0 = bounds[0][1],
			w = bounds[1][0] - x0,
			h = bounds[1][1] - y0,
			hits = 0,
			count = 0,
			limit = pop*10,	// limit tests just in case of infinite loops
			x,
			y
	//		r = parseInt(i / 256),
	//		g = i % 256;

		// test random points within feature bounding box
		while( hits < pop-1 && count < limit ){	// we're done when we either have enough dots or have tried too many times
			x = parseInt(x0 + Math.random()*w);
			y = parseInt(y0 + Math.random()*h);

			// use pixel color to determine if point is within polygon. draw the dot if so.
			if ( testPixelColor(imageData,x,y,width,r,g) ){
        //var color = colors[parseInt(Math.random()*19)]
        var colorrgb = hexToRgb(color)
				drawPixel(x,y,colorrgb.r,colorrgb.g,colorrgb.b,255);	// #09c, vintage @indiemaps
				hits++;
			}
			count ++;
		}
	}
}
function reformatFeaturesById(features){
  var reformated = {}
  for(var f in features){
    var geoid = features[f]["properties"]["GEOID"]
    reformated[geoid]=features[f]
  }
  return reformated
}
function formatMsaDataById(msaData){
    var dictionary = {}
    for(var i in msaData){
        var geoid = msaData[i].Id2
        dictionary[geoid]=msaData[i]
    }
    return dictionary
}
function formatTractDataByRace(tractData){
    var dictionary = {}
    for(var r in races){
        var race = races[r]
        dictionary[race]={}
        for(var i in tractData){
            var geoid = tractData[i].Id
            var raceData = parseInt(tractData[i][race])
            dictionary[race][geoid]=raceData
        }
    }
    return dictionary
}
function formatMsaGeoById(features){
    var reformated = {}
    for(var f in features["features"]){
      var geoid = features["features"][f]["properties"]["GEOID"]
      reformated[geoid]=features["features"][f]
    }
    return reformated
}
function formatMsaTopoById(features){
      var reformated = {}
      for(var f in features){
        var geoid = features[f]["properties"]["GEOID"]
        reformated[geoid]=features[f]
      }
      return reformated
}
function formatTractTopoById(features){
    var reformated = {}
    for(var f in features){
      var geoid = features[f]["properties"]["AFFGEOID"]
      reformated[geoid]=features[f]
    }
    return reformated
}