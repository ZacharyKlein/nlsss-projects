# NLSSS Node

This application facilitates the replication of the results of

Wise, Kurt P. and Richardson, Donna (2023) "What Biostratigraphic Continuity Suggests About Earth
History," Proceedings of the International Conference on Creationism: Vol. 9, Article 19.
DOI: 10.15385/jpicc.2023.9.1.31
Available at: https://digitalcommons.cedarville.edu/icc_proceedings/vol9/iss1/19

Before running any of the scripts below, run:

`npm install`

To prepare the environment. Tested using Node.js 18 on MacOS.

# index

- Downloads data from the Paleobiology Database, stores as local JSON files under `data/`
- Generates stage-stage boundaries following the criteria set in Wise, Richardson (2023)
- Generates NLSSS (Number of Local Stage-Straddling Species) and OLSSS (Occurrences of Local Stage-Straddling Species) JSON files under `data/`
- Generates `nlsss.json` file containing replication of Wise, Richardson (2023) (WIP - not all columns implemented)


Run `node index.js`

Find files under `data/`

# generate-boundary-maps

Must be run *after* `index`. This script will output a series of global maps of each NLSSS boundary, plotting all the occurrences of each stage-straddling species. Maps are generated for each boundary and are output to the `data/maps` directory.

Run `node generate-boundary-maps.js`


# generate-postflood-boundaries

Must be run *after* `index`. This script will output two JSON files, `nlsss-kpg.json` (which includes boundaries 94-96) and `nlsss-nq.json` (boundaries 111-113). These files can be covered to CSV easily using https://data.page/json/csv

Run `node generate-postflood-boundaries.js`



# generate-crosser-icons

WIP
