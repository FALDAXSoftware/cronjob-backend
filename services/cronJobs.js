/* Used to store CronJobs  */
var cron = require('node-cron');
// var simplexController = require('../controllers/v1/SimplexController');
var cronData = require("../controllers/v1/CronController");

// On Every Minute
cron.schedule('* * * * *', async (req, res, next) => {
    // console.log("Started cron....");
    await cronData.bitcoinistNewsUpdate();
    await cronData.bitcoinNews();
    await cronData.coinTelegraph();
    // await cronData.addCoinGechkoValue()
});


cron.schedule('* * * * *', async (req, res, next) => {
    console.log("Started Cron inside 2 minutes");
    // await cronData.kyccron();
})

cron.schedule('* * * * *', async (req, res, next) => {
    await cronData.checkTheresoldNotification();
});


cron.schedule('* * * * *', async (req, res, next) => {
    await cronData.getMarketPrice("XRPUSD", 0);
    await cronData.getMarketPrice("XRPUSD", 1);
    await cronData.getMarketPrice("BTCUSD", 0);
    await cronData.getMarketPrice("BTCUSD", 1);
    await cronData.getMarketPrice("LTCUSD", 0);
    await cronData.getMarketPrice("LTCUSD", 1);
    await cronData.getMarketPrice("ETHUSD", 0);
    await cronData.getMarketPrice("ETHUSD", 1);
    await cronData.getMarketPrice("BCHUSD", 0);
    await cronData.getMarketPrice("BCHUSD", 1);
    await cronData.getMarketPrice("ETHBTC", 0);
    await cronData.getMarketPrice("ETHBTC", 1);
    await cronData.getMarketPrice("LTCBTC", 0);
    await cronData.getMarketPrice("LTCBTC", 1);
    await cronData.getMarketPrice("XRPBTC", 0);
    await cronData.getMarketPrice("XRPBTC", 1);
});

cron.schedule('* * * * *', async (req, res, next) => {
    // await cronData.addPriceFromCoinmarketData();
    await cronData.addCoinGechkoValue()
})
cron.schedule('* * * * *', async (req, res, next) => {
    // await cronData.checkPaymentStatus();
});

// cron.schedule('0 7 * * *', async (req, res, next) => {
//     await cronData.sendResidualReceiveFunds();
// });

// cron.schedule('0 7 * * *', async (req, res, next) => {
//     await cronData.sendResidualSendFunds();
// });