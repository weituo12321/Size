// Dimensions of sunburst.
var width = 550;
var height = 550;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {
  "home": "#5687d1",
  "product": "#7b615c",
  "search": "#de783b",
  "account": "#6ab975",
  "other": "#a173d1",
  "end": "#bbbbbb"
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// Use d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.

//var text = getText();
//var csv = d3.csv.parseRows(text);
//var json = buildHierarchy(csv);
//var json = getData();
var json = getData1();
createVisualization(json);

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { return colors[d.name]; })
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = getAncestors(d);
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .transition()
      .duration(1000)
      .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return colors[d.name]; });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
 	var foundChild = false;
 	for (var k = 0; k < children.length; k++) {
 	  if (children[k]["name"] == nodeName) {
 	    childNode = children[k];
 	    foundChild = true;
 	    break;
 	  }
 	}
  // If we don't already have a child node for this branch, create it.
 	if (!foundChild) {
 	  childNode = {"name": nodeName, "children": []};
 	  children.push(childNode);
 	}
 	currentNode = childNode;
      } else {
 	// Reached the end of the sequence; create a leaf node.
 	childNode = {"name": nodeName, "size": size};
 	children.push(childNode);
      }
    }
  }
  return root;
};

function getData() {
    return {
 "name": "ref",
 "children": [
  {
   "name": "june11",
   "children": [
    {
     "name": "atts",
         "children": [
          {"name": "early", "size": 11},
          {"name": "jcp", "size": 40},
          {"name": "jcpaft", "size": 50},
          {"name": "stillon", "size": 195},
          {"name": "jo",

             "children": [
              {"name": "early",  "size": 100},
              {"name": "jcp", "size": 67},
              {"name": "jcpaft", "size": 110},
                 {"name": "stillon", "size": 154},

               {"name": "sus1",      
                "children": [
                  {"name": "early",  "size": 11},
                    {"name": "jcp", "size": 118},
                  {"name": "jcpaft", "size": 39},
                      {"name": "stillon", "size": 2779}
                  ]
                },

               {"name": "sus5",
                 "children": [
                  {"name": "early",  "size": 0},
                  {"name": "jcp", "size": 64},
                  {"name": "jcpaft", "size": 410},
                     {"name": "stillon", "size": 82}
                  ]
                },

               {"name": "sus9",
                 "children": [
                  {"name": "early",  "size": 1018},
                  {"name": "jcp", "size": 3458},
                  {"name": "jcpaft", "size": 106},
                     {"name": "stillon", "size": 243}
                  ]
                },

               {"name": "sus13",
                 "children": [
                  {"name": "early",  "size": 110},
                  {"name": "jcp", "size": 190},
                  {"name": "jcpaft", "size": 80},
                     {"name": "stillon", "size": 9190},
                     {"name": "allsus", "size": 3970}
                     ]
                    }

                 ]
              }
         ]
        },

      {"name": "noatt", "size": 30}
    ]
    }

 ]
};
};

function getData1() {
 return 
     
{
    "num_files": 3, 
    "size": 12, 
    "name": "test", 
    "children": [
        {
            "num_files": 1, 
            "size": 3, 
            "name": "tt1", 
            "children": []
        }, 
        {
            "num_files": 2, 
            "size": 9, 
            "name": "tt2", 
            "children": [
                {
                    "num_files": 0, 
                    "size": 0, 
                    "name": "t33", 
                    "children": []
                }, 
                {
                    "num_files": 1, 
                    "size": 4, 
                    "name": "t44", 
                    "children": []
                }
            ]
        }
    ]
};

};
function getText() {
    return "account-account-account-account-account-account,22781"+"\n"+
    "account-account-account-account-account-end,3311"+"\n"+
    "account-account-account-account-account-home,906"+"\n"+
    "account-account-account-account-account-other,1156"+"\n"+
    "account-account-account-account-account-product,5969"+"\n"+
    "account-account-account-account-account-search,692"+"\n"+
    "account-account-account-account-end,7059"+"\n"+
    "account-account-account-account-home-account,396"+"\n"+
    "account-account-account-account-home-end,316"+"\n"+
    "account-account-account-account-home-home,226"+"\n"+
    "account-account-account-account-home-other,87"+"\n"+
    "account-account-account-account-home-product,613"+"\n"+
    "account-account-account-account-home-search,245"+"\n"+
    "account-account-account-account-other-account,446"+"\n"+
    "account-account-account-account-other-end,229"+"\n"+
    "account-account-account-account-other-home,91"+"\n"+
    "account-account-account-account-other-other,804"+"\n"+
    "account-account-account-account-other-product,776"+"\n"+
    "account-account-account-account-other-search,48"+"\n"+
    "account-account-account-account-product-account,3892"+"\n"+
    "account-account-account-account-product-end,3250"+"\n"+
    "account-account-account-account-product-home,531"+"\n"+
    "account-account-account-account-product-other,252"+"\n"+
    "account-account-account-account-product-product,4876"+"\n"+
    "account-account-account-account-product-search,476"+"\n"+
    "account-account-account-account-search-account,521"+"\n"+
    "account-account-account-account-search-end,39"+"\n"+
    "account-account-account-account-search-home,7"+"\n"+
    "account-account-account-account-search-other,8"+"\n"+
    "account-account-account-account-search-product,536"+"\n"+
    "account-account-account-account-search-search,219"+"\n"+
    "account-account-account-end,14262"+"\n"+
    "account-account-account-home-account-account,434"+"\n"+
    "account-account-account-home-account-end,83"+"\n"+
    "account-account-account-home-account-home,71"+"\n"+
    "account-account-account-home-account-other,39"+"\n"+
    "account-account-account-home-account-product,159"+"\n"+
    "account-account-account-home-account-search,24"+"\n"+
    "account-account-account-home-end,722"+"\n"+
    "account-account-account-home-home-account,103"+"\n"+
    "account-account-account-home-home-end,64"+"\n"+
    "account-account-account-home-home-home,76"+"\n"+
    "account-account-account-home-home-other,57"+"\n"+
    "account-account-account-home-home-product,116"+"\n"+
    "account-account-account-home-home-search,47"+"\n"+
    "account-account-account-home-other-account,32"+"\n"+
    "account-account-account-home-other-end,13"+"\n"+
    "account-account-account-home-other-home,21"+"\n"+
    "account-account-account-home-other-other,93"+"\n"+
    "account-account-account-home-other-product,33"+"\n"+
    "account-account-account-home-other-search,6"+"\n"+
    "account-account-account-home-product-account,252"+"\n"+
    "account-account-account-home-product-end,304"+"\n"+
    "account-account-account-home-product-home,258"+"\n"+
    "account-account-account-home-product-other,25"+"\n"+
    "account-account-account-home-product-product,573"+"\n"+
    "account-account-account-home-product-search,69"+"\n"+
    "account-account-account-home-search-account,119"+"\n"+
    "account-account-account-home-search-end,20"+"\n"+
    "account-account-account-home-search-home,13"+"\n"+
    "account-account-account-home-search-other,1"+"\n"+
    "account-account-account-home-search-product,276"+"\n"+
    "account-account-account-home-search-search,103"+"\n"+
    "account-account-account-other-account-account,486"+"\n"+
    "account-account-account-other-account-end,99"+"\n"+
    "account-account-account-other-account-home,28"+"\n"+
    "account-account-account-other-account-other,130"+"\n"+
    "account-account-account-other-account-product,172"+"\n"+
    "account-account-account-other-account-search,31"+"\n"+
    "account-account-account-other-end,636"+"\n"+
    "account-account-account-other-home-account,33"+"\n"+
    "account-account-account-other-home-end,42"+"\n"+
    "account-account-account-other-home-home,23"+"\n"+
    "account-account-account-other-home-other,15"+"\n"+
    "account-account-account-other-home-product,61"+"\n"+
    "account-account-account-other-home-search,20"+"\n"+
    "account-account-account-other-other-account,312"+"\n"+
    "account-account-account-other-other-end,239"+"\n"+
    "account-account-account-other-other-home,92"+"\n"+
    "account-account-account-other-other-other,741"+"\n"+
    "account-account-account-other-other-product,488"+"\n"+
    "account-account-account-other-other-search,48"+"\n"+
    "account-account-account-other-product-account,315"+"\n"+
    "account-account-account-other-product-end,881"+"\n"+
    "account-account-account-other-product-home,84"+"\n"+
    "account-account-account-other-product-other,190"+"\n"+
    "account-account-account-other-product-product,1400"+"\n"+
    "account-account-account-other-product-search,77"+"\n"+
    "account-account-account-other-search-account,25"+"\n"+
    "account-account-account-other-search-end,5"+"\n"+
    "account-account-account-other-search-other,1"+"\n"+
    "account-account-account-other-search-product,39"+"\n"+
    "account-account-account-other-search-search,22"+"\n"+
    "account-account-account-product-account-account,3948"+"\n"+
    "account-account-account-product-account-end,721"+"\n"+
    "account-account-account-product-account-home,154"+"\n"+
    "account-account-account-product-account-other,201"+"\n"+
    "account-account-account-product-account-product,2369"+"\n"+
    "account-account-account-product-account-search,189"+"\n"+
    "account-account-account-product-end,7344"+"\n"+
    "account-account-account-product-home-account,198"+"\n"+
    "account-account-account-product-home-end,239"+"\n"+
    "account-account-account-product-home-home,122"+"\n"+
    "account-account-account-product-home-other,52"+"\n"+
    "account-account-account-product-home-product,526"+"\n"+
    "account-account-account-product-home-search,175"+"\n"+
    "account-account-account-product-other-account,120"+"\n"+
    "account-account-account-product-other-end,74"+"\n"+
    "account-account-account-product-other-home,23"+"\n"+
    "account-account-account-product-other-other,226"+"\n"+
    "account-account-account-product-other-product,189"+"\n"+
    "account-account-account-product-other-search,13"+"\n"+
    "account-account-account-product-product-account,1863"+"\n"+
    "account-account-account-product-product-end,2561"+"\n"+
    "account-account-account-product-product-home,395"+"\n"+
    "account-account-account-product-product-other,160"+"\n"+
    "account-account-account-product-product-product,5934"+"\n"+
    "account-account-account-product-product-search,407"+"\n"+
    "account-account-account-product-search-account,281"+"\n"+
    "account-account-account-product-search-end,37"+"\n"+
    "account-account-account-product-search-home,5"+"\n"+
    "account-account-account-product-search-other,3"+"\n"+
    "account-account-account-product-search-product,594"+"\n"+
    "account-account-account-product-search-search,191"+"\n"+
    "account-account-account-search-account-account,567"+"\n"+
    "account-account-account-search-account-end,69"+"\n"+
    "account-account-account-search-account-home,26"+"\n"+
    "account-account-account-search-account-other,25"+"\n"+
    "account-account-account-search-account-product,253"+"\n"+
    "account-account-account-search-account-search,78"+"\n"+
    "account-account-account-search-end,120"+"\n"+
    "account-account-account-search-home-account,2"+"\n"+
    "account-account-account-search-home-end,4"+"\n"+
    "account-account-account-search-home-home,3"+"\n"+
    "account-account-account-search-home-product,14"+"\n"+
    "account-account-account-search-home-search,4"+"\n"+
    "account-account-account-search-other-account,2"+"\n"+
    "account-account-account-search-other-end,3"+"\n"+
    "account-account-account-search-other-home,4"+"\n"+
    "account-account-account-search-other-other,6"+"\n"+
    "account-account-account-search-other-product,7"+"\n"+
    "account-account-account-search-product-account,189"+"\n"+
    "account-account-account-search-product-end,257"+"\n"+
    "account-account-account-search-product-home,33"+"\n"+
    "account-account-account-search-product-other,12"+"\n"+
    "account-account-account-search-product-product,550"+"\n"+
    "account-account-account-search-product-search,192"+"\n"+
    "account-account-account-search-search-account,113"+"\n"+
    "account-account-account-search-search-end,27"+"\n"+
    "account-account-account-search-search-home,9"+"\n"+
    "account-account-account-search-search-other,7"+"\n"+
    "account-account-account-search-search-product,208"+"\n"+
    "account-account-account-search-search-search,121"+"\n"+
    "account-account-end,49154";
}
