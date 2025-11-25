import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// ---- 1. LOAD ALL 4 DATASETS ----
async function loadKlines(path) {
    const numeric = [
        "open", "high", "low", "close", "volume",
        "quote_asset_volume", "number_of_trades",
        "taker_buy_base_asset_volume", "taker_buy_quote_asset_volume"
    ];

    const data = await d3.csv(path, (row) => {
        // convert numerics
        for (const col of numeric) {
            row[col] = +row[col];
        }
        row.open_time = +row.open_time;
        row.close_time = +row.close_time;

        // convert to JS Date
        row.close_dt = new Date(row.close_time);

        return row;
    });

    return data;
}

const btc  = await loadKlines("data/BTCUSDT.csv");
const doge = await loadKlines("data/DOGEUSDT.csv");
const eth  = await loadKlines("data/ETHUSDT.csv");
const sol  = await loadKlines("data/SOLUSDT.csv");

// ---- 2. CALCULATE PROPORTIONAL MOVEMENT ----
function avgMovement(data) {
    const moves = data.map(d => Math.abs(d.close - d.open) / d.open);
    return d3.mean(moves) * 100;   // match Python scaling
}

const lw = {
    BTC:  avgMovement(btc),
    DOGE: avgMovement(doge),
    ETH:  avgMovement(eth),
    SOL:  avgMovement(sol),
};

// ---- 3. DRAW SVG ----
const margin = {top: 80, right: 50, bottom: 50, left: 70};
const width  = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// ---- 4. SCALES ----
const allData = [...btc, ...doge, ...eth, ...sol];

const x = d3.scaleTime()
    .domain(d3.extent(allData, d => d.close_dt))
    .range([0, width]);

const y = d3.scaleLinear()
    .domain(d3.extent(allData, d => d.close))
    .range([height, 0])
    .nice();

// ---- 5. AXES ----
g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

g.append("g")
    .call(d3.axisLeft(y));

// ---- 6. LINE GENERATOR ----
const line = d3.line()
    .x(d => x(d.close_dt))
    .y(d => y(d.close));

// ---- 7. DRAW LINES ----
function drawLine(data, name, color) {
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", lw[name])   // width from proportional movement
        .attr("d", line);
}

drawLine(btc,  "BTC",  "#f2a900");
drawLine(doge, "DOGE", "#c2c2c2");
drawLine(eth,  "ETH",  "#3c3c3d");
drawLine(sol,  "SOL",  "#00ffa3");

// ---- 8. TITLE + SUBTITLE ----
svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Cryptocurrency Close Prices Over Time");

svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Line thickness represents the average daily price movement of each crypto.");

// ---- 9. LEGEND ----
const legendData = [
    { name: "BTC",  color: "#f2a900" },
    { name: "DOGE", color: "#c2c2c2" },
    { name: "ETH",  color: "#3c3c3d" },
    { name: "SOL",  color: "#00ffa3" },
];

svg.append("g")
    .attr("transform", `translate(${width - 50}, 60)`)
    .selectAll("legend")
    .data(legendData)
    .enter()
    .append("text")
    .attr("y", (d,i) => i * 16)
    .attr("fill", d => d.color)
    .style("font-size", "12px")
    .text(d => d.name);