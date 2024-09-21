import fetch from "node-fetch";
import {promises as fs} from "fs";

const PALEO_DB_BASE_URL = "http://paleobiodb.org/data1.2/"
//TODO: const STAGE_LIST_URL = "timescales/list.txt?type=stage"
const OCC_LIST_URL = "occs/list.json?datainfo&rowcount&idreso=species&show=class,coords,loc&timerule=contain"
const INTERVAL_LIST_URL = "intervals/list.json?scale=1"

//TODO: let stages
let intervals
let occurrencesForInterval = new Map()

const datasource_prefix = 'data/';
const intervals_datasource = 'intervals.json';
const occurrences_datasource = 'occurrences.json';

// Function to convert JSON array to CSV format
function convertToCSV(jsonArray) {
    const headers = Object.keys(jsonArray[0]).join(','); // Get the headers
    const rows = jsonArray.map(obj => Object.values(obj).join(',')); // Get the rows
    return [headers, ...rows].join('\n'); // Combine headers and rows
}

// Function to write CSV file to the local filesystem
async function writeCSVToFile(filename, data) {
    await fs.writeFile(filename, data, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`CSV file written successfully to ${filename}`);
        }
    });
}


// Function to write JSON to a file
async function writeJsonToFile(filename, data) {
    fs.writeFile(datasource_prefix + filename, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File written successfully.');
        }
    });
};

// Function to read JSON from a file
async function readJsonFromFile(filename) {
    console.log('reading file ' + filename);
    try {
        const data = await fs.readFile(datasource_prefix + filename,); // Read the file
        return JSON.parse(data); // Parse the JSON data
    } catch (error) {
        return null;
    }
}

async function fetchOccurrencesSequentially(intervals) {

    let filteredIntervals = intervals.filter(wise2023)

    for (const interval of filteredIntervals) {
        console.log("Fetching fossil occurrences for %s...", interval.nam);

        try {
            // Await each fetch call, ensuring they happen one after another
            console.log("GET " + PALEO_DB_BASE_URL + OCC_LIST_URL + `&interval=${interval.nam}`)
            const response = await fetch(PALEO_DB_BASE_URL + OCC_LIST_URL + `&interval_id=${interval.oid}`);

            // Assuming the response is JSON
            const data = await response.json();

            // Store the result
            let occurrences = data.records;

            occurrencesForInterval[interval.oid] = occurrences

            await writeJsonToFile(interval.oid.replaceAll("int:", '') + '_' + occurrences_datasource, occurrences);

            console.log("Total occurrences fetched for interval %s: %s", interval.nam, occurrences.length);

        } catch (error) {
            console.error(`Error fetching occurrences`, error);
        }
    }

}

async function loadPaleoDbData() {

    console.log("Loading PaleoDb data...")
    // Read the JSON back from the file (if present)

    let _intervals = await readJsonFromFile(intervals_datasource);

    async function downloadPaleoDbForIntervals() {
        console.log("Downloading PaleoDb data from API");
        let response = await fetch(PALEO_DB_BASE_URL + INTERVAL_LIST_URL);
        let data = await response.json();
        _intervals = data.records;
        console.log("Total intervals fetched: " + _intervals.length);

        // Write the JSON array to a file

        await writeJsonToFile(intervals_datasource, _intervals);


        //for loop over intervals
        await fetchOccurrencesSequentially(_intervals).then(() => "Complete");

    }

    async function loadPaleoDbFromDisk(intervals) {
        console.log("Total intervals stored: " + intervals.length);

        let _occurrencesForInterval = new Map();

        let filteredIntervals = intervals.filter(wise2023);

        for (const interval of filteredIntervals) {
            let occurrences = await readJsonFromFile(interval.oid.replaceAll("int:", '') + '_' + occurrences_datasource)

            if (occurrences === null) {
                console.warn("No occurrences stored for %s", interval.nam)
                _occurrencesForInterval[interval.oid] = []

            } else {
                console.log("Total occurrences stored for interval %s: %s", interval.nam, occurrences.length)

                _occurrencesForInterval[interval.oid] = occurrences

            }
        }

        return _occurrencesForInterval;
    }

    if (_intervals === null) {
        console.error("No intervals stored");
        await downloadPaleoDbForIntervals();
    } else {
        _intervals = _intervals.filter(wise2023);

        occurrencesForInterval = await loadPaleoDbFromDisk(_intervals);

    }

    return _intervals;
}

function wise2023(interval) {

    let result = false

    //Include all ages by default
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

function isGreaterThanTwoDegreesFromAll(coordsArray, targetCoords) {
    return coordsArray.every(coord => {
        const latitudeDiff = Math.abs(coord.lat - targetCoords.lat);
        const longitudeDiff = Math.abs(coord.lng - targetCoords.lng);

        // Return true if this coordinate is more than 2 degrees away from target
        return latitudeDiff > 2 || longitudeDiff > 2;
    });
}


function uniqueSpecies(acc, obj) {
    // If the name has not been encountered yet, add the object to the accumulator
    if (!acc.seen.has(obj.tna)) {
        acc.seen.add(obj.tna);
        acc.result.push(obj);
    }
    return acc;
}

async function main() {
    console.log('Loading data from PaleoDB... ✨')


// fetch(PALEO_DB_BASE_URL + STAGE_LIST_URL).then(response => response.text()).then((data) => {
//     stages = csvToJson(data.split("\n"));
//
//     stages.forEach(stage => {
//
//         console.log("stage ID %s, %s", stage.interval_no, stage.interval_name)
//     })
//
//     console.log(stages.length)
//     }
// );
    intervals = await loadPaleoDbData();


    //iterate over keys in occurrencesForInterval and sum the total of items in each array

    const totalOccurrences = Object.entries(occurrencesForInterval).reduce((acc, [key, array]) => {
        return acc + array.length; // Sum up the lengths of each array
    }, 0);

    console.log("Stored %s occurrences for %s intervals", totalOccurrences, intervals.length)


    console.log('Sorting intervals by age...')

    let sortedIntervals = intervals.sort((a, b) => b.eag - a.eag);

    sortedIntervals.forEach(interval => {
        let occForInterval = occurrencesForInterval[interval.oid].length;
        interval.occurrences = occForInterval;
    });


    let filteredIntervals = sortedIntervals.filter(wise2023)

    console.table(filteredIntervals);

    const filteredIntervalOids = filteredIntervals.map(interval => interval.oid)
    const filteredOccurrences = Object.entries(occurrencesForInterval).reduce((acc, [key, array]) => {

        if (filteredIntervalOids.includes(key)) {
            return acc + array.length; // Sum up the lengths of each array
        } else return acc;
    }, 0);

    console.log("Final %s occurrences for %s intervals", filteredOccurrences, filteredIntervals.length)

    let boundaries = new Map()

    for (let i = 0; i < filteredIntervals.length - 1; i++) {

        //For each boundary, we downloaded two files from the Paleobiology Database
        // (PBDB; paleobiodb.org)—one for all the taxa reported in the global
        // stratigraphic unit immediately below the boundary and one for all
        // the taxa reported in the global stratigraphic unit immediately above
        // the boundary.
        let firstStage = filteredIntervals[i];
        let nextStage = filteredIntervals[i + 1];

        if (firstStage.nam === "Archean" && nextStage.nam === "Eoarchean") {
            console.log("Skipping " + firstStage.nam + "/" + nextStage.nam + " boundary...")
        } else {
            console.log("Creating " + firstStage.nam + "/" + nextStage.nam + " boundary...")

            let firstStageOccurrences = occurrencesForInterval[firstStage.oid]
            let nextStageOccurrences = occurrencesForInterval[nextStage.oid]

            //TODO: Each of these files was processed to the taxonomic
            // level of species by deleting all records identified less precisely than
            // the species level, and considering only at the species level those re-
            // cords identified more precisely than the species level

            //Each file must be processed to the proper stratigraphic level by deleting all re-
            // cords that located the fossil less precisely than the Phanerozoic stage
            // (or Proterozoic system or Archean erathem).
            let filteredFirstStageOccurrences = firstStageOccurrences.filter(occ => {
                if (occ.hasOwnProperty('oli')) {
                    //Age assignment is broader than interval (stage/system/erathem) - exclude
                    return false
                } else return true;
            })

            let filteredNextStageOccurrences = nextStageOccurrences.filter(occ => {
                if (occ.hasOwnProperty('oli')) {
                    //Age assignment is broader than stage - exclude
                    return false
                } else return true;
            })

            let firstStageSpecies = filteredFirstStageOccurrences.reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || []
            let nextStageSpecies = filteredNextStageOccurrences.reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || [];

            // Total Combined Stage Species
            let tcss = filteredFirstStageOccurrences.reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || [];

            //all records were deleted for species found only on one side of the boundary

            //Stage-Straddling Species
            let sss = filteredFirstStageOccurrences.filter(occ1 => filteredNextStageOccurrences.some(occ2 => occ2.tna === occ1.tna)).reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || [];

            // all records
            // were deleted that were located more than two degrees latitude or
            // longitude (greater than about 200-300 miles) from all other
            // occurrences on the opposite side of the boundary.

            //OLSSS = Occurrences of Local Stage-Straddling Species
            let olsss = filteredFirstStageOccurrences.filter(occ => {
                let nsoccSameTaxa = filteredNextStageOccurrences.filter(nsocc => occ.tna === nsocc.tna)

                return !isGreaterThanTwoDegreesFromAll(nsoccSameTaxa, occ)
            })

            console.log("Filtered %d %s taxa within 2 degrees long/lat of same taxa in %s", olsss.length, firstStage.nam, nextStage.nam)

            //The records remaining in this file, then, are all records of species found on both sides of the
            // boundary within two degrees longitude and latitude. The count of
            // how many different species are found in this final file is the NLSSS
            // for this stratigraphic boundary.

            //NLSSS = Number of Local Stage-Straddling Species
            const nlsss = olsss.reduce(uniqueSpecies, {seen: new Set(), result: []}).result || [];


            //OLSSS = Occurrences of Local Stage-Straddling Species
            console.log("Total OLSSS value for %s/%s boundary: %d", firstStage.nam, nextStage.nam, olsss.length)

            //Workaround skipping the Archean/Eoarchean
            const index = (firstStage.nam === 'Hadean') ? i+1 : i;

            await writeJsonToFile(`OLSSS-${index}.json`, olsss)

            console.log("Total NLSSS value for %s/%s boundary: %d", firstStage.nam, nextStage.nam, nlsss.length)
            await writeJsonToFile(`NLSSS-${index}-${firstStage.nam}-${nextStage.nam}.json`, nlsss)

            boundaries[index] = {
                boundary: `${firstStage.nam}/${nextStage.nam}`,
                below: firstStageSpecies.length,
                above: nextStageSpecies.length,
                tcss: tcss.length,
                sss: sss.length,
                olsss: olsss.length,
                nlsss_perc: ((nlsss.length / firstStageSpecies.length) * 100).toFixed(2),
                nlsss: nlsss.length,
            };
        }
    }

    const boundaryArray = Array.from(Object.entries(boundaries), ([key, value]) => ({key, ...value}));
    console.table(boundaryArray);

    console.log("Writing out NLSSS boundaries to JSON...")
    await writeJsonToFile("nlsss.json", boundaryArray);

}

await main();