import {promises as fs} from "fs";

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

// Function to write JSON to a file
async function writeJsonToFile(filename, data) {
    await fs.writeFile(filename, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File written successfully.');
        }
    });
};


// Function to convert array of objects to CSV
function arrayToCSV(array) {
    // Get the headers (keys of the first object)
    const headers = Object.keys(array[3]);

    // Create CSV rows
    const rows = array.map(obj => {
        if(obj !== null) {
            return headers.map(header => {
                if (obj.hasOwnProperty(header)) {
                    return obj[header]
                }
            }).join(',');
        }
    });

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
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


async function main() {

    const kpg_filenames = ["data/OLSSS-94-Danian-Selandian.json", "data/OLSSS-95-Selandian-Thanetian.json", "data/NLSSS-96-Thanetian-Ypresian.json"]
    const nq_filenames = ["data/OLSSS-111-Gelasian-Calabrian.json", "data/OLSSS-112-Calabrian-Chibanian.json", "data/NLSSS-113-Chibanian-Late Pleistocene.json"]

    let kpgTaxa = []
    let nqTaxa = []

    for (const filename of kpg_filenames) {
        const data = await readJsonFromFile(filename);
        kpgTaxa = kpgTaxa.concat(data);
    }


    for (const filename of nq_filenames) {
        const data = await readJsonFromFile(filename);
        nqTaxa = nqTaxa.concat(data);
    }

    console.log({kpgTaxa})
    console.log({nqTaxa})

    console.log("Writing to output files...")

    const kpgCsv = arrayToCSV(kpgTaxa)
    const nqCsv = arrayToCSV(kpgTaxa)

    await writeCSVToFile("nlsss-kpg.csv", kpgCsv);
    await writeCSVToFile("nlsss-nq.csv", nqCsv);

}

await main()