import {promises as fs} from "fs";
import fetch from "node-fetch";
import {createCanvas, loadImage} from "@napi-rs/canvas";

// Configuration
const API_URL = 'https://paleobiodb.org/data1.2/taxa/thumb.png?taxon_name=';  // API returning byte array
const GRID_COLUMNS = 4;  // Number of columns in the grid
const ICON_SIZE = 100;   // Size of each icon (width and height in pixels)
const MARGIN = 10;       // Margin between icons


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
const fetch = require('node-fetch');
const { createCanvas, Image } = require('canvas');
const fs = require('fs');


async function fetchIcon(taxon) {
    const url = `${API_URL}${encodeURIComponent(taxon)}`;
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();  // Get the image as a byte array
        return Buffer.from(buffer);  // Convert the array buffer to a Node.js Buffer
    } catch (error) {
        console.error(`Error fetching icon for ${taxon}:`, error);
        return null;
    }
}

async function createIconGrid() {
    const canvasWidth = GRID_COLUMNS * (ICON_SIZE + MARGIN) - MARGIN;
    const canvasHeight = Math.ceil(TAXA.length / GRID_COLUMNS) * (ICON_SIZE + MARGIN) - MARGIN;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fetch and draw each icon
    for (let i = 0; i < TAXA.length; i++) {
        const taxon = TAXA[i];
        const iconBuffer = await fetchIcon(taxon);

        if (iconBuffer) {
            const img = new Image();
            img.src = iconBuffer;

            const x = (i % GRID_COLUMNS) * (ICON_SIZE + MARGIN);
            const y = Math.floor(i / GRID_COLUMNS) * (ICON_SIZE + MARGIN);

            ctx.drawImage(img, x, y, ICON_SIZE, ICON_SIZE);
        } else {
            console.log(`Skipping ${taxon}, no image available.`);
        }
    }

    // Save the canvas as an image file
    const out = fs.createWriteStream('./icon-grid-byte-array.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
        console.log('Icon grid created as icon-grid-byte-array.png');
    });
}

await createIconGrid();
