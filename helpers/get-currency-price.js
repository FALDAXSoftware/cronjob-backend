var fetch = require('node-fetch')

var convertValue = async (coin, currency) => {
    var getConvertedValue;

    try {
        var coin = coin.toLowerCase();
        await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=` + currency + `&ids=` + coin, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(resData => resData.json())
            .then(resData => {
                console.log("resData", resData);
                getConvertedValue = resData;
            })
        return getConvertedValue;
    } catch (error) {
        console.log("Send fund error :: ", error);
    }
}

module.exports = {
    convertValue
}