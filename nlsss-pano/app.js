const ctx = document.getElementById('nlsss-chart').getContext('2d');

// Assuming you have 114 data points
const mapIndices = Array.from({length: 114}, (_, i) => i + 1);

// Preload images (assuming images are named image1.jpg, image2.jpg, ... image114.jpg)
const images = Array.from({length: 114}, (_, i) => `images/OLSSS-${i + 1}-map.png`);

console.log({images})

const preloadedImages = images.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
});

console.log({preloadedImages})

// Function to update the displayed image
function updateImage(index) {
    let imageElement = document.getElementById('imageDisplay');
    imageElement.src = images[index]; // Update the src attribute with the corresponding image
}


async function main() {

// Initial image load (optional)
    updateImage(1);


// Function to load data from a JSON file
    async function loadData() {
        try {
            const response = await fetch('nlsss.json'); // Fetch the JSON file
            // Parse the JSON
            return await response.json(); // Return the dataPoints array
        } catch (error) {
            console.error('Error loading the data:', error);
            return []; // Return an empty array in case of error
        }
    }

    const dataPoints = await loadData(); // Load the data

    const footer = (tooltipItems) => {

        let item;
        tooltipItems.forEach(function (tooltipItem) {
            item = dataPoints[tooltipItem.dataIndex];
            console.log(item)

        });
        return `${item.boundary}
        NLSSS: ${item.nlsss} (${item.nlsss_perc}%)
        NLSSS (occurrences): ${item.olsss}
        NGSSS: ${item.ngsss}
        Taxa below: ${item.below}
        Taxa above: ${item.above}
        Total taxa: ${item.tcss}`
    };

// Create the chart
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map(b => b.key), // X-axis labels (114 points)
            datasets: [{
                label: 'NLSSS',
                data: dataPoints.map(b => b.nlsss), // Just an example dataset
                borderColor: 'rgb(68,125,255)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0, // Remove point markers
                tension: 0.1
            },
            {
                label: 'NGSSS',
                data: dataPoints.map(b => b.ngsss), // Just an example dataset
                borderColor: 'rgb(96,243,70)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0, // Remove point markers
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    enabled: true // Disable tooltips
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest', // Scrub mode nearest to the X position
                intersect: false
            },
            onHover: (event, chartElement) => {
                if (chartElement.length > 0) {
                    const index = chartElement[0].index; // Get the point index
                    updateImage(index); // Update image when scrubbing
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: footer,
                    }
                }
            }
        }
    });

}

main();