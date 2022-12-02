/* globals Chart:false, feather:false */
class SimuData {
    constructor(timeRange) {
        this.symbol = "";
        this.labels = [];
        this.prices = [];
        this.trading = [];
        
        this.gridUp = 0;
        this.gridLow = 0;
        this.gridNum = 0;
        this.invest = 0;
        this.direction = 0;
        this.AS = true; // Arithmetic/Geometric sequence
        this.timeRange = timeRange;
    }
  
    updatePrices(data, coinName, timeRange) {
        this.labels = data[0];
        this.prices = data[1];
        this.symbol = coinName;
        this.timeRange = timeRange;
    }
    
    getPrices() {
        return this.prices;
    }
    
    getLabels() {
        return this.labels;
    }
    
    updateParam(param) {
        this.gridUp = param.priceUp;
        this.gridLow = param.priceLow;
        this.gridNum = param.gridNum;
        this.invest = param.invest;
        this.direction = param.direction;
        if (param.gridType=='A') {this.AS=true;} else {this.AS=false;}
    }
    
    getSimuData() {
        return [this.gridUp, this.gridLow, this.gridNum, this.invest, this.direction, this.AS, this.prices];
    }

}

function updateCalBtnState(disable) {
    document.getElementById('calReal').disabled = disable;
    document.getElementById('calInverse').disabled = disable;
    document.getElementById('interval').disabled = disable;
}


var ccxtWorker = new Worker("ccxtworker.js");

// load exchange COINs
function getCoinList() {

  if (typeof(Worker) !== "undefined") {
    // if the worker does not exist yet, creates it
    if (typeof(ccxtWorker) == "undefined") {
      ccxtWorker = new Worker("ccxtworker.js");
    }

    // send a message with loading coin list
    let msg = {header:"getCoins"};
    ccxtWorker.postMessage(msg);

    ccxtWorker.onmessage = function(event) {
        // every time the ccxtworker posts a message
        // this handler will be invoked
        handleReceivedList(event.data);
    };
  } else {
    console.log("main:", "show Alert");
    document.getElementById("errAlert").classList.add("d-inline");
  }
}

// create COINs list
function handleReceivedList(symbols) {
    console.log("main:", symbols);
    if (symbols=="ERR") {return;}
    
    const coinslist = document.querySelector('#coinsList');
    const coinShow = document.querySelector('#currCoin');

    var preCoin;
    symbols.forEach((coinName) => {
        let coinId = "coin_" + coinName.replace('/','-');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = coinId;
        btn.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'm-1');
        btn.innerHTML = coinName;
        btn.addEventListener("click", function () {
            btn.classList.add('active');
            btn.ariaPressed = true;

            var intRange = 30;
            
            if (coinName==simudata.symbol) {
                console.log("main:", "the same coinName, not get prices again");
                return;
            }
            updateCalBtnState(true);
            
            // send a message with loading coin list
            let msg = {header:"getPrices", symbol:coinName, range:intRange};
            ccxtWorker.postMessage(msg);
            ccxtWorker.onmessage = function(event) {
                // every time the ccxtworker posts a message
                // this handler will be invoked
                handleReceivedPrice(event.data, coinName,intRange);
            };

            if (preCoin) {
                let preBtn = document.querySelector('#'+preCoin);
                preBtn.classList.remove('active');
                btn.ariaPressed = false;
            }
            preCoin = coinId;
            
            updateCalBtnState(false);
        });
        coinslist.appendChild(btn);
    });
    
    updateCalBtnState(false);
}

function handleReceivedPrice(prices, coinName, range) {
    //console.log("main:", prices);
    updatePriceChart(prices);
    simudata.updatePrices(prices, coinName, range);
    //temp
    updateTradingChart();
}

function changeTF(node, range) {
    // set active class
    document.getElementById("range30").classList.remove("active");
    document.getElementById("range15").classList.remove("active");
    document.getElementById("range7").classList.remove("active");
    node.classList.add("active");
    
    if (range==simudata.timeRange) {
        console.log("main:", "the same time range, not get prices again");
        return;
    }
    updateCalBtnState(true);
    
    // send a message with loading coin list
    let msg = {header:"getPrices", symbol:simudata.symbol, range:range};
    ccxtWorker.postMessage(msg);
    ccxtWorker.onmessage = function(event) {
        // every time the ccxtworker posts a message
        // this handler will be invoked
        handleReceivedPrice(event.data, simudata.symbol, range);
    };
    
    updateCalBtnState(false);
}

function putResults(profit_total, profit_grid, profit_posi, trading_complete) {
    console.log("main:", "profile t-g-p = " + profit_total + "-" + profit_grid + "-" + profit_posi + ", trading = " + trading_complete);
    
    let invest = simudata.invest;
    let timeRange = simudata.timeRange;
    console.log("main:", "invest=" + invest + ", timeRange=" + timeRange);
    
    document.getElementById("profitTotal1").textContent = profit_total.toFixed(2);
    document.getElementById("profitTotal2").textContent = (profit_total/invest/timeRange*365).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
    document.getElementById("profitGrid1").textContent = profit_grid.toFixed(2);
    document.getElementById("profitGrid2").textContent = (profit_grid/invest/timeRange*365).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
    document.getElementById("profitPos1").textContent = profit_posi.toFixed(2);
    document.getElementById("profitPos2").textContent = (profit_posi/invest/timeRange*365).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
    document.getElementById("arbiNum1").textContent = trading_complete.toString();
    document.getElementById("arbiNum2").textContent = (trading_complete/timeRange).toFixed(1) +"/Day";
}

function stopWorker() {
  if (ccxtWorker !== undefined) {
    ccxtWorker.terminate();
    ccxtWorker = undefined;
  }
}

function initPriceChart() {
    feather.replace({ 'aria-hidden': 'true' });

    // Graphs
    const ctx = document.getElementById('myChart');
    // eslint-disable-next-line no-unused-vars
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                lineTension: 0,
                backgroundColor: 'transparent',
                borderColor: '#007bff',
                borderWidth: 4,
                pointBackgroundColor: '#007bff'
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: false
                    }
                }]
            },
            legend: {
                display: false
            }
        }
    });
    
    return myChart;
}

function updatePriceChart(data) {
    if (chart == undefined) {
        const chart = initPriceChart();
    }

    let newdata = {
        labels: data[0],
        datasets: [{
            data: data[1],
            lineTension: 0,
            pointRadius: 0,
            pointHoverRadius: 2,
            backgroundColor: 'transparent',
            borderColor: '#007bff',
            borderWidth: 2,
            pointBackgroundColor: '#007bff'
        }]
    };
    chart.data = newdata;
    chart.update();
}

function updateTradingChart() {
    buy = [[1,60],[10,50]];
    sell = [[2,77],[13,65]];
    
    console.log("main", "buy: " + buy);
    console.log("main", "sell: " + sell);
    
    let labels = simudata.getLabels();
    
    let buyArr = [];
    let sellArr = [];
    buy.forEach((val, idx) => { buyArr[idx]={x: labels[val[0]], y: val[1]};});
    sell.forEach((val, idx) => { sellArr[idx]={x: labels[val[0]], y: val[1]};});
    
    var buyChart = {
        type: 'scatter',
        backgroundColor: 'red',
        data: buyArr
    };
    var sellChart = {
        type: 'scatter',
        backgroundColor: 'green',
        data: sellArr
    };
    
    if (chart == undefined) {
        const chart = initPriceChart();
    }
    chart.data.datasets.push(buyChart);
    chart.data.datasets.push(sellChart);
    
    chart.update();
}

function reverseAct() {
    let data = [simudata.getLabels(),simudata.getPrices().slice().reverse()];
    updatePriceChart(data);
}

// Simulation
function getSettings() {
    let priceUp = parseFloat( document.getElementById('upper').value );
    let priceLow = parseFloat( document.getElementById('lower').value );
    let gridNum = parseInt( document.getElementById('gridNum').value );
    let invest = parseFloat( document.getElementById('invest').value );
    let direction = parseInt( document.getElementById('direction').value );
    let gridType = document.getElementById('gridType').value;
    console.log("main:", {priceUp, priceLow, gridNum, invest, direction, gridType});
    
    let param = {priceUp, priceLow, gridNum, invest, direction, gridType};
    simudata.updateParam(param);
    return param;
}

function getPrices() {
    let prices = simudata.prices;
    console.log("main:", prices);
    return prices;
}

// Main

const simudata = new SimuData(30);

getCoinList();

const chart = initPriceChart();

/*let param = getSettings();
console.log("main:", param);
simudata.updateParam(param);

[gridUp, gridLow, gridNum, invest, direction, isAS, prices] = simudata.getSimuData();*/