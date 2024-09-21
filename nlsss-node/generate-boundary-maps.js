import {promises as fs} from "fs";
import {createCanvas} from "@napi-rs/canvas";
import {geoPath} from "d3-geo";
import {geoNaturalEarth2} from "d3-geo-projection";
import world from "world-atlas/countries-110m.json" assert {type: "json"};
import {feature} from "topojson-client";
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import path from 'path';
import { fileURLToPath } from 'url';

const width = 2000;
const height = 1000;

// Function to read JSON from a file
async function readJsonFromFile(filename) {
    console.log('reading file ' + filename);
    try {
        const data = await fs.readFile(filename); // Read the file
        return JSON.parse(data); // Parse the JSON data
    } catch (error) {
        return null;
    }
}

async function main() {

    console.log("Generating boundary maps...")
// Coordinates to plot (Latitude, Longitude)

    // Define the pattern for matching files (e.g., OLSSS-*)
    const pattern = 'OLSSS-*';
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    console.log({__filename})
    console.log({__dirname})

// Use glob to get all files matching the pattern
    const files = await glob(pattern, {cwd: __dirname + "/data"});

    console.log("Generating maps for %d files", files.length)

    // Iterate over the matching files
    for (const file of files) {
        const filePath = path.join(__dirname, "data", file);
        console.log(`Processing file: ${filePath}`);

        // Optionally, you can perform operations with each file here
        // For example, reading the file content:
        const boundaryPoints = await readJsonFromFile(filePath);

        const boundaryCoordinates = boundaryPoints.map(occ => {
            return {
                lat: occ.lat, lon: occ.lng, label: ''
            }
        })

        // Set up canvas dimensions
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        console.log("Generating map for " + file)

        await plotMap(boundaryCoordinates, "data/maps/" + file.replaceAll(".json", "-map.png"), canvas, context)

    }

    console.log("Finished.")
}

async function plotMap(coordinates, filename, canvas, context) {
    console.log("Plotting map for %d coordinates", coordinates.length)

// Set up a geographic projection (Natural Earth Projection in this case)
    const projection = geoNaturalEarth2()
        .scale(400)        // Scale to fit the canvas
        .translate([width / 2, height / 2]); // Center the map on the canvas

    const path = geoPath(projection, context);

// Draw the world map
    const worldFeatures = feature(world, world.objects.countries).features;

    context.fillStyle = 'lightblue';
    context.fillRect(0, 0, width, height); // Set background for oceans

    context.strokeStyle = 'black';
    context.lineWidth = 0.5;
    context.fillStyle = 'lightgreen';

// Draw the countries
    worldFeatures.forEach(function (feature) {
        context.beginPath();
        path(feature);
        context.fill();
        context.stroke();
    });


    // Plot each coordinate on the map
    coordinates.forEach((coord) => {
        const [x, y] = projection([coord.lon, coord.lat]); // Project longitude and latitude

        // Draw a red dot at each coordinate
        context.beginPath();
        context.arc(x, y, 4, 0, 2 * Math.PI); // A circle with a radius of 5
        context.fillStyle = 'blue';
        context.fill();

        // Add labels
        context.font = 'bold 15px Arial';
        context.fillStyle = 'black';
        context.fillText(coord.label, x + 8, y + 4); // Place label near the dot
    });

// Write the map to a PNG file
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filename, buffer);

    console.log('Map generated as ' + filename);

    return filename;
}

await main();