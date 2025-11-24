import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Reusable loader for one CSV
async function loadOneDataset(path) {
    const data = d3.csv(path, (row) => {
        // convert columns to numeric
        for (const col of klineNums) {
          row[col] = +row[col];
        }
    });

    return data;
}

// Load all datasets at once
async function loadAllData() {
    const [btc, eth, doge, sol] = await Promise.all([
        loadOneDataset('data/BTCUSDT.csv'),
        loadOneDataset('data/ETHUSDT.csv'),
        loadOneDataset('data/DOGEUSDT.csv'),
        loadOneDataset('data/SOLUSDT.csv'),
    ]);

    return { btc, eth, doge, sol };
}

let data = await loadData();