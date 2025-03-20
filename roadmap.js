async function generateRoadmap() {
  const topic = document.getElementById('topic1').value;
  if (!topic) {
    alert("Please enter a topic.");
    return;
  }

  // Call the Cohere API to generate the roadmap (with your API key)
  const roadmapText = await fetchRoadmap(topic);

  // Parse the roadmap
  const parsedRoadmap = parseRoadmap(roadmapText);

  // Render the roadmap as a tree
  renderRoadmap(parsedRoadmap);
}

// API request to Cohere for generating the roadmap
async function fetchRoadmap(topic) {
  const apiKey = 'cohere-key';  // Replace with your Cohere API key
  const endpoint = 'https://api.cohere.ai/v1/generate';  // Cohere API endpoint

  const prompt = `
    Generate a detailed roadmap for learning the topic: "${topic}". Use the following format:
    - Each topic or subtopic must start with a "|".
    - Indent subtopics by adding more "|" (e.g., "||" for level 2, "|||" for level 3) dont use ':' or things like that here.
    - Use "->" to show relationships or connections between topics and subtopics (e.g., "Topic A -> Subtopic A1").

    Example format:
    | Topic A
    || Subtopic A1
    || Subtopic A2 -> Subtopic A3
    | Topic B
    || Subtopic B1
    || Subtopic B1.1
    ||| Sub-subtopic B1.2 -> Sub-subtopic B1.3
    | Topic C
    || Subtopic C1 -> Subtopic C2
    ||| Sub-subtopic C1.2 -> Sub-subtopic C1.3

    Generate the roadmap with the structure as above.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'command-xlarge-nightly',  // Choose the appropriate model; you can try other options like 'large', 'medium', etc.
      prompt: prompt,
      max_tokens: 500,  // Adjust as needed
      temperature: 0.7,  // You can play with the temperature for more creative results
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })
  });

  const data = await response.json();

  if (data && data.generations && data.generations[0]) {
    return data.generations[0].text.trim();
  } else {
    console.error("Error generating roadmap");
    return '';
  }
}

// Parse the roadmap string into a tree structure
function parseRoadmap(text, topic) {
  const lines = text.trim().split("\n");
  const tree = { name: topic, children: [] };  // Set the root node to the user-provided topic
  const nodeMap = { [topic]: tree };

  lines.forEach((line) => {
    const level = line.match(/^\|+/)[0].length;
    const content = line.replace(/^\|+/, "").trim();
    const [name, connections] = content.split("->").map(s => s.trim());

    const node = { name, children: [] };
    if (level === 1) {
      tree.children.push(node);
    } else {
      const parent = nodeMap[Object.keys(nodeMap).reverse().find((key) => key.startsWith(level - 1))];
      if (parent) parent.children.push(node);
    }

    nodeMap[`${level}:${name}`] = node;

    if (connections) {
      connections.split(",").forEach((target) => {
        const targetNode = nodeMap[Object.keys(nodeMap).find((key) => key.endsWith(target.trim()))];
        if (targetNode) {
          node.children.push({ name: target.trim(), isReference: true });
        }
      });
    }
  });

  return tree;
}
async function generateRoadmap() {
  const topic = document.getElementById('topic').value;
  if (!topic) {
    alert("Please enter a topic.");
    return;
  }

  // Show the loader
  document.getElementById('loader').style.display = 'block';
  // Call the Cohere API to generate the roadmap (with your API key)
  const roadmapText = await fetchRoadmap(topic);

  // Parse the roadmap, passing the topic to set as the root node name
  const parsedRoadmap = parseRoadmap(roadmapText, topic);

  // Render the roadmap as a tree
  renderRoadmap(parsedRoadmap);

  document.getElementById('loader').style.display = 'none';
}

function renderRoadmap(data) {
  const margin = { top: 10, right: 120, bottom: 10, left: 120 };
  const width = Math.max(960, window.innerWidth - margin.left - margin.right);
  let height = Math.max(600, Math.min(window.innerHeight * 0.8, 1000));

  const svg = d3.select("#roadmap").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);

  const rootGroup = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const root = d3.hierarchy(data);

  // Set a larger node separation to avoid overlapping
  const treeLayout = d3.tree().nodeSize([50, 200]); // [vertical spacing, horizontal spacing]
  treeLayout(root);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])  // Set min and max zoom scale
    .on("zoom", function(event) {
      rootGroup.attr("transform", event.transform); // Apply the zoom and pan transformation to the root group
    });

  // Apply zoom behavior to the SVG container
  svg.call(zoom);

  // Links
  rootGroup.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x))
    .attr("fill", "none")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1.5);

  // Nodes
  const nodes = rootGroup.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

  // Rounded rectangles
  nodes.append("rect")
    .attr("x", d => -getTextWidth(d.data.name) / 2 - 10) // Center the rectangle
    .attr("y", -15) // Align vertically
    .attr("width", d => getTextWidth(d.data.name) + 20) // Adjust width based on text
    .attr("height", 30) // Fixed height
    .attr("rx", 10) // Rounded corners
    .attr("ry", 10)
    .style("fill", "#1b2141")
    .style("stroke", "#0b4564")
    .style("stroke-width", 1.5);

  // Text inside the rectangles
  nodes.append("text")
    .attr("dy", 5) // Center the text vertically
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(d => d.data.name);

  // Dynamically adjust page size based on the tree size
  adjustPageSize(width, height);
}


// Helper function to calculate the text width
function getTextWidth(text) {
  const context = document.createElement("canvas").getContext("2d");
  context.font = "12px sans-serif"; // Match the font style of the text
  return context.measureText(text).width;
}

// Dynamically adjust page size to fit the tree
function adjustPageSize(treeWidth, treeHeight) {
  const margin = { top: 10, right: 120, bottom: 10, left: 120 };

  // Adjust the body size based on the tree's dimensions
  document.body.style.height = `${treeHeight + margin.top + margin.bottom}px`;
  document.body.style.width = `${treeWidth + margin.left + margin.right}px`;

  // Adjust the SVG size
  d3.select("svg")
    .attr("width", treeWidth + margin.left + margin.right)
    .attr("height", treeHeight + margin.top + margin.bottom);
}


// Helper function for text wrapping
function wrapText(text, width) {
  text.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word, line = [], lineNumber = 0, lineHeight = 1.1; // Line height in ems
    const x = text.attr("x") || 0, y = text.attr("y") || 0;
    const dy = parseFloat(text.attr("dy")) || 0;

    let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", `${dy}em`);

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word);
      }
    }
  });
}
