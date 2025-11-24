import pandas as pd
import matplotlib.pyplot as plt

# Filepaths for the CSV files
filepaths = [
    "/Users/willchiu/Documents/GitHub/Final-Project/data/SOLUSDT.csv",
    "/Users/willchiu/Documents/GitHub/Final-Project/data/ETHUSDT.csv",
    "/Users/willchiu/Documents/GitHub/Final-Project/data/DOGEUSDT.csv",
    "/Users/willchiu/Documents/GitHub/Final-Project/data/BTCUSDT.csv"
]

# Labels for each dataset
labels = ["SOLUSDT", "ETHUSDT", "DOGEUSDT", "BTCUSDT"]

# Function to normalize data
def normalize(series):
    return (series - series.min()) / (series.max() - series.min())

# Initialize a plot
plt.figure(figsize=(12, 6))

# Loop through each file and plot its data
for filepath, label in zip(filepaths, labels):
    # Read the CSV file
    df = pd.read_csv(filepath, header=None)
    
    # Extract timestamp and closing price (assuming column 0 is timestamp and column 4 is closing price)
    timestamps = pd.to_datetime(df[0], unit='ms')  # Convert timestamp to datetime
    closing_prices = df[4]
    
    # Normalize the closing prices
    normalized_prices = normalize(closing_prices)
    
    # Calculate a 7-day moving average
    moving_avg = normalized_prices.rolling(window=7).mean()
    
    # Plot normalized prices
    plt.plot(timestamps, normalized_prices, label=f"{label} (Normalized)")
    
    # Plot moving average
    plt.plot(timestamps, moving_avg, linestyle='--', label=f"{label} (7-day MA)")

# Add labels, legend, and title
plt.xlabel("Time")
plt.ylabel("Normalized Closing Price")
plt.title("Cryptocurrency Trends (Normalized with Moving Averages)")
plt.legend()
plt.grid()

# Show the plot
plt.savefig("/Users/willchiu/Documents/GitHub/Final-Project/cryptocurrency_trends.png", dpi=300, bbox_inches='tight')
plt.show()