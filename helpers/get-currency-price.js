var fetch = require('node-fetch')
var coinsModel = require("../models/Coins");
var currencyConversionModel = require("../models/CurrencyConversion");

var convertValue = async (coin) => {
    var getConvertedValue;

    try {
        // var coin = coin.toLowerCase();
        var currencyData = [];
        var value = [];
        var coinSql = `SELECT coins.coin, currency_conversion.coin_name
                        FROM coins LEFT JOIN currency_conversion
                        ON currency_conversion.coin_id = coins.id
                        WHERE coins.deleted_at IS NULL AND coins.is_active = true AND currency_conversion.coin_name IS NOT NULL`
        var coinData = await coinsModel.knex().raw(coinSql)
        // console.log(coinData.rowCount)
        for (var i = 0; i < coinData.rowCount; i++) {
            // console.log(coinData.rows[i].coin_name)
            value.push(coinData.rows[i].coin_name)
        }
        // console.log(value)
        await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=` + value + `&vs_currencies=usd%2Ceur%2Cinr`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(resData => resData.json())
            .then(resData => {
                console.log("resData", resData);
                getConvertedValue = resData;
                currencyData.push(getConvertedValue)
            })
        for (var i = 0; i < value.length; i++) {
            if (currencyData[0][value[i]] != undefined) {

                var quoteObject = {
                    "EUR": {
                        "price": currencyData[0][value[i]].eur
                    }, "INR": {
                        "price": currencyData[0][value[i]].inr
                    }
                    , "USD": {
                        "price": currencyData[0][value[i]].usd
                    }
                }
                var originObject = currencyData[0][value[i]]
                var updateValue = await currencyConversionModel
                    .query()
                    .where("deleted_at", null)
                    .andWhere("coin_name", value[i])
                    .patch({
                        quote: quoteObject,
                        original_value: originObject
                    })
            }
        }
        return getConvertedValue;
    } catch (error) {
        console.log("Send fund error :: ", error);
    }
}

module.exports = {
    convertValue
}