/* globals Chart:false, feather:false */
class SimuData {
    constructor(timeRange) {
        this.symbol = "";
        this.labels = [];
        this.prices = [];
        this.pricesRev = [];
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
        this.pricesRev = Array.from(data[1]).reverse();
        this.symbol = coinName;
        this.timeRange = timeRange;
    }
    
    getPrices(rev = false) {
        console.log("main", "rev flag:" + rev);
        if (rev) {
            return this.pricesRev;
        }
        else {
            return this.prices;
        }
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
            
            //updateCalBtnState(false);
            coinShow.innerHTML = coinName;
            //coinShow.classList.remove("spinner-grow", "spinner-grow-sm");
        });
        coinslist.appendChild(btn);
    });
    
    //updateCalBtnState(false);
    coinShow.innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>Coin';
    //coinShow.classList.remove("spinner-border", "spinner-border-sm");
    //coinShow.classList.add("spinner-grow", "spinner-grow-sm");
}

function handleReceivedPrice(prices, coinName, range) {
    //console.log("main:", prices);
    updatePriceChart(prices);
    simudata.updatePrices(prices, coinName, range);
    updateCalBtnState(false);
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
    
    //updateCalBtnState(false);
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

function updateTradingChart(traj_buy, traj_sell) {
//    console.log("main", "buy: " + Array.from(traj_buy));
//    console.log("main", "sell: " + Array.from(traj_sell));
    
    let labels = simudata.getLabels();
    
    let buyArr = [];
    let sellArr = [];
    Array.from(traj_buy).forEach((val, idx) => { arr=Array.from(val); buyArr.push({x: labels[arr[0]], y: arr[1]}); } );
    Array.from(traj_sell).forEach((val, idx) => { arr=Array.from(val); sellArr.push({x: labels[arr[0]], y: arr[1]}); });
    console.log("main", JSON.stringify(buyArr));
    console.log("main", JSON.stringify(sellArr));
    
    var buyChart = {
        type: 'scatter',
        backgroundColor: 'red',
        pointRadius: 2,
        data: buyArr
    };
    var sellChart = {
        type: 'scatter',
        backgroundColor: 'green',
        pointRadius: 2,
        data: sellArr
    };
    
    if (chart == undefined) {
        const chart = initPriceChart();
    }
    chart.data.datasets.push(buyChart);
    chart.data.datasets.push(sellChart);
    
    chart.update();
}

function reversePrices() {
    let data = [simudata.getLabels(), simudata.getPrices(true)];
    updatePriceChart(data);
}

function normalPrices() {
    let data = [simudata.getLabels(), simudata.getPrices(false)];
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

function getPrices(rev=false) {
    let prices = simudata.getPrices(rev);
    console.log("main:", prices);
    return prices;
}

// Main

const simudata = new SimuData(30);

getCoinList();

const chart = initPriceChart();

