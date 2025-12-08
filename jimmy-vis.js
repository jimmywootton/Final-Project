import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    // ==== CONFIG ====
    const csvPath = "data/timeseries.csv";
    const dateColumn = "time";
    const selectedValueColumns = [
        "BTCUSDT_Open",
        "ETHUSDT_Open",
        "SOLUSDT_Open",
        "DOGEUSDT_Open"
    ];
    const valueColumns = [
        "BTCUSDT_Open",
        "ETHUSDT_Open",
        "SOLUSDT_Open",
        "DOGEUSDT_Open"
    ];

    // ==== SVG & LAYOUT ====
    const barSvg = d3.select("#barChart");
    const brushSvg = d3.select("#timeBrush");

    const barWidth = +barSvg.attr("width");
    const barHeight = +barSvg.attr("height");

    // Allowing the bar chart to scale down to fix the flexbox container:
    barSvg
        .attr("viewBox", `0 0 ${barWidth} ${barHeight}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("min-width", "0"); // Allows flexbox to shrink it below its content size

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

    // ==== SCALES ====
    const xTime = d3.scaleTime().range([0, brushInnerWidth]); // for the brush
    const xBand = d3
        .scaleBand()
        .domain(valueColumns)
        .range([0, barInnerWidth])
        .padding(0.3); // for bar chart categories

    const yBar = d3.scaleLinear().range([barInnerHeight, 0]); // % change

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(valueColumns);

    // ==== AXES ====
    const xTimeAxis = d3.axisBottom(xTime);
    const yBarAxis = d3.axisLeft(yBar).tickFormat(d => d + "%");

    brushG
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${brushInnerHeight})`);

    barG
        .append("g")
        .attr("class", "y-axis");

    // Zero line for bar chart
    const zeroLine = barG
        .append("line")
        .attr("class", "zero-line")
        .attr("stroke", "#444")
        .attr("stroke-dasharray", "4,3");

    // Tooltip (for bars)
    const tooltip = d3
        .select("body")
        .append("div")
        .style("position", "absolute")
        .style("padding", "6px 8px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const windowLabel = document.getElementById("windowLabel");

    let rawData;

    // ==== LOAD DATA ====
    d3.csv(csvPath).then(data => {
        // Parse date + numerics
        data.forEach(d => {
            // If your "time" is a timestamp (ms) instead of ISO string, use:
            // d[dateColumn] = new Date(+d[dateColumn]);
            d[dateColumn] = new Date(d[dateColumn]);
            for (const col of valueColumns) {
                d[col] = +d[col];
            }
        });

        rawData = data;

        // Set time domain
        xTime.domain(d3.extent(rawData, d => d[dateColumn]));

        // Draw x axis for brush
        brushG.select(".x-axis").call(xTimeAxis);

        // Optional: draw a line for one series in the brush area (e.g., BTC)

        const maxByColumn = {};
        valueColumns.forEach(col => {
            maxByColumn[col] = d3.max(rawData, d => d[col]);
        });

        // For each series draw its own line
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
                .attr("stroke", color(col))   // consistent coloring with main chart
                .attr("stroke-width", 1)
                .attr("opacity", 0.7)
                .attr("d", line);
        });



        // ==== BRUSH ====
        const brush = d3
            .brushX()
            .extent([
                [0, 0],
                [brushInnerWidth, brushInnerHeight]
            ])
            .on("brush end", brushed);

        const brushSelection = brushG
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

        // After brushSelection.call(brush.move, initialSel);

        setTimeout(() => {
            document.getElementById("brushHelp").style.opacity = 1;
        }, 300);


        // ====== PLAYBACK ANIMATION ======

        let playing = false;
        let playInterval = null;

        const playButton = document.getElementById("playButton");

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

            // How far the window moves each step (in px)
            const stepPx = 2;

            playInterval = setInterval(() => {
                const sel = d3.brushSelection(brushSelection.node());
                if (!sel) return;

                let [x0, x1] = sel;

                // Move window
                x0 += stepPx;
                x1 += stepPx;

                // If we run off the right edge, stop playback
                if (x1 > brushInnerWidth) {
                    stopPlayback();
                    return;
                }

                // Apply new window
                brushSelection.call(brush.move, [x0, x1]);
            }, 60); // Slow speed (16–20ms = fast; 60 = smooth+slow)
        }

        function stopPlayback() {
            playing = false;
            playButton.textContent = "▶ Play";

            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
            }
        }


        // Draw legend
        drawLegend();

        // ==== BRUSH HANDLER ====
        function brushed({ selection }) {
            if (!selection) {
                // If user clears selection, do nothing
                return;
            }

            const [x0, x1] = selection;

            const startDate = xTime.invert(x0);
            const endDate = xTime.invert(x1);

            updateBars(startDate, endDate);
        }
    });

    // ==== UPDATE BAR CHART BASED ON WINDOW ====
    function updateBars(startDate, endDate) {
        if (!rawData) return;

        const windowData = rawData.filter(d => {
            const t = d[dateColumn];
            return t >= startDate && t <= endDate;
        });

        // Need at least 2 points to compute change
        if (windowData.length < 2) {
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
        const fmtDate = d3.timeFormat("%Y-%m-%d");
        const fmtTime = d3.timeFormat("%H:%M");
        if (windowLabel) {
            windowLabel.innerHTML = `Time Range:<br>
            <strong>${fmtDate(startDate)}</strong> (${fmtTime(startDate)}) 
            &nbsp;→&nbsp; 
            <strong>${fmtDate(endDate)}</strong> (${fmtTime(endDate)})`;
        }

        // Y domain: padded around min/max
        // 1. Find max absolute percent move
        const maxAbs = d3.max(seriesData, d => Math.abs(d.pct)) || 1;

        // 2. Pad it a bit
        const pad = maxAbs * 0.2;

        // 3. Force zero in the middle
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

    // ==== LEGEND ====
    function drawLegend() {
        const legend = d3.select("#legend");
        
        // Adding outline:
        legend
            .style("border", "1px solid #333")
            .style("border-radius", "4px")
            .style("padding", "15px")
            .style("background-color", "white")
            .style("display", "inline-block")
            .style("vertical-align", "top") // Ensure top alignment
            .style("margin-left", "20px")   // Ensure spacing from chart
            .style("box-shadow", "2px 2px 5px rgba(0,0,0,0.1)");
        
        // Clearing duplicate items if re-run:
        legend.selectAll(".legend-item").remove();
        legend.selectAll(".legend-title").remove();

        // Adding legend title:
        legend.append("div")
            .attr("class", "legend-title")
            .text("Cryptocurrency") // <--- Your Title Here
            .style("font-weight", "bold")
            .style("font-family", "sans-serif")
            .style("margin-bottom", "10px")
            .style("font-size", "16px")
            .style("border-bottom", "1px solid #eee") // Optional: adds a separator line
            .style("padding-bottom", "5px");

        const items = legend
            .selectAll(".legend-item")
            .data(valueColumns)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "flex")            // Align swatch and text horizontally
            .style("align-items", "center")
            .style("margin-bottom", "8px");

        items
            .append("div")
            .attr("class", "legend-swatch")
            .style("width", "15px")
            .style("height", "15px")
            .style("margin-right", "8px")
            .style("border-radius", "3px")
            .style("background-color", d => color(d)); // Uses schemeTableau10, and just includes the name of the coin
        
        // Adding the text elements:
        items.append("span")
            .text(d => d.replace("USDT_Open", ""))
            .style("font-size", "14px")
            .style("font-family", "sans-serif");
    }