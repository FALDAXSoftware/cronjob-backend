/* Used to store CronJobs  */
var cron = require('node-cron');
// var simplexController = require('../controllers/v1/SimplexController');
var cronData = require("../controllers/v1/CronController");

// On Every Minute
cron.schedule('0,5 * * * * *', async (req, res, next) => {
    console.log("Started cron....");
    await cronData.bitcoinistNewsUpdate();
    await cronData.bitcoinistNewsUpdate();
    await cronData.coinTelegraph();
});

cron.schedule('0,5 * * * * * ', async (req, res, next) => {
    console.log("INSIDE KYC CRON >>>>>>>>")
    await cronData.kyccron();
})

cron.schedule('0 */2 * * * *', async (req, res, next) => {
    console.log("Started Cron inside 2 minutes");
})

cron.schedule('0,5 * * * * *', async (req, res, next) => {
    await cronData.checkTheresoldNotification();
});

cron.schedule('0,5 * * * * *', async (req, res, next) => {
    await cronData.checkPaymentStatus();
});

cron.schedule('0,5 * * * * *', async (req, res, next) => {
    await cronData.getMarketPrice("XRP/USD");
    await cronData.getMarketPrice("BTC/USD");
    await cronData.getMarketPrice("LTC/USD");
    await cronData.getMarketPrice("ETH/USD");
    await cronData.getMarketPrice("BCH/USD");
    await cronData.getMarketPrice("ETH/BTC");
    await cronData.getMarketPrice("LTC/BTC");
    await cronData.getMarketPrice("XRP/BTC");
    await cronData.getMarketPrice("LTC/ETH");
    await cronData.getMarketPrice("XRP/ETH");

});