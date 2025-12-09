import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// ==== CONFIG ====
const csvPath = "data/timeseries.csv";
const dateColumn = "time";

// All available coins
const allValueColumns = [
    "ADAUSDT_Open",
    "BNBUSDT_Open",
    "BTCUSDT_Open",
    "DOGEUSDT_Open",
    "ETHUSDT_Open",
    "LINKUSDT_Open",
    "SOLUSDT_Open",
    "TRXUSDT_Open",
    "XRPUSDT_Open"
];

// Initially selected coins
let selectedValueColumns = [
    "BTCUSDT_Open",
    "DOGEUSDT_Open",
    "ETHUSDT_Open",
];

// ==== SVG & LAYOUT ====
const barSvg = d3.select("#barChart");
const brushSvg = d3.select("#timeBrush");

const barWidth = +barSvg.attr("width");
const barHeight = +barSvg.attr("height");

barSvg
    .attr("viewBox", `0 0 ${barWidth} ${barHeight}`)
    .style("width", "100%")
    .style("height", "auto")
    .style("min-width", "0");

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
const xTime = d3.scaleTime().range([0, brushInnerWidth]);
const xBand = d3.scaleBand().range([0, barInnerWidth]).padding(0.3);

const yBar = d3.scaleLinear().range([barInnerHeight, 0]);

const color = d3.scaleOrdinal(d3.schemeTableau10).domain(allValueColumns);

// ==== AXES ====
const xTimeAxis = d3.axisBottom(xTime);
const yBarAxis = d3.axisLeft(yBar).tickFormat(d => d + "%");

brushG
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${brushInnerHeight})`);

barG.append("g").attr("class", "y-axis");

const zeroLine = barG
    .append("line")
    .attr("class", "zero-line")
    .attr("stroke", "#444")
    .attr("stroke-dasharray", "4,3");

// Tooltip
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
let brush;
let brushSelection;
let playing = false;
let playInterval = null;

// ==== CREATE DATE RANGE SELECTOR ====
function createDateRangeSelector() {
    const container = d3.select("#coinSelector");
    
    // Add date range controls after the coin checkboxes
    const dateControls = container
        .append("div")
        .attr("id", "dateRangeControls")
        .style("margin-top", "20px")
        .style("padding-top", "15px")
        .style("border-top", "2px solid #ddd");
    
    dateControls
        .append("h3")
        .style("margin-bottom", "10px")
        .text("Custom Date Range:");
    
    const dateInputs = dateControls
        .append("div")
        .style("display", "flex")
        .style("gap", "15px")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("flex-wrap", "wrap");
    
    // Start date input
    const startGroup = dateInputs
        .append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "5px");
    
    startGroup
        .append("label")
        .attr("for", "startDate")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .text("Start Date:");
    
    const startInput = startGroup
        .append("input")
        .attr("type", "date")
        .attr("id", "startDate")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("font-size", "14px");
    
    // End date input
    const endGroup = dateInputs
        .append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "5px");
    
    endGroup
        .append("label")
        .attr("for", "endDate")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .text("End Date:");
    
    const endInput = endGroup
        .append("input")
        .attr("type", "date")
        .attr("id", "endDate")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("font-size", "14px");
    
    // Apply button
    dateInputs
        .append("button")
        .attr("id", "applyDateRange")
        .style("padding", "8px 20px")
        .style("background-color", "#4CAF50")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .style("align-self", "flex-end")
        .text("Apply Range")
        .on("click", applyCustomDateRange);
    
    // Reset button
    dateInputs
        .append("button")
        .attr("id", "resetDateRange")
        .style("padding", "8px 20px")
        .style("background-color", "#f44336")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("font-size", "14px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .style("align-self", "flex-end")
        .text("Reset")
        .on("click", resetDateRange);
    
    // Set initial values based on data range
    if (rawData && rawData.length > 0) {
        const extent = d3.extent(rawData, d => d[dateColumn]);
        const formatDate = d3.timeFormat("%Y-%m-%d");
        
        startInput.property("value", formatDate(extent[0]));
        endInput.property("value", formatDate(extent[1]));
        
        // Set min/max attributes
        startInput.attr("min", formatDate(extent[0]));
        startInput.attr("max", formatDate(extent[1]));
        endInput.attr("min", formatDate(extent[0]));
        endInput.attr("max", formatDate(extent[1]));
    }
}

function applyCustomDateRange() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    
    if (!startInput.value || !endInput.value) {
        alert("Please select both start and end dates");
        return;
    }
    
    // Parse dates in local timezone by appending time
    const startDate = new Date(startInput.value + "T00:00:00");
    const endDate = new Date(endInput.value + "T23:59:59");
    
    if (startDate >= endDate) {
        alert("Start date must be before end date");
        return;
    }
    
    // Convert dates to brush positions
    const x0 = xTime(startDate);
    const x1 = xTime(endDate);
    
    // Clamp to valid range
    const clampedX0 = Math.max(0, Math.min(brushInnerWidth, x0));
    const clampedX1 = Math.max(0, Math.min(brushInnerWidth, x1));
    
    if (clampedX0 >= clampedX1) {
        alert("Selected date range is outside available data");
        return;
    }
    
    // Apply the brush selection
    brushSelection.call(brush.move, [clampedX0, clampedX1]);
}

function resetDateRange() {
    if (!rawData || rawData.length === 0) return;
    
    const extent = d3.extent(rawData, d => d[dateColumn]);
    const formatDate = d3.timeFormat("%Y-%m-%d");
    
    document.getElementById("startDate").value = formatDate(extent[0]);
    document.getElementById("endDate").value = formatDate(extent[1]);
    
    // Reset brush to middle 40%
    const [x0, x1] = xTime.range();
    const initialSel = [
        x0 + (x1 - x0) * 0.3,
        x0 + (x1 - x0) * 0.7
    ];
    brushSelection.call(brush.move, initialSel);
}

// ==== CREATE COIN SELECTOR ====
function createCoinSelector() {
    const selectorContainer = d3.select("#coinSelector");
    
    const checkboxes = selectorContainer
        .selectAll(".coin-checkbox")
        .data(allValueColumns)
        .enter()
        .append("label")
        .attr("class", "coin-checkbox")
        .style("display", "inline-block")
        .style("margin", "5px 10px")
        .style("cursor", "pointer");
    
    checkboxes
        .append("input")
        .attr("type", "checkbox")
        .attr("value", d => d)
        .property("checked", d => selectedValueColumns.includes(d))
        .on("change", function(event, d) {
            if (this.checked) {
                if (!selectedValueColumns.includes(d)) {
                    selectedValueColumns.push(d);
                }
            } else {
                selectedValueColumns = selectedValueColumns.filter(col => col !== d);
            }
            
            // Ensure at least one coin is selected
            if (selectedValueColumns.length === 0) {
                this.checked = true;
                selectedValueColumns.push(d);
                alert("At least one cryptocurrency must be selected!");
                return;
            }
            
            updateVisualization();
        });
    
    checkboxes
        .append("span")
        .style("margin-left", "5px")
        .style("padding", "2px 8px")
        .style("border-radius", "3px")
        .style("background-color", d => color(d))
        .style("color", "white")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .text(d => d.replace("USDT_Open", ""));
}

// ==== LOAD DATA ====
d3.csv(csvPath).then(data => {
    data.forEach(d => {
        d[dateColumn] = new Date(d[dateColumn]);
        for (const col of allValueColumns) {
            d[col] = +d[col];
        }
    });

    rawData = data;
    xTime.domain(d3.extent(rawData, d => d[dateColumn]));
    
    // Create coin selector
    createCoinSelector();
    
    xBand.domain(selectedValueColumns);
    // Create date range selector
    createDateRangeSelector();
    
    // Initial setup
    setupBrush();
    drawBrushLines();
    drawLegend();
    
    brushG.select(".x-axis").call(xTimeAxis);
    
    // Set initial brush selection
    const [x0, x1] = xTime.range();
    const initialSel = [
        x0 + (x1 - x0) * 0.3,
        x0 + (x1 - x0) * 0.7
    ];
    brushSelection.call(brush.move, initialSel);
});

// ==== SETUP BRUSH ====
function setupBrush() {
    brush = d3
        .brushX()
        .extent([
            [0, 0],
            [brushInnerWidth, brushInnerHeight]
        ])
        .on("brush end", brushed);

    brushSelection = brushG
        .append("g")
        .attr("class", "brush")
        .call(brush);
}

// ==== DRAW BRUSH LINES ====
function drawBrushLines() {
    // Remove old lines
    brushG.selectAll("path.coin-line").remove();
    
    const maxByColumn = {};
    selectedValueColumns.forEach(col => {
        maxByColumn[col] = d3.max(rawData, d => d[col]);
    });

    selectedValueColumns.forEach(col => {
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
            .attr("class", "coin-line")
            .datum(rawData)
            .attr("fill", "none")
            .attr("stroke", color(col))
            .attr("stroke-width", 1)
            .attr("opacity", 0.7)
            .attr("d", line);
    });
}

// ==== UPDATE VISUALIZATION ====
function updateVisualization() {
    // Update band scale domain
    xBand.domain(selectedValueColumns);
    
    // Redraw brush lines
    drawBrushLines();
    
    // Redraw legend
    drawLegend();
    
    // Update bars with current brush selection
    const sel = d3.brushSelection(brushSelection.node());
    if (sel) {
        const [x0, x1] = sel;
        const startDate = xTime.invert(x0);
        const endDate = xTime.invert(x1);
        updateBars(startDate, endDate);
    }
}

// ==== BRUSH HANDLER ====
function brushed({ selection }) {
    if (!selection) return;

    const [x0, x1] = selection;
    const startDate = xTime.invert(x0);
    const endDate = xTime.invert(x1);

    // Update the date inputs to reflect current brush selection
    const formatDate = d3.timeFormat("%Y-%m-%d");
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    
    if (startInput && endInput) {
        startInput.value = formatDate(startDate);
        endInput.value = formatDate(endDate);
    }

    updateBars(startDate, endDate);
}

// ==== UPDATE BAR CHART ====
function updateBars(startDate, endDate) {
    if (!rawData) return;

    const windowData = rawData.filter(d => {
        const t = d[dateColumn];
        return t >= startDate && t <= endDate;
    });

    if (windowData.length < 2) return;

    const first = windowData[0];
    const last = windowData[windowData.length - 1];

    const seriesData = selectedValueColumns.map(col => {
        const startVal = first[col];
        const endVal = last[col];
        let pct = null;

        if (startVal == null || !isFinite(startVal) || startVal === 0) {
            pct = null;
        } else {
            pct = ((endVal - startVal) / startVal) * 100;
        }

        return { key: col, pct };
    }).filter(d => d.pct != null);

    if (seriesData.length === 0) return;

    const fmtDate = d3.timeFormat("%Y-%m-%d");
    const fmtTime = d3.timeFormat("%H:%M");
    if (windowLabel) {
        windowLabel.innerHTML = `Time Range:<br>
        <strong>${fmtDate(startDate)}</strong> (${fmtTime(startDate)}) 
        &nbsp;→&nbsp; 
        <strong>${fmtDate(endDate)}</strong> (${fmtTime(endDate)})`;
    }

    const maxAbs = d3.max(seriesData, d => Math.abs(d.pct)) || 1;
    const pad = maxAbs * 0.2;
    yBar.domain([-(maxAbs + pad), +(maxAbs + pad)]);

    barG.select(".y-axis").call(yBarAxis);
    barG.selectAll(".y-axis .tick text")
        .filter(function() {
            return !isNaN(parseFloat(this.textContent.trim()));
        })
        .style("font-size", "18px")
        .style("font-weight", "400");

    const zeroY = yBar(0);
    zeroLine
        .attr("x1", 0)
        .attr("x2", barInnerWidth)
        .attr("y1", zeroY)
        .attr("y2", zeroY);

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
                .html(`<strong>${d.key}</strong><br>${d.pct.toFixed(2)}%`)
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

    const labels = barG
        .selectAll("text.bar-label")
        .data(seriesData, d => d.key);

    labels
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => xBand(d.key) + xBand.bandwidth() / 2)
        .attr("y", d => (d.pct >= 0 ? yBar(d.pct) : zeroY) - 4)
        .style("font-size", "24px")
        .style("font-weight", "600")
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
    
    legend
        .style("border", "1px solid #333")
        .style("border-radius", "4px")
        .style("padding", "15px")
        .style("background-color", "white")
        .style("display", "inline-block")
        .style("vertical-align", "top")
        .style("margin-left", "20px")
        .style("box-shadow", "2px 2px 5px rgba(0,0,0,0.1)");
    
    legend.selectAll(".legend-item").remove();
    legend.selectAll(".legend-title").remove();

    legend.append("div")
        .attr("class", "legend-title")
        .text("Selected Coins")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .style("margin-bottom", "10px")
        .style("font-size", "16px")
        .style("border-bottom", "1px solid #eee")
        .style("padding-bottom", "5px");

    const items = legend
        .selectAll(".legend-item")
        .data(selectedValueColumns)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "8px");

    items
        .append("div")
        .attr("class", "legend-swatch")
        .style("width", "15px")
        .style("height", "15px")
        .style("margin-right", "8px")
        .style("border-radius", "3px")
        .style("background-color", d => color(d));
    
    items.append("span")
        .text(d => d.replace("USDT_Open", ""))
        .style("font-size", "14px")
        .style("font-family", "sans-serif");
}

// ==== PLAYBACK ANIMATION ====
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

    const stepPx = 2;

    playInterval = setInterval(() => {
        const sel = d3.brushSelection(brushSelection.node());
        if (!sel) return;

        let [x0, x1] = sel;
        x0 += stepPx;
        x1 += stepPx;

        if (x1 > brushInnerWidth) {
            stopPlayback();
            return;
        }

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