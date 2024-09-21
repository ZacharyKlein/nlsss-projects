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

    await writeJsonToFile("nlsss-kpg.json", kpgTaxa);
    await writeJsonToFile("nlsss-nq.json", nqTaxa);

}

await main()