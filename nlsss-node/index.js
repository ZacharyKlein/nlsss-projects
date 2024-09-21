import fetch from "node-fetch";

import {
    arrayToCSV,
    isGreaterThanNDegreesFromAll,
    readJsonFromFile, uniqueSpecies,
    wise2023Filter,
    writeCSVToFile,
    writeJsonToFile
} from "./utils.js";

const PALEO_DB_BASE_URL = "http://paleobiodb.org/data1.2/"
//TODO: const STAGE_LIST_URL = "timescales/list.txt?type=stage" //PaleobioDb API is broken
const OCC_LIST_URL = "occs/list.json?datainfo&rowcount&idreso=species&show=class,coords,loc&timerule=contain"
const INTERVAL_LIST_URL = "intervals/list.json?scale=1"

let intervals
let occurrencesForInterval = new Map()

const datasource_prefix = 'data/';
const intervals_datasource = 'intervals.json';
const occurrences_datasource = 'occurrences.json';

const SKIP_FACTOR = 3;


async function fetchOccurrencesSequentially(intervals) {

    let filteredIntervals = intervals.filter(wise2023Filter)

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

            await writeJsonToFile(datasource_prefix, interval.oid.replaceAll("int:", '') + '_' + occurrences_datasource, occurrences);

            console.log("Total occurrences fetched for interval %s: %s", interval.nam, occurrences.length);

        } catch (error) {
            console.error(`Error fetching occurrences`, error);
        }
    }

}

async function loadPaleoDbData() {

    console.log("Loading PaleoDb data...")
    // Read the JSON back from the file (if present)

    let _intervals = await readJsonFromFile(datasource_prefix, intervals_datasource);

    async function downloadPaleoDbForIntervals() {
        console.log("Downloading PaleoDb data from API");
        let response = await fetch(PALEO_DB_BASE_URL + INTERVAL_LIST_URL);
        let data = await response.json();
        _intervals = data.records;
        console.log("Total intervals fetched: " + _intervals.length);

        // Write the JSON array to a file

        await writeJsonToFile(datasource_prefix, intervals_datasource, _intervals);


        //for loop over intervals
        await fetchOccurrencesSequentially(_intervals).then(() => "Complete");

    }

    async function loadPaleoDbFromDisk(intervals) {
        console.log("Total intervals stored: " + intervals.length);

        let _occurrencesForInterval = new Map();

        let filteredIntervals = intervals.filter(wise2023Filter);

        for (const interval of filteredIntervals) {
            let occurrences = await readJsonFromFile(datasource_prefix, interval.oid.replaceAll("int:", '') + '_' + occurrences_datasource)

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
        _intervals = _intervals.filter(wise2023Filter);

        occurrencesForInterval = await loadPaleoDbFromDisk(_intervals);

    }

    return _intervals;
}

async function main() {
    console.log('Loading data from PaleoDB... ✨')

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


    let filteredIntervals = sortedIntervals.filter(wise2023Filter)

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
        let skipperStage = filteredIntervals[i + 1 + SKIP_FACTOR];

        if (firstStage.nam === "Archean" && nextStage.nam === "Eoarchean") {
            console.log("Skipping " + firstStage.nam + "/" + nextStage.nam + " boundary...")
        } else {
            console.log("Creating " + firstStage.nam + "/" + nextStage.nam + " boundary...")

            let firstStageOccurrences = occurrencesForInterval[firstStage.oid]
            let nextStageOccurrences = occurrencesForInterval[nextStage.oid]
            let skipperStageOccurrences

            if (skipperStage !== undefined) {
                skipperStageOccurrences = occurrencesForInterval[skipperStage.oid]
            }

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

            let filteredSkipperStageOccurrences

            if (skipperStage !== undefined) {
                filteredSkipperStageOccurrences = skipperStageOccurrences.filter(occ => {
                    if (occ.hasOwnProperty('oli')) {
                        //Age assignment is broader than stage - exclude
                        return false
                    } else return true;
                })
            }

            let firstStageSpecies = filteredFirstStageOccurrences.reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || []
            let nextStageSpecies = filteredNextStageOccurrences.reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || [];

            let skipperStageSpecies

            if (skipperStage !== undefined) {
                skipperStageSpecies = filteredSkipperStageOccurrences.reduce(uniqueSpecies, {
                    seen: new Set(),
                    result: []
                }).result || [];
            }

            // Total Combined Stage Species
            let tcss = filteredFirstStageOccurrences.concat(filteredNextStageOccurrences).reduce(uniqueSpecies, {
                seen: new Set(),
                result: []
            }).result || [];

            //all records were deleted for species found only on one side of the boundary

            //Occurrences of Global Stage-Straddling Species
            let ogsss = filteredFirstStageOccurrences.filter(occ1 => filteredNextStageOccurrences.some(occ2 => occ2.tna === occ1.tna))

            //Occurrences of Global Stage-Skipping Species
            let ogsSs = []

            if (skipperStage !== undefined) {
                ogsSs = filteredFirstStageOccurrences.filter(occ1 => filteredSkipperStageOccurrences.some(occ2 => occ2.tna === occ1.tna))
            }

            //NLSSkS = Number of Local Stage-Skipping Species
            let ngsSs = []
            if(skipperStage !== undefined) {
                ngsSs = ogsSs.reduce(uniqueSpecies, {seen: new Set(), result: []}).result || [];
                console.log("Total NGSSkS value for %s/%s boundary: %d", firstStage.nam, skipperStage.nam, ngsSs.length)
            }


            //Number of Global Stage-Straddling Species
            let ngsss = ogsss.reduce(uniqueSpecies, {
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

                return !isGreaterThanNDegreesFromAll(nsoccSameTaxa, occ, 2)
            })
            console.log("Filtered %d %s taxa within 2 degrees long/lat of same taxa in %s", olsss.length, firstStage.nam, nextStage.nam)

            //Occurrences of Local Stage-Skipping Species
            let olsSs = []

            if (skipperStage !== undefined) {
                olsSs = filteredFirstStageOccurrences.filter(occ => {
                    let ssoccSameTaxa = filteredSkipperStageOccurrences.filter(ssocc => occ.tna === ssocc.tna)

                    return !isGreaterThanNDegreesFromAll(ssoccSameTaxa, occ, 2)
                })
                console.log("Filtered %d %s taxa within 2 degrees long/lat of same taxa in %s", olsSs.length, firstStage.nam, skipperStage.nam)
            }


            //The records remaining in this file, then, are all records of species found on both sides of the
            // boundary within two degrees longitude and latitude. The count of
            // how many different species are found in this final file is the NLSSS
            // for this stratigraphic boundary.

            //NLSSS = Number of Local Stage-Straddling Species
            const nlsss = olsss.reduce(uniqueSpecies, {seen: new Set(), result: []}).result || [];

            //NLSSkS = Number of Local Stage-Skipping Species
            let nlsSs = []
            if(skipperStage !== undefined) {
                nlsSs = olsSs.reduce(uniqueSpecies, {seen: new Set(), result: []}).result || [];
                console.log("Total NLSSkS value for %s/%s boundary: %d", firstStage.nam, skipperStage.nam, nlsSs.length)
            }

            //Workaround skipping the Archean/Eoarchean
            const index = (firstStage.nam === 'Hadean') ? i + 1 : i;

            //OLSSS = Occurrences of Local Stage-Straddling Species
            console.log("Total OLSSS value for %s/%s boundary: %d", firstStage.nam, nextStage.nam, olsss.length)
            await writeJsonToFile(datasource_prefix, `OLSSS-${index}.json`, olsss)

            if(skipperStage !== undefined) {
                //OLSSkS = Occurrences of Local Stage-Skipping Species
                console.log("Total OLSSkS value for %s/%s boundary: %d", firstStage.nam, skipperStage.nam, olsSs.length)
                await writeJsonToFile(datasource_prefix, `OLSSkS-${index}.json`, olsSs)

                //OLSSkS = Occurrences of Global Stage-Skipping Species
                console.log("Total OGSSkS value for %s/%s boundary: %d", firstStage.nam, skipperStage.nam, ogsSs.length)
                await writeJsonToFile(datasource_prefix, `OGSSkS-${index}.json`, ogsSs)

            }

            //OLSSS = Occurrences of Global Stage-Straddling Species
            console.log("Total OGSSS value for %s/%s boundary: %d", firstStage.nam, nextStage.nam, ogsss.length)
            await writeJsonToFile(datasource_prefix, `OGSSS-${index}.json`, ogsss)


            console.log("Total NLSSS value for %s/%s boundary: %d", firstStage.nam, nextStage.nam, nlsss.length)
            await writeJsonToFile(datasource_prefix, `NLSSS-${index}-${firstStage.nam}-${nextStage.nam}.json`, nlsss)

            boundaries[index] = {
                boundary: `${firstStage.nam}/${nextStage.nam}`,
                below: firstStageSpecies.length,
                above: nextStageSpecies.length,
                tcss: tcss.length,
                ngsss: ngsss.length,
                nlsSs: nlsSs.length,
                ngsSs: ngsSs.length,
                ogsSs: ogsSs.length,
                olsSs: olsSs.length,
                olsss: olsss.length,
                ogsss: ogsss.length,
                nlsss_perc: ((nlsss.length / firstStageSpecies.length) * 100).toFixed(2),
                nlsss: nlsss.length,
            };
        }
    }

    const boundaryArray = Array.from(Object.entries(boundaries), ([key, value]) => ({key, ...value}));
    console.table(boundaryArray);

    console.log("Writing out NLSSS boundaries to JSON...")
    await writeJsonToFile(datasource_prefix, "nlsss.json", boundaryArray);

    // Convert array of objects to CSV string
    const csvData = arrayToCSV(boundaryArray);

    // Write CSV data to file
    await writeCSVToFile('nlsss.csv', csvData)
}

await main();