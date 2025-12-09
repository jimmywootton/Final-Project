import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    // ==== NEW DATE RANGE PRESETS & HELPERS (Integration) ====
    const oneDay = 24 * 60 * 60 * 1000;
    const dateRangePresets = {
        'last-7d': 7 * oneDay,
        'last-30d': 30 * oneDay,
        'last-90d': 90 * oneDay,
    };
    let minDate, maxDate; // To store the absolute min/max dates from the data
    let brush; // Declared here to be accessible by setBrushSelection
    let rawData; // Declared here to be accessible globally
    let brushSelection; // Declared globally for easier access in playback

    // Function to convert date object to ISO string for input[type="datetime-local"]
    function dateToLocalISO(date) {
        if (!date) return "";
        // Adjust for the local timezone offset to display correctly in the input
        const offset = date.getTimezoneOffset() * 60000;
        const localTime = new Date(date.getTime() - offset);
        return localTime.toISOString().slice(0, 16);
    }

    // Function to apply a new brush selection programmatically
    function setBrushSelection(startDate, endDate) {
        // Check boundaries against the data's absolute min/max dates
        if (startDate < minDate) startDate = minDate;
        if (endDate > maxDate) endDate = maxDate;
        if (startDate >= endDate) {
            alert("Error: Start date must be before end date.");
            return;
        }

        // Convert dates back to pixel positions using the xTime scale
        const x0 = xTime(startDate);
        const x1 = xTime(endDate);

        // Apply the brush movement to the element with class "brush"
        // This triggers the 'end' brush handler, updating the bars
        // Use the globally stored brushSelection
        brushSelection.call(brush.move, [x0, x1]);
        
        // Explicitly call updateBars to ensure the visualization updates immediately
        // Note: For programmatic moves, D3 only triggers the 'end' event handler, 
        // so we call updateBars manually just in case, though the 'end' handler should cover it.
        updateBars(startDate, endDate);
    }

    // Function to handle the custom date input logic
    function handleCustomApply() {
        const startStr = document.getElementById("startDateInput").value;
        const endStr = document.getElementById("endDateInput").value;

        if (!startStr || !endStr) {
            alert("Please select both a start and end date.");
            return;
        }

        // Parse the local datetime string
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        
        stopPlayback();
        
        setBrushSelection(startDate, endDate);
        document.getElementById("date-range-select").value = 'custom';
    }
    // *******************************************************************


    // ==== CONFIG  ====
    const csvPath = "data/timeseries.csv";
    const dateColumn = "time";
    const valueColumns = [
        "BTCUSDT_Open",
        "ETHUSDT_Open",
        "SOLUSDT_Open",
        "DOGEUSDT_Open"
    ];

    // ==== SVG & LAYOUT  ====
    const barSvg = d3.select("#barChart");
    const brushSvg = d3.select("#timeBrush");

    const barWidth = +barSvg.attr("width");
    const barHeight = +barSvg.attr("height");

    const brushWidth = +brushSvg.attr("width");
    const brushHeight = +brushSvg.attr("height");

    const barMargin = { top: 20, right: 20, bottom: 40, left: 70 };
    const barInnerWidth = barWidth - barMargin.left - barMargin.right;
    const barInnerHeight = barHeight - barMargin.top - barMargin.bottom;

    const brushMargin = { top: 20, right: 20, bottom: 30, left: 50 };
    const brushInnerWidth = brushWidth - brushMargin.left - brushMargin.right;
    const brushInnerHeight = brushHeight - brushMargin.top - brushMargin.bottom;

    const barG = barSvg
        .append("g")
        .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

    const brushG = brushSvg
        .append("g")
        .attr("transform", `translate(${brushMargin.left},${brushMargin.top})`);

    // ==== SCALES  ====
    const xTime = d3.scaleTime().range([0, brushInnerWidth]); // for the brush
    const xBand = d3
        .scaleBand()
        .domain(valueColumns)
        .range([0, barInnerWidth])
        .padding(0.3); // for bar chart categories

    const yBar = d3.scaleLinear().range([barInnerHeight, 0]); // % change

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(valueColumns);

    // ==== AXES & ELEMENTS (Existing Code) ====
    const xTimeAxis = d3.axisBottom(xTime);
    const yBarAxis = d3.axisLeft(yBar).tickFormat(d => d + "%");

    brushG
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${brushInnerHeight})`);

    barG
        .append("g")
        .attr("class", "y-axis");

    const zeroLine = barG
        .append("line")
        .attr("class", "zero-line")
        .attr("stroke", "#444")
        .attr("stroke-dasharray", "4,3");

    const tooltip = d3
        .select("body")
        .append("div")
        // Tooltip styles...
        .style("position", "absolute")
        .style("padding", "6px 8px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const windowLabel = document.getElementById("windowLabel");

    // ====== PLAYBACK ANIMATION  ======
    let playing = false;
    let playInterval = null;

    const playButton = document.getElementById("playButton");
    
    // Playback functions (startPlayback, stopPlayback) remain the same.
    playButton.addEventListener("click", () => {
        if (playing) {
            stopPlayback();
        } else {
            startPlayback();
        }
    });

    function startPlayback() {
        playing = true;
        playButton.textContent = "⏸ Pause";

        // Step size in pixels
        const stepPx = 2; 
        
        playInterval = setInterval(() => {
            const sel = d3.brushSelection(brushSelection.node()); 
            if (!sel) return;

            let [x0, x1] = sel;

            // Calculate the total time range width in pixels
            const totalWidth = xTime.range()[1];
            
            // Check if moving forward would exceed the total width
            if (x1 + stepPx >= totalWidth) {
                stopPlayback();
                
                // OPTIONAL: Snap the brush to the end
                const duration = x1 - x0;
                brushSelection.call(brush.move, [totalWidth - duration, totalWidth]);
                
                return;
            }

            x0 += stepPx;
            x1 += stepPx;

            // Move the brush programmatically
            brushSelection.call(brush.move, [x0, x1]);
        }, 60); 
    }

    function stopPlayback() {
        playing = false;
        playButton.textContent = "▶ Play";

        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }


    // ==== LOAD DATA ====
    d3.csv(csvPath).then(data => {
        // Parse date + numerics
        data.forEach(d => {
            d[dateColumn] = new Date(d[dateColumn]);
            for (const col of valueColumns) {
                d[col] = +d[col];
            }
        });

        rawData = data;

        // Capture min/max dates
        [minDate, maxDate] = d3.extent(rawData, d => d[dateColumn]);

        // Initialize custom date inputs with the full range for clarity
        document.getElementById("startDateInput").value = dateToLocalISO(minDate);
        document.getElementById("endDateInput").value = dateToLocalISO(maxDate);

        // Set time domain
        xTime.domain([minDate, maxDate]);

        // Draw x axis for brush
        brushG.select(".x-axis").call(xTimeAxis);

        const maxByColumn = {};
        valueColumns.forEach(col => {
            maxByColumn[col] = d3.max(rawData, d => d[col]);
        });

        // For each series draw its own line in the brush area
        valueColumns.forEach(col => {
            const line = d3
                .line()
                .x(d => xTime(d[dateColumn]))
                .y(d => {
                    return (
                        brushInnerHeight -
                        (d[col] / maxByColumn[col]) * brushInnerHeight
                    );
                });

            brushG
                .append("path")
                .datum(rawData)
                .attr("fill", "none")
                .attr("stroke", color(col))
                .attr("stroke-width", 1)
                .attr("opacity", 0.7)
                .attr("d", line);
        });


        // ==== BRUSH SETUP ====
        // Assign to the global 'brush' variable
        brush = d3 
            .brushX()
            .extent([
                [0, 0],
                [brushInnerWidth, brushInnerHeight]
            ])
            .on("brush end", brushed); // <--- NOW USES "brush end" for continuous updates

        // Assign to the global 'brushSelection' variable
        brushSelection = brushG
            .append("g")
            .attr("class", "brush")
            .call(brush);

        // Set an initial window (middle 40% of the time range)
        const [x0, x1] = xTime.range();
        const initialSel = [
            x0 + (x1 - x0) * 0.3,
            x0 + (x1 - x0) * 0.7
        ];
        brushSelection.call(brush.move, initialSel);

        setTimeout(() => {
            document.getElementById("brushHelp").style.opacity = 1;
        }, 300);


        // ====== NEW DATE RANGE EVENT LISTENERS ======
        const dateRangeSelect = document.getElementById("date-range-select");
        const applyCustomButton = document.getElementById("applyCustomDate");
        const customDateInputs = document.getElementById("customDateInputs");
        
        // Custom inputs should be visible initially because the dropdown defaults to 'Custom Range'
        customDateInputs.style.display = 'flex'; 

        dateRangeSelect.addEventListener('change', (event) => {
            const value = event.target.value;
            
            // Toggle visibility of custom inputs
            customDateInputs.style.display = (value === 'custom') ? 'flex' : 'none';

            if (value === 'custom') {
                return; 
            }
            
            stopPlayback(); 

            let startDate, endDate = maxDate;

            if (value === 'all-time') {
                startDate = minDate;
            } else if (dateRangePresets[value]) {
                const duration = dateRangePresets[value];
                startDate = new Date(maxDate.getTime() - duration);
                if (startDate < minDate) {
                    startDate = minDate;
                }
            }

            if (startDate && endDate) {
                // Update the date inputs for transparency
                document.getElementById("startDateInput").value = dateToLocalISO(startDate);
                document.getElementById("endDateInput").value = dateToLocalISO(endDate);
                
                // Set the brush based on the calculated dates
                setBrushSelection(startDate, endDate);
            }
        });

        applyCustomButton.addEventListener('click', handleCustomApply);

        // Optional: Reset dropdown to 'custom' if date inputs are manually changed
        document.getElementById("startDateInput").addEventListener('change', () => {
            dateRangeSelect.value = 'custom';
            stopPlayback();
        });
        document.getElementById("endDateInput").addEventListener('change', () => {
            dateRangeSelect.value = 'custom';
            stopPlayback();
        });


        // Draw legend
        drawLegend();

        // ==== BRUSH HANDLER (Continuous Update Logic) ====
        function brushed({ selection, sourceEvent }) {
            // If it's undefined, it's a clear.
            if (!selection) {
                return;
            }
            
            // If the user drags the brush (sourceEvent exists) or it's the final 'end' event:
            if (sourceEvent) { 
                stopPlayback();
                document.getElementById("date-range-select").value = 'custom';
            }

            const [x0, x1] = selection;

            const startDate = xTime.invert(x0);
            const endDate = xTime.invert(x1);

            // Update the custom date inputs visually when the brush is moved
            document.getElementById("startDateInput").value = dateToLocalISO(startDate);
            document.getElementById("endDateInput").value = dateToLocalISO(endDate);

            // Call updateBars (Heavy operation) on every drag (the 'brush' event)
            updateBars(startDate, endDate);
        }
    });

    // ==== UPDATE BAR CHART BASED ON WINDOW  ====
    function updateBars(startDate, endDate) {
        if (!rawData) return;

        const windowData = rawData.filter(d => {
            const t = d[dateColumn];
            return t >= startDate && t <= endDate;
        });

        // Need at least 2 points to compute change
        if (windowData.length < 2) {
            // Remove bars and labels if there's not enough data
            barG.selectAll(".bar").remove();
            barG.selectAll(".bar-label").remove();
            windowLabel.textContent = `Window: Not enough data in range.`;
            return;
        }

        const first = windowData[0];
        const last = windowData[windowData.length - 1];

        // Compute % change for each series
        const seriesData = valueColumns.map(col => {
            const startVal = first[col];
            const endVal = last[col];
            let pct = null;

            if (startVal == null || !isFinite(startVal) || startVal === 0) {
                pct = null;
            } else {
                pct = ((endVal - startVal) / startVal) * 100;
            }

            return {
                key: col,
                pct
            };
        }).filter(d => d.pct != null);

        if (seriesData.length === 0) return;

        // Update window label
        const fmt = d3.timeFormat("%Y-%m-%d %H:%M");
        windowLabel.textContent =
            `Window: ${fmt(startDate)}  →  ${fmt(endDate)}`;

        // Y domain: padded around min/max
        const maxAbs = d3.max(seriesData, d => Math.abs(d.pct)) || 1;
        const pad = maxAbs * 0.2;
        yBar.domain([-(maxAbs + pad), +(maxAbs + pad)]);

        // Update y axis
        barG.select(".y-axis").call(yBarAxis);

        // Update zero line
        const zeroY = yBar(0);
        zeroLine
            .attr("x1", 0)
            .attr("x2", barInnerWidth)
            .attr("y1", zeroY)
            .attr("y2", zeroY);

        // DATA JOIN for bars
        const bars = barG
            .selectAll("rect.bar")
            .data(seriesData, d => d.key);

        bars
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xBand(d.key))
            .attr("width", xBand.bandwidth())
            .attr("fill", d => color(d.key))
            .attr("y", zeroY)
            .attr("height", 0)
            .on("mousemove", (event, d) => {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>${d.key}</strong><br>${d.pct.toFixed(2)}%`
                    )
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 28 + "px");
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
            })
            .merge(bars)
            .transition()
            .duration(250)
            .attr("x", d => xBand(d.key))
            .attr("width", xBand.bandwidth())
            .attr("y", d => {
                const v = d.pct;
                return v >= 0 ? yBar(v) : zeroY;
            })
            .attr("height", d => {
                const v = d.pct;
                return Math.abs(yBar(v) - zeroY);
            })
            .attr("fill", d => color(d.key));

        bars.exit().remove();

        // DATA JOIN for labels above bars
        const labels = barG
            .selectAll("text.bar-label")
            .data(seriesData, d => d.key);

        labels
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("text-anchor", "middle") // Center the text
            .attr("x", d => xBand(d.key) + xBand.bandwidth() / 2)
            .attr("y", d => (d.pct >= 0 ? yBar(d.pct) : zeroY) - 4)
            .text(d => d.pct.toFixed(1) + "%")
            .merge(labels)
            .transition()
            .duration(250)
            .attr("x", d => xBand(d.key) + xBand.bandwidth() / 2)
            .attr("y", d => (d.pct >= 0 ? yBar(d.pct) : zeroY) - 4)
            .text(d => d.pct.toFixed(1) + "%");

        labels.exit().remove();
    }

    // ==== LEGEND  ====
    function drawLegend() {
        const legend = d3.select("#legend");

        const items = legend
            .selectAll(".legend-item")
            .data(valueColumns)
            .enter()
            .append("div")
            .attr("class", "legend-item");

        items
            .append("div")
            .attr("class", "legend-swatch")
            .style("background-color", d => color(d));

        items.append("span").text(d => d);
    }