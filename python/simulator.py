# -*- coding: utf-8 -*-
"""
Created on Fri Oct 28 14:37:17 2022

@author: User
"""
import ccxt
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

## Get Data
def DataPrice(t, d):
    if d > 0:
        return np.sin(0.1*np.pi*t)*5 + 0.2*t + 12
    elif d < 0:
        return np.cos(0.1*np.pi*t)*5 - 0.2*t + 45
    else:
        return np.cos(0.1*np.pi*t)*5 + 30

def getRealPrice(limit = 7*24, symbol = "BTC/USD"):
    
    exchange  = ccxt.ftx({
        'verbose': False,
        'enableRateLimit': True
    })
    exchange_markets = exchange.load_markets()
    response = exchange.fetch_ohlcv (symbol, '1h', None, limit)
    data = np.array(response)
    prices = data[:,4]
    
    return prices

SimulateDirect = 1 # -1:low, 0:flat, 1:high
duration = int(7*24*60/60)
t1 = np.arange(duration)
prices = DataPrice(t1, SimulateDirect)
# prices = getRealPrice(duration)


## Set Grid Trader parameters
# PriceHigh = 22000
# PriceLow = 18000
# GridNum = 400
PriceHigh = 50
PriceLow = 10
GridNum = 40
Invest = 800
Direction = 1   # -1:short, 0:neutral, 1:long
Type = 'Geometric' # Arithmetic/Geometric sequence

# calculate grid
if Type == 'Geometric':
    step = (PriceHigh/PriceLow) ** (1/GridNum)
    grid = PriceLow * (step ** np.arange(GridNum+1))
else:
    grid = np.linspace(PriceLow,PriceHigh,GridNum+1)
    
amounts = Invest/GridNum/grid[:-1]
records = pd.DataFrame(0, index=np.arange(GridNum), columns=['buy', 'sell'])
records['profit'] = np.diff(grid)

plt.figure()
plt.plot(t1, prices)
tt, grid_plt = np.meshgrid(t1,grid)
plt.plot(tt.T, grid_plt.T, alpha=0.5)
plt.grid(axis = 'x')

# prepare position
start_price = grid[np.argmin(abs(prices[0] - grid))]
print(f"start price={start_price}")

position_init = 0
cost_init = 0
if Direction > 0:
    position_init = amounts[grid[1:] > start_price].sum()
    cost_init = position_init*prices[0] * -1
elif Direction < 0:
    position_init = amounts[grid[:-1] < start_price].sum() * -1
    cost_init = position_init*prices[0] * -1
    

# calculate trading
traj_buy = []
traj_sell = []
sample = 1
for pri in prices[1:]:
    rec_buy = ((pri <= grid[:-1]) & (start_price > grid[:-1]))
    records['buy'] += rec_buy.astype(int)
    rec_sell = ((pri >= grid[1:]) & (start_price < grid[1:]))
    records['sell'] += rec_sell.astype(int)
    
    # for plot
    points_buy = np.where(rec_buy)[0]
    if len(points_buy)>0:
        # traj_buy += list(zip([sample]*len(points_buy), grid[:-1][points_buy].tolist()))
        traj_buy += [list(t) for t in zip([sample]*len(points_buy), grid[:-1][points_buy].tolist())]
    for p in points_buy:
        plt.scatter(sample, grid[:-1][p], c='r', marker='s')
    points_sell = np.where(rec_sell)[0]
    if len(points_sell)>0:
        # traj_sell += list(zip([sample]*len(points_sell), grid[:-1][points_sell].tolist()))
        traj_sell += [list(t) for t in zip([sample]*len(points_sell), grid[:-1][points_sell].tolist())]
    for p in points_sell:
        plt.scatter(sample, grid[1:][p], c='g', marker='d')
    
    if rec_buy.sum() > 0:
        start_price = min(grid[:-1][rec_buy])
    elif rec_sell.sum() > 0:
        start_price = max(grid[1:][rec_sell])
    sample += 1

# plot


# calculate profit
print(records[['buy','sell']].sum())
records['profGrid'] = records[['buy','sell']].min(axis=1)*records['profit']*amounts
records['balance'] = (records['sell'] - records['buy'])*grid[:-1]*amounts
records['position'] = (records['buy'] - records['sell'])*amounts

trading_complete = records[['buy','sell']].min(axis=1).sum()
print(f"trading closed num: {trading_complete}|{trading_complete/7:.0f}")

position_trade = records['position'].sum()
value_position = (position_trade + position_init) * prices[-1]
balance_trade = records['balance'].sum()
value_balance = balance_trade + cost_init
profit_total = value_balance + value_position
profit_grid = records['profGrid'].sum()
profit_posi = profit_total - profit_grid
print(f"balance trade|remain: {balance_trade}|{value_balance}")
print(f"position init|trade|remain: {position_init}|{position_trade}|{value_position}")
print(f"profit: {profit_total:.3f} = {profit_grid:.3f}(grid) + {profit_posi:.3f}(posi)")
print(f"profit%: {profit_total/Invest/7*365:.3%} = {profit_grid/Invest/7*365:.3%}(grid) + {profit_posi/Invest/7*365:.3%}(posi)")
    