self.importScripts('https://unpkg.com/ccxt@1.79.2/dist/ccxt.browser.js');

console.log("worker:", "Loaded ccxt version:"+self.ccxt.version);

// load exchange info
const exchange = new ccxt.bitfinex({ enableRateLimit: true, proxy: 'https://cors-anywhere.herokuapp.com/' });
//const exchange = new ccxt.ftx({ enableRateLimit: true, proxy: 'https://corsproxy.atwebpages.com/proxy.php?csurl=' });

var preTimeRange = 0;
var preSymbol = "";

// handler of received messages
self.onmessage = async function handler(msg) {
  await handleMessageFromMain(msg);
};

// get messages from the main script
async function handleMessageFromMain(msg) {
    console.log("worker:", msg.data);
    if (msg.data.header == "getCoins") {
        await loadSymbols();
    } else if (msg.data.header == "getPrices") {
        await loadPrices(msg.data.symbol, msg.data.range);
    } else {
        postMessage([[],[]]);
    }
}

async function loadSymbols() {
    try {
        const markets = await exchange.loadMarkets();
        let symbols = exchange.symbols;                // get an array of symbols
        console.log ("worker:", symbols);            // print all symbols
        postMessage(symbols);
    } catch (e) {
        console.log ("worker Error:", e.constructor.name + ' ' + e.message);            // print all symbols
        postMessage("ERR");
    }
/*    const markets = await exchange.loadMarkets();
    let symbols = exchange.symbols;                // get an array of symbols
    console.log ("worker:", symbols);            // print all symbols
    postMessage(symbols);*/
}

function loadSymbolsFake() {
    let symbols = [...Array(100).keys()].map(i => "BTC/USD"+i.toString());                // get an array of symbols
    console.log ("worker:", symbols);            // print all symbols
    postMessage(symbols);
}

async function loadPrices(symbol, range) {
    console.log ("worker:", "load price of " + symbol + " from " + range);            // print all symbols
    
    if ((!symbol)||isNaN(range)) {
        console.log("worker Error:", "invalid input");
        postMessage([[],[]]);
        return;
    }
    
    if ((preSymbol==symbol)&&(preTimeRange==range)) {
        console.log("worker:", "the same input, not reload!");
        postMessage([[],[]]);
        return;
    }
    
    let timeframe = '1h';
    let limit = 30*24;
    if (range==15) {
        timeframe = '15m';
        limit = range*24*4;
    } else if (range==7) {
        timeframe = '5m';
        limit = range*24*12;
    }

    let since;
    console.log ("worker:", "timeframe=" + timeframe + ", limit=" + limit);

    try {
        const response = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
//       const last = response[response.length - 1]
//       const [ timestamp, open, high, low, close ] = last;
        var priceClose = response.map(x => x[4]);
        var timestamp = response.map(x => exchange.iso8601(x[0]).slice(5,-8) );
//       const data = response.map (([ timestamp, open, high, low, close ]) => ({ time: exchange.iso8601 (timestamp), close }));
        const data = [timestamp, priceClose];
        console.log("worker:", data);
        postMessage(data);
    } catch (e) {
        console.log("worker ERROR:", e.constructor.name + ' ' + e.message);
        postMessage([[],[]]);
    }

}
