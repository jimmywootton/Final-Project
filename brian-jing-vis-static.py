import pandas as pd, numpy as np
import seaborn as sbn
import matplotlib.pyplot as plt

kline_candlestick_columns = [
    'open_time', 'open', 'high', 'low', 'close', 'volume',
    'close_time', 'quote_asset_volume', 'number_of_trades',
    'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
]
#units: close_time = timestamp in ms since Jan 1, 1970 UTC

top_4_cryptos = pd.DataFrame([])

btc = pd.read_csv('Final-Project/data/BTCUSDT.csv', header=None)
btc.columns = kline_candlestick_columns
btc['close_time'] = pd.to_datetime(btc['close_time'], unit='ms')
print(btc[['close', 'close_time']].head())
doge = pd.read_csv('Final-Project/data/DOGEUSDT.csv', header=None)
doge.columns = kline_candlestick_columns
doge['close_time'] = pd.to_datetime(doge['close_time'], unit='ms')
print(doge[['close', 'close_time']].head())
eth = pd.read_csv('Final-Project/data/ETHUSDT.csv', header=None)
eth.columns = kline_candlestick_columns
eth['close_time'] = pd.to_datetime(eth['close_time'], unit='ms')
print(eth[['close', 'close_time']].head())
sol = pd.read_csv('Final-Project/data/SOLUSDT.csv', header=None)
sol.columns = kline_candlestick_columns
sol['close_time'] = pd.to_datetime(sol['close_time'], unit='ms')
print(sol[['close', 'close_time']].head())

btc['open'] = pd.to_numeric(btc['open'])
btc['close'] = pd.to_numeric(btc['close'])

doge['open'] = pd.to_numeric(doge['open'])
doge['close'] = pd.to_numeric(doge['close'])

eth['open'] = pd.to_numeric(eth['open'])
eth['close'] = pd.to_numeric(eth['close'])

sol['open'] = pd.to_numeric(sol['open'])
sol['close'] = pd.to_numeric(sol['close'])


"""
Eventually I will implement the left/right scrolling w/ dynamic line thickness w/ D3 and JS:
"""

#Start-end-of-day volatility (no regard for direction) as a percentage of the (opening) value:
btc_move = np.abs(btc['close'] - btc['open']) / btc['open']
scaled_btc_prop_movement = np.mean(btc_move) * 100
print(scaled_btc_prop_movement)
doge_move = np.abs(doge['close'] - doge['open']) / doge['open']
scaled_doge_prop_movement = np.mean(doge_move) * 100
print(scaled_doge_prop_movement)
eth_move  = np.abs(eth['close'] - eth['open']) / eth['open']
scaled_eth_prop_movement = np.mean(eth_move) * 100
print(scaled_eth_prop_movement)
sol_move  = np.abs(sol['close'] - sol['open']) / sol['open']
scaled_sol_prop_movement = np.mean(sol_move) * 100
print(scaled_sol_prop_movement)


plt.figure(figsize=(12,6))

plt.plot(btc['close_time'], btc['close'], 
         label='BTC', linewidth=(scaled_btc_prop_movement))

plt.plot(doge['close_time'], doge['close'], 
         label='DOGE', linewidth=(scaled_doge_prop_movement))

plt.plot(eth['close_time'], eth['close'], 
         label='ETH', linewidth=(scaled_eth_prop_movement))

plt.plot(sol['close_time'], sol['close'], 
         label='SOL', linewidth=(scaled_sol_prop_movement))

plt.text(
    0.5, 1.1,
    "Cryptocurrency Close Prices Over Time",
    fontsize=16,
    ha='center',
    va='bottom',
    transform=plt.gca().transAxes
)
plt.text(
    0.5, 1.02,
    "Line thickness represents the average daily price movement of each ETF.\n"
    "While the prices are vastly different, their proportional movement is, in the grand scheme of things, not.",
    fontsize=10,
    ha='center',
    va='bottom',
    transform=plt.gca().transAxes
)
plt.xlabel("Close Date")
plt.ylabel("Close Price")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()