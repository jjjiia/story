$(function() {
	queue()
	//	.defer(d3.json,msas)
	//	.defer(d3.json,tracts)
        .defer(d3.json,diversityScores)
        .defer(d3.csv,msaData)
        .defer(d3.csv,tractData)
    .defer(d3.csv,msaGeolocation)
        .defer(d3.json, msaTractDictionary)
        .defer(d3.json, msaTopo)
        .defer(d3.json, tractTopo)
    .defer(d3.json,msaCentroids)
		.await(dataDidLoad);
})
var width = Math.max(660, window.innerWidth)
var height = Math.max(400, window.innerHeight)
var globals = {
    "center":[-87.96198062423504,41.7027346781305],
    "scale":20000,
    "populationFactor":100
}
var races = ["white","hispanic","black","asian","other"]
// invisible map of polygons
var colors = {"white":"#5C83D9","black":"#ACDE71","hispanic":"#DF9B3A","asian":"#DF4C30","other":"#B468D2"}

function dataDidLoad(error,diversityScores,msaData,tractData,msaGeolocation,msaTractDictionary,msaTopo,tractTopo,msaCentroids) {
    drawKey(races,colors)
    
    //format all data
    var msaTopoFeatures = topojson.feature(msaTopo, msaTopo.objects["cbsa"]).features
    var msaTopoFeaturesById = reformatFeaturesById(msaTopoFeatures)
    var tractTopoFeatures = topojson.feature(tractTopo,tractTopo.objects["alltracts"]).features
    var tractTopoFeaturesById =  formatTractTopoById(tractTopoFeatures)
    var centroidsById = formatCentroidsById(msaCentroids)
        var chicago = "16980"
    

    d3.select("#chicagoTract").style("cursor","pointer").on("click",function(){
       drawAll(centroidsById[chicago].centroid,20000,tractTopoFeaturesById,msaTractDictionary,tractData,colors,"16980")
     })
     d3.select("#miamiTract").style("cursor","pointer").on("click",function(){
       drawAll(centroidsById["33100"].centroid,20000,tractTopoFeaturesById,msaTractDictionary,tractData,colors,"33100")
     })
     d3.select("#nycTract").style("cursor","pointer").on("click",function(){
       drawAll(centroidsById["35620"].centroid,20000,tractTopoFeaturesById,msaTractDictionary,tractData,colors,"35620")
     })
     
     d3.select("#chicagoMsa").style("cursor","pointer").on("click",function(){
       // drawAll([-87.672450,41.831858],20000,tractTopoFeaturesById,msaTractDictionary,tractData,colors,"16980")
         var contexts = setContexts()
        var polyContext =contexts[0] 
        var dotContext = contexts[1]
         var msaCode = "16980"
         //drawTracts([msaTopoFeaturesById["35620"]],msaData,"#aadd00",polyContext,dotContext,20000,[-87.672450,41.831858])
     
         var r = 255
         var g = 200
         drawPolygon(msaTopoFeaturesById[msaCode], polyContext, "rgb(" + r + "," + g + ",0)" ); 
     	var imageData = polyContext.getImageData(0,0,width,height);
        var center = centroidsById[chicago].centroid
        var scale = 20000
        globals.center = center
        globals.scale = scale
        var projection = d3.geo.mercator().scale(scale).center(center).translate([width / 2, height / 2]);
        drawMsa(msaData,msaCode,msaTopoFeaturesById,imageData,r,g,dotContext,projection)
      })
}
function drawMsa(msaData,msaCode,msaTopoFeaturesById,imageData,r,g,dotContext,projection){
    var path = d3.geo.path().projection(projection);
    
    var racePopulationAll = formatTractDataByRace(msaData)
    for(var i in races){
        var race = races[i]
        population=racePopulationAll[race]["310M200US"+msaCode]
        drawDots([msaTopoFeaturesById[msaCode]],imageData,r,g,population,colors[race],path,dotContext)
    }
}

function drawDots(features,imageData,r,g,population,color,path,dotContext){
	// now draw dots
	i=features.length;
	while(i--){
//		var pop = features[i].properties.POP10;	// one dot = 2 people
	  var pop = population/globals.populationFactor
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
				drawPixel(x,y,colorrgb.r,colorrgb.g,colorrgb.b,255,dotContext);	// #09c, vintage @indiemaps
				hits++;
			}
			count ++;
		}
	}
}

function drawAll(center,scale,tractTopoFeaturesById,msaTractDictionary,tractData,colors,cityCode){
    var polyContext = setContexts()[0] 
    var dotContext = setContexts()[1]
    globals.center = center
    globals.scale = scale
    var projection = d3.geo.mercator().scale(globals.scale).center(globals.center).translate([width / 2, height / 2]);
    var path = d3.geo.path().projection(projection);
    var cityTracts = msaTractDictionary[cityCode].tracts

    
    drawRacesTracts(tractTopoFeaturesById,cityTracts,tractData,colors,polyContext,dotContext)
}
function setContexts(){
    d3.selectAll("#map div").remove()
    d3.selectAll("#map canvas").remove()
    
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
 
 return [polyContext,dotContext]
}


function drawKey(races,colors){
    var svg  = d3.select("#key").append("svg").attr("width",100).attr("height",100)
    svg.selectAll("rect")
    .data(races)
    .enter()
    .append("rect")
    .attr("x",10)
    .attr("y",function(d,i){return i*20})
    .attr("width",10)
    .attr("height",10)
    .attr("fill",function(d,i){return colors[d]})
    
    svg.selectAll("text")
    .data(races)
    .enter()
    .append("text")
    .attr("x",25)
    .attr("y",function(d,i){return i*20+10})
    .attr("fill",function(d,i){return colors[d]})
    .text(function(d,i){return d})
}
function findBoundingBox(poly){
    //TODO: NOT WORKING!!!!!!!!!!!!!
    var coordinates = poly[0]["geometry"]["coordinates"][0]
    var maxLat = 0
    var minLat = 90
    var maxLng = -180
    var minLng = 0
    //cycle through coordinates
    for(var i in coordinates[0]){
        var coordinate = coordinates[0][i]
        var lat = coordinate[0]
        var lng = coordinate[1]
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

function drawRacesTracts(tractTopoFeaturesById,chicagoTracts,tractData,colors,polyContext,dotContext){
    
     var tractsFeatures = []
    for(var t in chicagoTracts){
        var tract = chicagoTracts[t]
        tractsFeatures.push(tractTopoFeaturesById[tract])
    }
    var tractByRace = formatTractDataByRace(tractData)
    
    for(var r in races){
        var race = races[r]
        drawTracts(tractsFeatures,tractByRace[race],colors[race],polyContext,dotContext)   
    }
}

function drawTracts(features,tractsData,color,polyContext,dotContext){
  // console.log(features)
    //console.log(tractsData)
    var projection = d3.geo.mercator().scale(globals.scale).center(globals.center).translate([width / 2, height / 2]);
    var path = d3.geo.path().projection(projection);
    var i=features.length;
    while(i--){
    		var r = parseInt(i / 256),
    			g = i % 256;
             //   console.log(features[i])
                if(features[i]!=undefined){
            		drawPolygon(features[i], polyContext, "rgb(" + r + "," + g + ",0)" );                    
                }
    	};
    var imageData = polyContext.getImageData(0,0,width,height);
    var colorRgb = hexToRgb(color)
    var cr = colorRgb.r
    var cg = colorRgb.g
    var cb = colorRgb.b
   // drawDots(features[0],imageData,r,g,population,color)
    i=features.length;
    	while(i--){
             if(features[i]!=undefined){
                var tract =features[i].properties.AFFGEOID
                //console.log(tractsData[tract])
        		var pop = tractsData[tract]/globals.populationFactor;	// one dot = 2 people
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
        				drawPixel(x,y,cr,cg,cb,255,dotContext);	// #09c, vintage @indiemaps
        				hits++;
        			}
        			count ++;
        		}
        	}
    }
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
  //  console.log(feature)
    
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
function drawPixel (x, y, r, g, b, a,dotContext) {
	//dotContext.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
	dotContext.fillStyle = "rgba("+r+","+g+","+b+","+.2+")";
	dotContext.fillRect( x, y, 2,2 );
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
function formatCentroidsById(msaCentroids){
    var reformated = {}
    for(var f in msaCentroids.features){
      var geoid = msaCentroids.features[f]["properties"]["GEOID"]
        reformated[geoid]={}
      reformated[geoid]["centroid"]=msaCentroids.features[f].geometry.coordinates
//      reformated[geoid]["area"]=msaCentroids.features[f].properties.area2
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