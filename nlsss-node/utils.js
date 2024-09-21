import {promises as fs} from "fs";

// Function to convert array of objects to CSV
export const arrayToCSV = (array) => {
    // Get the headers (keys of the first object)
    const headers = Object.keys(array[0]);

    // Create CSV rows
    const rows = array.map(obj => {
        return headers.map(header => obj[header]).join(',');
    });

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
}

// Function to write CSV file to the local filesystem
export async function writeCSVToFile(filename, data) {
    await fs.writeFile(filename, data, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`CSV file written successfully to ${filename}`);
        }
    });
}

// Function to write JSON to a file
export async function writeJsonToFile(datasource_prefix, filename, data) {
    await fs.writeFile(datasource_prefix + filename, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File written successfully.');
        }
    });
}

// Function to read JSON from a file
export async function readJsonFromFile(datasource_prefix, filename) {
    console.log('reading file ' + filename);
    try {
        const data = await fs.readFile(datasource_prefix + filename,); // Read the file
        return JSON.parse(data); // Parse the JSON data
    } catch (error) {
        return null;
    }
}

export function isGreaterThanNDegreesFromAll(coordsArray, targetCoords, degrees) {
    return coordsArray.every(coord => {
        const latitudeDiff = Math.abs(coord.lat - targetCoords.lat);
        const longitudeDiff = Math.abs(coord.lng - targetCoords.lng);

        // Return true if this coordinate is more than 2 degrees away from target
        return latitudeDiff > degrees || longitudeDiff > degrees;
    });
}


export function uniqueSpecies(acc, obj) {
    // If the name has not been encountered yet, add the object to the accumulator
    if (!acc.seen.has(obj.tna)) {
        acc.seen.add(obj.tna);
        acc.result.push(obj);
    }
    return acc;
}

//Filters intervals per criteria in Wise, Richardson (2023)
export function wise2023Filter(interval) {

    let result = false

    //Include all stages by default
    if (interval.itp === 'age') result = true;

    //Include Hadean eonthem
    if (interval.oid === 'int:11') result = true;

    //Include Pridoli epoch
    if (interval.oid === 'int:59') result = true;

    //Include Hadean eonthem
    if (interval.oid === 'int:753') result = true;

    //Include Archean erathems
    if (interval.pid === 'int:753') result = true;

    //Include Paleoproterozoic periods
    if (interval.pid === 'int:756') result = true;

    //Include Mesoproterozoic periods
    if (interval.pid === 'int:755') result = true;

    //Include Neoproterozoic periods
    if (interval.pid === 'int:754') result = true;

    //Include Holocene epoch
    if (interval.oid === 'int:32') result = true;

    //Exclude Holocene ages
    if (interval.pid === 'int:32') result = false;

    return result;
}
