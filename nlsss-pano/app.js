const ctx = document.getElementById('nlsss-chart').getContext('2d');

// Preload images (assuming images are named image1.jpg, image2.jpg, ... image114.jpg)
const images = Array.from({length: 114}, (_, i) => `images/${i + 1}-map.png`);

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
        });
        return `${item.key} - ${item.boundary}
        NLSSS: ${item.nlsss} (${item.nlsss_perc}%)
        NLSSS (occurrences): ${item.olsss}
        NGSSS: ${item.ngsss}
        Taxa below: ${item.below}
        Taxa above: ${item.above}
        Total taxa: ${item.tcss}`
    };

    let activeIndex = 0; // Track the active data point
    let playInterval; // To store the setInterval reference
    let isPlaying = false; // To track if it's currently playing
    let playSpeed = 500; // Default play speed in milliseconds

    // Function to update the tooltip manually
    function updateTooltip(chart, index) {
        const tooltipModel = chart.tooltip;

        // Set active elements
        chart.setActiveElements([
            {datasetIndex: 0, index: index}
        ]);

        // Update the tooltip with the correct data
        tooltipModel.setActiveElements([
            {datasetIndex: 0, index: index}
        ])

        // Refresh the tooltip
        chart.tooltip.update();

        // Manually trigger re-rendering of the chart
        chart.update();

        // Update the image
        updateImage(index);
    }

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
                    enabled: false, // Disable the default tooltip
                    external: function (context) {

                        //console.log(context.tooltip)
                        // Custom tooltip positioning
                        const tooltipModel = context.tooltip;

                        // Create a tooltip element if it doesn't exist
                        let tooltipEl = document.getElementById('chartjs-tooltip');

                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.id = 'chartjs-tooltip';
                            tooltipEl.style.position = 'absolute';
                            tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            tooltipEl.style.fontStyle = 'sans-serif';
                            tooltipEl.style.color = 'white';
                            tooltipEl.style.minWidth = '240px';
                            tooltipEl.style.borderRadius = '5px';
                            tooltipEl.style.padding = '10px';
                            tooltipEl.style.pointerEvents = 'none';
                            tooltipEl.style.transform = 'translate(-50%, 0)';
                            document.body.appendChild(tooltipEl);
                        }

                        // Hide if no tooltip
                        // if (tooltipModel.opacity === 0) {
                        //     tooltipEl.style.opacity = 0;
                        //     return;
                        // }

                        // Set text for the tooltip
                        if (tooltipModel.body) {
                            const bodyLines = tooltipModel.body.map(b => b.lines);
                            tooltipEl.innerHTML = bodyLines.join('<br>');
                        }

                        if (tooltipModel.footer) {
                            const footerLines = tooltipModel.footer;
                            tooltipEl.innerHTML = footerLines.join('<br>');
                        }

                        // Position the tooltip

                        tooltipEl.style.opacity = 1;
                        tooltipEl.style.left = '30%';
                        tooltipEl.style.top = '35%'
                    },
                    callbacks: {
                        footer: footer,
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest', // Scrub mode nearest to the X position
                axis: 'x',
                intersect: false
            },
            onHover: (event, chartElement) => {
                if (chartElement.length > 0) {
                    const index = chartElement[0].index; // Get the point index
                    updateImage(index); // Update image when scrubbing
                }
            }
        }
    });

    // Initial tooltip update
    updateTooltip(chart, 0);

    // Update chart and image based on slider position
    document.getElementById('slider').addEventListener('input', function () {
        activeIndex = parseInt(this.value, 10); // Get slider value
        updateTooltip(chart, activeIndex); // Update tooltip and image
    });

    // Update chart and image based on slider position
    document.getElementById('slider').addEventListener('input', function () {
        activeIndex = parseInt(this.value, 10); // Get slider value
        updateTooltip(chart, activeIndex); // Update tooltip and image
    });

    // Play button functionality
    document.getElementById('playButton').addEventListener('click', function () {
        if (!isPlaying) {
            this.textContent = 'Pause'; // Change button text to "Pause"
            playSlideshow();
        } else {
            this.textContent = 'Play'; // Change button text to "Play"
            pauseSlideshow();
        }
        isPlaying = !isPlaying; // Toggle play/pause state
    });

    // Function to start the slideshow
    function playSlideshow() {
        playInterval = setInterval(() => {
            if (activeIndex < 113) { // Stop at the last point
                activeIndex++;
                document.getElementById('slider').value = activeIndex; // Update the slider position
                updateTooltip(chart, activeIndex); // Update the chart and image
            } else {
                pauseSlideshow(); // Stop slideshow when last data point is reached
            }
        }, playSpeed);
    }

    // Function to stop the slideshow
    function pauseSlideshow() {
        clearInterval(playInterval); // Clear the interval to stop the slideshow
    }

    // Speed dropdown functionality
    document.getElementById('speedSelect').addEventListener('change', function () {
        playSpeed = parseInt(this.value, 10); // Update playSpeed based on the dropdown selection
        if (isPlaying) {
            pauseSlideshow(); // Stop the current interval
            playSlideshow(); // Restart with the new speed
        }
    });


}

main();