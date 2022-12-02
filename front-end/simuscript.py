# -*- coding: utf-8 -*-
"""
Created on Fri Oct 28 14:37:17 2022

@author: SStar
"""

import numpy as np
import pandas as pd
from js import getPrices, getSettings, putResults, updateTradingChart
    
def calculate(rev=False):
    prices = getPrices(rev)

    param = getSettings()
    gridUp = param.priceUp
    gridLow = param.priceLow
    gridNum = param.gridNum
    invest = param.invest
    direction = param.direction
    gridType = param.gridType
 #   timeRange = param.timeRange
    
    isAS=True if gridType=="A" else False
    
    print(f"u={gridUp}, l={gridLow}, n={gridNum}, i={invest}, d={direction}, t={gridType}, is={isAS}, r={rev}")

    # calculate grid
    if isAS:
        grid = np.linspace(gridLow,gridUp,gridNum+1)
    else:
        step = (gridUp/gridLow) ** (1/gridNum)
        grid = gridLow * (step ** np.arange(gridNum+1))

    amounts = invest/gridNum/grid[:-1]
    records = pd.DataFrame(0, index=np.arange(gridNum), columns=['buy', 'sell'])
    records['profit'] = np.diff(grid)

    # prepare position
    start_price = grid[np.argmin(abs(prices[0] - grid))]
    print(f"start price={start_price}")

    position_init = 0
    cost_init = 0
    if direction > 0:
        position_init = amounts[grid[1:] > start_price].sum()
        cost_init = position_init*prices[0] * -1
    elif direction < 0:
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
            traj_buy += [list(t) for t in zip([sample]*len(points_buy), grid[:-1][points_buy].tolist())]
        points_sell = np.where(rec_sell)[0]
        if len(points_sell)>0:
            traj_sell += [list(t) for t in zip([sample]*len(points_sell), grid[:-1][points_sell].tolist())]
        
        if rec_buy.sum() > 0:
            start_price = min(grid[:-1][rec_buy])
        elif rec_sell.sum() > 0:
            start_price = max(grid[1:][rec_sell])
        sample += 1

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

    print(f"profit: {profit_total} = {profit_grid}(grid) + {profit_posi}(posi)")
    
    # update result to html
    putResults(profit_total, profit_grid, profit_posi, trading_complete)
    #traj_buy = [[1, 83.0], [11, 83.0]]
    #traj_sell = [[11,60], [21,62]]
    updateTradingChart(traj_buy, traj_sell)
#    updateTradingChart()
#    Element("profitTotal1").element.textContent = f"${profit_total:.3f}"
#    Element("profitTotal2").element.textContent = f"{profit_total/invest/timeRange*365:.3%}"
#    Element("profitGrid1").element.textContent = f"${profit_grid:.3f}"
#    Element("profitGrid2").element.textContent = f"{profit_grid/invest/timeRange*365:.3%}"
#    Element("profitPos1").element.textContent = f"${profit_posi:.3f}"
#    Element("profitPos2").element.textContent = f"{profit_posi/invest/timeRange*365:.3%}"
#    Element("arbiNum1").element.textContent = f"{trading_complete}"
#    Element("arbiNum2").element.textContent = f"{trading_complete/timeRange:.0f}/Day"