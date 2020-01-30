/**
 * SimplexController
 *
 */
const {
  raw
} = require('objection');
var express = require('express');
var app = express();
var moment = require('moment');
var fetch = require('node-fetch');
const Bluebird = require('bluebird');
fetch.Promise = Bluebird;
var twilio = require('twilio');
var aesjs = require('aes-js');
var mailer = require('express-mailer');

// Extra
const constants = require('../../config/constants');
// Controllers
var {
  AppController
} = require('./AppController');
var logger = require("./logger");

// Models
var NewsModel = require('../../models/News');
var ThresholdModel = require('../../models/UserThresholds');
var PriceHistoryModel = require('../../models/PriceHistory')
var UserModel = require('../../models/UsersModel');
var EmailTemplateModel = require('../../models/EmailTemplate');
var SmsTemplateModel = require('../../models/SmsTemplate');
var AdminSettingModel = require('../../models/AdminSetting');
var SimplexTradeHistoryModel = require('../../models/SimplexTradeHistory');
var Coins = require('../../models/Coins');
var Wallet = require('../../models/Wallet');
var ReferralModel = require('../../models/Referral');
var KYCModel = require('../../models/KYC');
var TempCoinmarketcap = require('../../models/TempCoinMarketCap');
var TransactionTableModel = require('../../models/TransactionTable');
var residualTransactionModel = require('../../models/ResidualTransactions');

var request = require('request');
var xmlParser = require('xml2json');
var moment = require('moment');
var DomParser = require('dom-parser');
const image2base64 = require('image-to-base64');
var kycDocType = '';
const countryData = require('../../config/country');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
AWS
  .config
  .loadFromPath('config/aws_config.json');
var s3 = new AWS.S3({
  signatureVersion: 'v4'
});
var S3BucketName = "production-static-asset";
var s3bucket = new AWS.S3({
  params: {
    Bucket: 'production-static-asset'
  }
});

/**
 * Cron
 * It's contains all the opration related with users table. Like userList, userDetails,
 * createUser, updateUser, deleteUser and changeStatus
 */
class CronController extends AppController {

  constructor() {
    super();
  }


  // Method For Bitcoinist News Update
  async bitcoinistNewsUpdate() {
    try {
      await logger.info({
        "module": "Bitcoinist News Update",
        "user_id": "user_bitcoin",
        "url": "Cron Function",
        "type": "Entry"
      }, "Entered the function")
      request('https://bitcoinist.com/feed/', async function (error, response, body) {
        var json = xmlParser.toJson(body);
        let res = JSON.parse(json);
        let items = res.rss.channel.item;
        for (let index = 0; index < items.length; index++) {
          const element = items[index];
          let records = await NewsModel
            .query()
            .where('title', element.title)
            .orderBy('id', 'DESC');

          if (records.length == 0) {
            await NewsModel
              .query()
              .insert({
                owner_id: 1,
                title: element.title,
                search_keywords: element.title.toLowerCase(),
                link: element.link,
                owner: "bitcoinist",
                description: element.description,
                cover_image: element['media:content'].url,
                posted_at: moment(element.pubDate).format("YYYY-MM-DD hh:mm:ss")
              });
          }
        }
        await logger.info({
          "module": "Bitcoinist News Update",
          "user_id": "user_bitcoin",
          "url": "Cron Function",
          "type": "Success"
        }, "Data Updated Successfully.")
      });
      return ("Done")
    } catch (error) {
      console.log(error)
      await logger.error({
        "module": "Bitcoinist News Update",
        "user_id": "user_bitcoin",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }


  // Method for Bitcoin News Update
  async bitcoinNews() {
    try {
      request('https://news.bitcoin.com/feed/', async function (error, response, body) {
        await logger.info({
          "module": "Bitcoin News Update",
          "user_id": "user_bitcoin",
          "url": "Cron Function",
          "type": "Entry"
        }, "Entered the function")
        var json = xmlParser.toJson(body);
        let res = JSON.parse(json);
        let items = res.rss.channel.item;

        for (let index = 0; index < items.length; index++) {
          const element = items[index];
          let records = await NewsModel
            .query()
            .where({
              'title': element.title
            })
            .orderBy('id', 'DESC');

          let parser = new DomParser();
          htmlDoc = parser.parseFromString(element.description, "text/xml");

          if (records.length == 0) {
            await NewsModel
              .query()
              .insert({
                owner_id: 3,
                title: element.title,
                search_keywords: element.title.toLowerCase(),
                link: element.link,
                owner: "bitcoin",
                description: element.description,
                cover_image: htmlDoc.getElementsByClassName("wp-post-image")[0].getAttribute('src'),
                posted_at: moment(element.pubDate).format("YYYY-MM-DD hh:mm:ss")
              });
          }
        }
        await logger.info({
          "module": "Bitcoin News Update",
          "user_id": "user_bitcoin",
          "url": "Cron Function",
          "type": "Success"
        }, "Bitcoin Data updated successfully")
        return ("Done");
      })
    } catch (error) {
      console.log(error)
      await logger.error({
        "module": "Bitcoin News Update",
        "user_id": "user_bitcoin",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Method for Coin Telegraph News Update
  async coinTelegraph() {
    try {
      await logger.info({
        "module": "Coin Telegraph News Update",
        "user_id": "user_coin_telegraph",
        "url": "Cron Function",
        "type": "Entry"
      }, "Entered the function")
      var options = {
        url: 'http://cointelegraph.com/rss',
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36'
        }
      };
      request(options, async function (error, response, body) {
        var json = xmlParser.toJson(body);

        let res = JSON.parse(json);
        let items = res.rss.channel.item;
        for (let index = 0; index < items.length; index++) {
          const element = items[index];
          let records = await NewsModel
            .query()
            .where({
              'title': element.title
            })
            .orderBy('id', 'DESC');

          if (records.length == 0) {
            await NewsModel
              .query()
              .insert({
                owner_id: 2,
                title: element.title,
                search_keywords: element.title.toLowerCase(),
                link: element.link,
                owner: "cointelegraph",
                description: element.description,
                cover_image: element['media:content'].url,
                posted_at: moment(element.pubDate).format("YYYY-MM-DD hh:mm:ss")
              });
          }
        }
        await logger.info({
          "module": "Bitcoinist News Update",
          "user_id": "user_coin_telegraph",
          "url": "Cron Function",
          "type": "Success"
        }, "Data Updated Successfully")
        return ("Done");
      })
    } catch (error) {
      console.log(error)
      await logger.error({
        "module": "Coin Telegraph News Update",
        "user_id": "user_coin_telegraph",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Email Send To User
  async email(slug, user) {
    await logger.info({
      "module": "Cron Email to Users",
      "user_id": "user_email",
      "url": "Cron Function",
      "type": "Enter"
    }, "Entered the function")
    let emailData = await EmailTemplateModel
      .query()
      .first()
      .where('deleted_at', null)
      .andWhere('slug', slug)
      .orderBy('id', 'DESC')

    var object = {};
    object.recipientName = user.first_name;

    if (user.limitType && user.limitType != undefined && user.limitType != null)
      object.limit = user.limitType

    if (user.coinName && user.coinName != undefined && user.coinName != null)
      object.coin = user.coinName

    let content = emailData
      .content
      .replace("{{recipientName}}", user.full_name);
    content = content.replace('{{limit}}', user.limitType);
    content = content.replace('{{coin}}', user.coinName);
    content = content.replace('{{product_name}}', "Faldax");

    var allData = {
      template: "emails/general_mail",
      email: user.email,
      extraData: content,
      subject: "Threshold Notification"
    }
    await CronSendEmail(allData);
    await logger.info({
      "module": "Cron Email to users",
      "user_id": "user_email",
      "url": "Cron Function",
      "type": "Success"
    }, "Data Updated Successfully")
  }

  // Function for decryting the encrypted Value
  async getDecryptData(keyValue) {
    await logger.info({
      "module": "Decryting the Data",
      "user_id": "user_decrypt",
      "url": "Cron Function",
      "type": "Enter"
    }, "Entering the function")
    // var key = [63, 17, 35, 31, 99, 50, 42, 86, 89, 80, 47, 14, 12, 98, 44, 78];
    // var iv = [45, 56, 89, 10, 98, 54, 13, 27, 82, 61, 53, 86, 67, 96, 94, 51]
    var key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    var iv = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];

    // When ready to decrypt the hex string, convert it back to bytes
    var encryptedBytes = aesjs
      .utils
      .hex
      .toBytes(keyValue);

    // The output feedback mode of operation maintains internal state, so to decrypt
    // a new instance must be instantiated.
    var aesOfb = new aesjs
      .ModeOfOperation
      .ofb(key, iv);

    var decryptedBytes = aesOfb.decrypt(encryptedBytes);

    // Convert our bytes back into text
    let decryptedText = aesjs
      .utils
      .utf8
      .fromBytes(decryptedBytes);
    await logger.info({
      "module": "Decryting the Data",
      "user_id": "user_decrypt",
      "url": "Cron Function",
      "type": "Success"
    }, "Data retrieved successfully")
    return decryptedText
  }

  // Function for sending SMS
  async text(slug, user) {
    try {
      await logger.info({
        "module": "User Text Sending",
        "user_id": "user_decrypt",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      var account_sid = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_SID);
      var accountSid = account_sid; // Your Account SID from www.twilio.com/console
      var authToken = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_AUTH_TOKEN) // Your Auth Token from www.twilio.com/console
      var fromNumber = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_FROM_NUMBER)
      var user_id = user.id;

      //Template for sending Email
      var bodyValue = await SmsTemplateModel
        .query()
        .where('deleted_at', null)
        .andWhere('slug', slug)
        .orderBy('id', 'DESC');

      //Twilio Integration
      var client = new twilio(accountSid, authToken);

      //Sending SMS to users 
      client.messages.create({
        body: bodyValue.content,
        to: user.phone_number, // Text this number
        from: fromNumber // From a valid Twilio number
      }).then(async (message) => {
        await logger.info({
          "module": "User Text Sending",
          "user_id": "user_text",
          "url": "Cron Function",
          "type": "Success"
        }, "SMS sent successfully")
        return (1);
      })
        .catch(async (err) => {
          console.log("ERROR >>>>>>>>>>>", err)
          await logger.error({
            "module": "User Text Sending",
            "user_id": "user_text",
            "url": "Cron Function",
            "type": "Error in Twilio"
          }, err)
        })
    } catch (error) {
      console.log(error)
      await logger.info({
        "module": "User Text Sending",
        "user_id": "user_text",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // User Threshold Notification
  async checkTheresoldNotification() {
    try {
      await logger.info({
        "module": "Admin Threshold Notification",
        "user_id": "admin_threshold",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the threshold function")
      // //Getting User Notification Details
      let user = await ThresholdModel
        .query()
        .where({
          'deleted_at': null
        });

      var data = '/USD'

      var values = await PriceHistoryModel
        .query()
        .where('coin', 'like', '%' + data + '%')
        .andWhere('ask_price', '>', 0)
        .orderBy('coin', 'DESC')
        .orderBy('created_at', 'DESC')
        .groupBy('coin')
        .groupBy('id')
        .limit(100);

      for (let index = 0; index < user.length; index++) {
        const element = user[index];
        var assetValue = element.asset;
        var userData = await UserModel
          .query()
          .first()
          .where('id', element.user_id)
          .andWhere('is_active', true)
          .andWhere('deleted_at', null)
          .andWhere('is_verified', true)
          .orderBy('id', 'DESC');

        for (var i = 0; i < assetValue.length; i++) {
          for (var k = 0; k < values.length; k++) {
            var coinValue = assetValue[i].coin + '/USD'
            if (values[k].coin == coinValue) {
              userData.coinName = assetValue[i].coin
              if (assetValue[i].upper_limit != undefined && assetValue[i].upper_limit != null) {
                if (values[k].ask_price >= assetValue[i].upper_limit) {
                  if (userData) {
                    userData.limitType = "Upper Limit"
                    if (assetValue[i].is_email_notification == true || assetValue[i].is_email_notification == "true") {
                      if (userData.email != undefined) {
                        await module.exports.email("thresold_notification", userData)
                      }
                    }
                    if (assetValue[i].is_sms_notification == true || assetValue[i].is_sms_notification == "true") {
                      if (userData.phone_number != undefined)
                        await module.exports.text("thresold_notification", userData)
                    }
                  }
                }
              }

              if (assetValue[i].lower_limit != undefined && assetValue[i].lower_limit != null) {
                if (values[k].ask_price <= assetValue[i].lower_limit) {
                  if (userData) {
                    userData.limitType = "Lower Limit";
                    if (assetValue[i].is_email_notification == true || assetValue[i].is_email_notification == "true") {
                      if (userData.email != undefined) {
                        await module.exports.email("thresold_notification", userData)
                      }
                    }
                    if (assetValue[i].is_sms_notification == true || assetValue[i].is_sms_notification == "true") {
                      if (userData.phone_number != undefined)
                        await module.exports.text("thresold_notification", userData)
                    }
                  }
                }
              }

            }
          }
        }
      }

      await logger.info({
        "module": "Admin Threshold Notifcation",
        "user_id": "admin_threshold",
        "url": "Cron Function",
        "type": "Success"
      }, "Threshold Notification send successfully")
      return (1)
    } catch (error) {
      console.log(error)
      await logger.error({
        "module": "Admin Threshold Notifcation",
        "user_id": "admin_threshold",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Deleting the event after confirmed
  async deleteEvent(event_id) {
    try {
      await logger.info({
        "module": "Simplex Delete Event Data",
        "user_id": "user_simplex_delete_event_data",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      var keyValue = process.env.ACCESS_TOKEN

      var decryptedText = await module
        .exports
        .getDecryptData(keyValue);

      var promise = await new Promise(async function (resolve, reject) {
        await request
          .get(process.env.SIMPLEX_BACKEND_URL + "/simplex/delete-event-data/" + event_id, {
            headers: {
              'X-token': 'faldax-simplex-backend',
              'Content-Type': 'application/json'
            }
          }, function (err, res, body) {
            return (res.body)
          });
      })
      await logger.info({
        "module": "Simplex Delete Event Data",
        "user_id": "user_simplex_delete_event_data",
        "url": "Cron Function",
        "type": "Success"
      }, "Event Deleted Successfully")
      return promise;

    } catch (err) {
      console.log(err);
      await logger.error({
        "module": "Simplex Delete Event Data",
        "user_id": "user_simplex_delete_event_data",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Getting Simplex Each Event Data
  async getEventData() {
    try {
      await logger.info({
        "module": "Simplex Event Data",
        "user_id": "user_simplex_get_event_data",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      var keyValue = process.env.SIMPLEX_ACCESS_TOKEN

      var decryptedText = await module
        .exports
        .getDecryptData(keyValue);

      var promise = await new Promise(async function (resolve, reject) {
        await request
          .get(process.env.SIMPLEX_BACKEND_URL + '/simplex/get-event-data', {
            headers: {
              'Content-Type': 'application/json',
              'X-token': 'faldax-simplex-backend'
            }
          }, function (err, res, body) {
            resolve(body);
          });
      })

      await logger.info({
        "module": "Simplex Event Data",
        "user_id": "user_simplex_get_event_data",
        "url": "Cron Function",
        "type": "Success"
      }, "Event Data retrieved successfully")
      return promise;

    } catch (error) {
      console.log(error);
      await logger.error({
        "module": "Simplex Event Data",
        "user_id": "user_simplex_get_event_data",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // When Simplex Payment is confirmed collect the referral
  async getReferredData(trade_object, user_id, transaction_id) {
    try {
      await logger.info({
        "module": "Simplex Add Referral Data",
        "user_id": "user_referral",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      var referral_percentage = 0;
      var collectedAmount = 0;
      var collectCoin;
      var coinData;
      var referralData = await UserModel
        .query()
        .where('deleted_at', null)
        .andWhere('is_active', true)
        .andWhere('id', user_id)
        .orderBy('id', 'DESC')

      var referredUserData = await UserModel
        .query()
        .where('deleted_at', null)
        .andWhere('is_active', true)
        .andWhere('id', referralData.referred_id)
        .orderBy('id', 'DESC');

      var addRefferalAddData = {};

      if (referredUserData !== undefined && referredUserData.referal_percentage > 0) {
        referral_percentage = parseFloat(referredUserData.referal_percentage);
      } else {
        var referal_data = await AdminSettingModel
          .query()
          .where('deleted_at', null)
          .andWhere('slug', 'default_referral_percentage')
          .orderBy('id', 'DESC')
        referral_percentage = parseFloat(referal_data.value);
      }

      if (referredUserData != undefined) {
        if (trade_object[0].flag == 1) {
          if (trade_object[0].side == 'Buy') {
            collectedAmount = parseFloat((trade_object[0].faldax_fees * (referral_percentage / 100)))
            var symbol = (trade_object[0].symbol).replace("/", '-');
            var data = symbol
              .split("-");
            var crypto = data[0];
            var currency = data[1]

            collectCoin = crypto
            coinData = await Coins
              .query()
              .where('is_active', true)
              .andWhere('deleted_at', null)
              .andWhere('coin', collectCoin);

            addRefferalAddData.coin_id = coinData.id;
            addRefferalAddData.amount = collectedAmount;
            addRefferalAddData.coin_name = collectCoin;
            addRefferalAddData.user_id = referredUserData.id;
            addRefferalAddData.referred_user_id = referralData.id;
            addRefferalAddData.txid = transaction_id;
            addRefferalAddData.is_collected = false;

            var addedData = await ReferralModel
              .query()
              .insert(addRefferalAddData)

          } else if (trade_object[0].side == 'Sell') {
            collectedAmount = parseFloat((trade_object[0].faldax_fees * (referral_percentage / 100)))
            var symbol = (trade_object[0].symbol).replace("/", '-');
            var data = symbol
              .split("-");
            var crypto = data[0];
            var currency = data[1]
            collectCoin = currency
            coinData = await Coins
              .query()
              .where('is_active', true)
              .andWhere('deleted_at', null)
              .andWhere('coin', collectCoin);
            addRefferalAddData.coin_id = coinData.id;
            addRefferalAddData.amount = collectedAmount;
            addRefferalAddData.coin_name = collectCoin;
            addRefferalAddData.user_id = referredUserData.id;
            addRefferalAddData.referred_user_id = referralData.id;
            addRefferalAddData.txid = transaction_id;
            addRefferalAddData.is_collected = false;

            var addedData = await ReferralModel
              .query()
              .insert(addRefferalAddData)
          }
        }
        var userNotification = await UserNotification
          .query()
          .where('user_id', referredUserData.id)
          .andWhere('deleted_at', null)
          .andWhere('slug', 'referal');

        if (userNotification && userNotification != undefined) {
          if (userNotification.email == true || userNotification.email == "true") {
            await module.exports.email("thresold_notification", referredUserData)
          }
          if (userNotification.text == true || userNotification.text == "true") {
            await module.exports.text("thresold_notification", referredUserData)
          }
        }
      }
      await logger.info({
        "module": "Simplex Add Referral Data",
        "user_id": "user_referral",
        "url": "Cron Function",
        "type": "Success"
      }, "Referral Data added successfully")
      return (1)
    } catch (error) {
      console.log(error);
      await logger.error({
        "module": "Simplex Add Referral Data",
        "user_id": "user_referral",
        "url": "Cron Function",
        "type": "Enter"
      }, error)
    }
  }

  // Check Simplex Payment Status for Each User
  async checkPaymentStatus() {
    try {
      await logger.info({
        "module": "Simplex Payment Status Update",
        "user_id": "user_simplex",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      var data = await module
        .exports
        .getEventData();
      var tradeData = await SimplexTradeHistoryModel
        .query()
        .select()
        .where('deleted_at', null)
        .andWhere('trade_type', 3)
        .orderBy('id', 'DESC');

      await logger.info({
        "module": "Simplex Payment Status Update",
        "user_id": "user_simplex",
        "url": "Cron Function",
        "type": "Success"
      }, data)
      for (var i = 0; i < tradeData.length; i++) {
        for (var j = 0; j < data.events.length; j++) {
          var payment_data = JSON.stringify(data.events[j].payment);
          payment_data = JSON.parse(payment_data);
          var payment_status = data.events[j]
          if (payment_data.id == tradeData[i].payment_id && payment_status.name == "payment_request_submitted") {
            await module.exports.deleteEvent(data.events[j].event_id)
          } else if (payment_data.id == tradeData[i].payment_id) {
            if (payment_status.name == "payment_simplexcc_approved") {
              var tradeHistoryData = await SimplexTradeHistoryModel
                .query()
                .select()
                .first()
                .where('id', tradeData[i].id)
                .patch({
                  simplex_payment_status: 2,
                  is_processed: true
                });

              await module.exports.deleteEvent(data.events[j].event_id);

              var referData = await ReferralModel
                .query()
                .first()
                .where('deleted_at', null)
                .andWhere('txid', tradeData[i].id)
                .orderBy('id', 'DESC')

              if (referData != undefined) {
                let referredData = await module.exports.getReferredData(tradeHistoryData, tradeHistoryData.user_id, tradeData[i].id);
              }
            } else if (payment_status.name == "payment_simplexcc_declined") {
              var tradeHistoryData = await SimplexTradeHistoryModel
                .query()
                .select()
                .first()
                .where('id', tradeData[i].id)
                .patch({
                  simplex_payment_status: 3,
                  is_processed: true
                });
              await module.exports.deleteEvent(data.events[j].event_id)
            }
          }
        }
      }
      await logger.info({
        "module": "Simplex Payment Status Update",
        "user_id": "user_simplex",
        "url": "Cron Function",
        "type": "Success"
      }, "Simplex Payment status updated Successfully")
    } catch (err) {
      console.log(err);
      await logger.error({
        "module": "Simplex Payment Status Update",
        "user_id": "user_simplex",
        "url": "Cron Function",
        "type": "Error"
      }, err)
    }
  }

  // Get Fiat Value from JST
  async getMarketPrice(symbol) {
    try {
      await logger.info({
        "module": "JST Market Data",
        "user_id": "user_jst",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      request({
        url: process.env.JST_MARKET_URL + '/Market/GetQuote?symbol=' + symbol,
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        json: true
      }, async function (err, httpResponse, body) {
        if (err) {
          return (err);
        }
        if (body.error) {
          return (body);
        }
        // Add data in table
        let object_data = {
          coin: symbol,
          ask_price: body.Ask,
          ask_size: body.AskSize,
          bid_price: body.Bid,
          bid_size: body.BidSize,
        };
        await PriceHistoryModel
          .query()
          .insert(object_data);
        //ends

        await logger.info({
          "module": "JST Market Data",
          "user_id": "user_jst",
          "url": "Cron Function",
          "type": "Success"
        }, "JST added successfully")
        return (body);
      });
    } catch (error) {
      console.log(error);
      await logger.error({
        "module": "JST Market Data",
        "user_id": "user_jst",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Upload the documnets uploaded by the user during KYC submission
  async kycpicUpload(params) {
    await logger.info({
      "module": "Customer ID Verification",
      "user_id": "user_kyc",
      "url": "Cron Function",
      "type": "Enter"
    }, "Entering the function")
    let kyc_details = await KYCModel
      .query()
      .first()
      .where('id', params.id)
      .orderBy('id', 'DESC');
    let user = await UserModel
      .query()
      .first()
      .where('id', kyc_details.user_id)
      .orderBy('id', 'DESC');
    let kycUploadDetails = {};
    if (!kyc_details.ssn) {
      kycUploadDetails.docCountry = kyc_details.country_code;
      kycUploadDetails.bco = kyc_details.country_code;
    }
    if (!kyc_details.ssn) {
      await image2base64(process.env.AWS_S3_URL + kyc_details.front_doc)
        .then((response) => {
          kycUploadDetails.scanData = response;
        }).catch(
          (error) => {
            console.log('error', error);
          })

      await image2base64(process.env.AWS_S3_URL + kyc_details.back_doc)
        .then((response) => {
          kycUploadDetails.backsideImageData = response;
        }).catch(
          (error) => {
            console.log('error', error);
          })
    }

    if (kyc_details.id_type == 1) {
      kycUploadDetails.docType = 'PP';
    } else if (kyc_details.id_type == 2) {
      kycUploadDetails.docType = 'DL';
    } else if (kyc_details.id_type == 3) {
      kycUploadDetails.docType = 'ID';
    } else {
      kycUploadDetails.ssn = kyc_details.ssn;
    }
    kycUploadDetails.man = user.email;
    kycUploadDetails.bfn = kyc_details.first_name;
    kycUploadDetails.bln = kyc_details.last_name;
    kycUploadDetails.bln = kyc_details.last_name;
    kycUploadDetails.bsn = kyc_details.address;
    if (kyc_details.address_2 !== null) {
      kycUploadDetails.bsn = kycUploadDetails.bsn + ' ' + kyc_details.address_2;
    }
    kycUploadDetails.bc = kyc_details.city;
    kycUploadDetails.bz = kyc_details.zip;
    kycUploadDetails.dob = moment(kyc_details.dob, 'DD-MM-YYYY').format('YYYY-MM-DD');

    var idm_key = await module.exports.getDecryptData(process.env.IDM_TOKEN);
    request.post({
      headers: {
        'Authorization': 'Basic ' + idm_key
      },
      url: process.env.IDM_URL,
      json: kycUploadDetails
    }, async function (error, response, body) {
      try {
        kyc_details.direct_response = response.body.res;
        kyc_details.webhook_response = null;
        await KYCModel
          .query()
          .where('id', kyc_details.id)
          .patch({
            'direct_response': response.body.res,
            'webhook_response': null,
            'mtid': response.body.mtid,
            'comments': response.body.frd,
            'status': true,
          });

        if (kyc_details.front_doc != null) {
          let profileData = {
            Bucket: S3BucketName,
            Key: kyc_details.front_doc
          }

          s3bucket.deleteObject(profileData, function (err, response) {
            if (err) {
              console.log(err)
            } else { }
          })
        }
        if (kyc_details.back_doc != null) {
          let profileData = {
            Bucket: S3BucketName,
            Key: kyc_details.back_doc
          }

          s3bucket.deleteObject(profileData, function (err, response) {
            if (err) {
              console.log(err)
            } else { }
          })
        }
        await logger.info({
          "module": "Customer ID Verification",
          "user_id": "user_kyc",
          "url": "Cron Function",
          "type": "Success"
        }, "User Data Updated Successfully")
      } catch (error) {
        console.log('error', error);
        await logger.error({
          "module": "Customer ID Verification",
          "user_id": "user_kyc",
          "url": "Cron Function",
          "type": "Error"
        }, error)
        await KYCModel
          .query()
          .where('id', kyc_details.id)
          .patch({
            'direct_response': "MANUAL_REVIEW",
            'webhook_response': "MANUAL_REVIEW",
            'comments': "Could Not Verify",
            'status': true,
          })
      }
    });
  }

  // Cron for KYC sending to the IDM
  async kyccron() {
    try {
      await logger.info({
        "module": "User Customer ID Verification",
        "user_id": "user_kyc",
        "url": "Cron Function",
        "type": "Enter"
      }, "Entering the function")
      let pendingKYC = await KYCModel
        .query()
        .where('deleted_at', null)
        .andWhere('status', false)
        .andWhere('steps', 3)
        .orderBy('id', 'DESC');
      for (let index = 0; index < pendingKYC.length; index++) {
        const element = pendingKYC[index];
        await module.exports.kycpicUpload(element);
      }
    } catch (error) {
      console.log(error);
      await logger.error({
        "module": "User Customer ID Verification",
        "user_id": "user_kyc",
        "url": "Cron Function",
        "type": "Error"
      }, error)
    }
  }

  // Adding the fiat price fiat from Coin Market Cap
  async addPriceFromCoinmarketData() {
    await logger.info({
      "module": "Cron CoinMarketCap",
      "user_id": "user_marketcap",
      "url": "Cron Function",
      "type": "Enter"
    }, "Entering the function")
    var keyValue = await module.exports.getDecryptData(process.env.COINMARKETCAP_MARKETPRICE)
    await request({
      url: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?convert=' + process.env.CURRENCY + '&start=1&limit=20',
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'X-CMC_PRO_API_KEY': keyValue
      },
      json: true
    }, async function (error, response, body) {
      try {
        var resData = body.data
        for (var i = 0; i < resData.length; i++) {
          let price_object = {
            coin: resData[i].symbol,
            price: resData[i].quote.USD.price,
            market_cap: resData[i].quote.USD.market_cap,
            percent_change_1h: resData[i].quote.USD.percent_change_1h,
            percent_change_24h: resData[i].quote.USD.percent_change_24h,
            percent_change_7d: resData[i].quote.USD.percent_change_7d,
            volume_24h: resData[i].quote.USD.volume_24h
          };
          let accountClass = await TempCoinmarketcap
            .query()
            .insert(price_object);
        }
        await logger.info({
          "module": "Cron CoinMarket Cap",
          "user_id": "user_marketcap",
          "url": "Cron Function",
          "type": "Success"
        }, "CoinMarketCap Updated successfully")
      } catch (error) {
        console.log('error', error);
        await logger.error({
          "module": "Cron CoinMarket Cap",
          "user_id": "user_marketcap",
          "url": "Cron Function",
          "type": "Error"
        }, error)
      }
    })
  }

  // Function for getting the network Fee Value
  async getNetworkFee(coin, walletId, amount, address) {
    return new Promise(async (resolve, reject) => {
      var coinData = await Coins
        .query()
        .select()
        .first()
        .where('deleted_at', null)
        .andWhere('is_active', true)
        .andWhere('coin_code', coin)
        .orderBy('id', 'DESC');

      var recipients = [
        {
          "amount": parseFloat((amount * 1e8).toFixed(process.env.TOTAL_PRECISION)),
          "address": address
        }
      ];

      if (coinData != undefined) {
        var access_token_value = await module.exports.getDecryptData(process.env.BITGO_ACCESS_TOKEN);
        await request({
          url: `${process.env.BITGO_PROXY_URL}/${coin}/wallet/${walletId}/tx/build`,
          method: "POST",
          headers: {
            // 'cache-control': 'no-cache',
            Authorization: `Bearer ${access_token_value}`,
            'Content-Type': 'application/json'
          },
          body: {
            "recipients": recipients
          },
          json: true
        }, function (err, httpResponse, body) {
          if (err) {
            resolve(err);
          }
          if (body.error) {
            resolve(body);
          }
          var feeValue = body.feeInfo
          resolve(feeValue);
        });
      } else {
        resolve("Coin Not Found")
      }
    })
  }

  // Send the Amount
  async send(address, amount, feeRate, coin, walletId) {
    return new Promise(async (resolve, reject) => {
      try {
        var access_token_value = await this.getDecryptData(process.env.BITGO_ACCESS_TOKEN);
        var passphrase_value = await this.getDecryptData(process.env.BITGO_PASSPHRASE);
        var send_data = {
          address: address,
          amount: parseFloat(amount),
          walletPassphrase: passphrase_value,
          feeRate: feeRate
        };
        console.log(send_data)

        request({
          url: `${process.env.BITGO_PROXY_URL}/${coin}/wallet/${walletId}/sendcoins`,
          method: "POST",
          headers: {
            'cache-control': 'no-cache',
            Authorization: `Bearer ${access_token_value}`,
            'Content-Type': 'application/json'
          },
          body: send_data,
          json: true
        }, function (err, httpResponse, body) {
          console.log(err);
          console.log(body);
          if (err) {
            console.log("Error", err)
            reject(err);
          }
          if (body.error) {
            reject(body);
          }
          resolve(body);
        });
      } catch (error) {
        console.log(error)
        reject(error);
      }
    })
  }

  // Get Wallet Data Value
  async getWalletData(walletId, coin) {
    return new Promise(async (resolve, reject) => {
      var access_token_value = await this.getDecryptData(process.env.BITGO_ACCESS_TOKEN);

      await request({
        url: `${process.env.BITGO_PROXY_URL}/${coin}/wallet/${walletId}`,
        method: "GET",
        headers: {
          'cache-control': 'no-cache',
          Authorization: `Bearer ${access_token_value}`,
          'Content-Type': 'application/json'
        },
        json: true
      }, function (err, httpResponse, body) {
        // console.log("wallet", err);
        if (err) {
          resolve(err);
        }
        if (body.error) {
          resolve(body);
        }
        resolve(body);
      });
    })
  }

  // Send Left Over Residual Amount to Warm Wallet
  async sendResidualReceiveFunds() {
    console.log("SEND RESIDUAL RECEIVE FUNDS");
    var coinData = await Coins
      .query()
      .select('hot_receive_wallet_address', 'coin_code', 'warm_wallet_address', 'id')
      .where('deleted_at', null)
      .andWhere('is_active', true)
      .orderBy('id', 'DESC');

    if (coinData && coinData != undefined && coinData.length > 0) {
      for (var i = 0; i < coinData.length; i++) {
        if (coinData[i].hot_receive_wallet_address != null) {
          var data = await module.exports.getWalletData(coinData[i].hot_receive_wallet_address, coinData[i].coin_code)
          var warmWalletData = await module.exports.getWalletData(coinData[i].warm_wallet_address, coinData[i].coin_code);

          var adminAddress = await Wallet
            .query()
            .first()
            .select()
            .where('deleted_at', null)
            .andWhere('coin_id', coinData[i].id)
            .andWhere('user_id', 36)
            .andWhere('is_admin', true)
            .orderBy('id', 'DESC');

          var thresholdValue;
          var feesValue;
          if (coinData[i].coin_code == 'tbtc') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tbtc_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tbtc_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'teth') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'teth_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'teth_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'txrp') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'txrp_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'txrp_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'tltc') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tltc_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tltc_static_fees')
              .orderBy('id', 'DESC');
          }
          thresholdValue = thresholdValue.value;
          feesValue = feesValue.value;
          if (data.balance && data.balance != undefined) {
            var amount = data.balance - feesValue;
            amount = 900000;
            console.log("amount", amount)
            if ((parseFloat(amount) >= thresholdValue)) {
              var amountToBeSend = parseFloat(amount / 1e8).toFixed(8)
              if (warmWalletData.receiveAddress.address != undefined && coinData[i].coin_code == 'tbtc') {
                var getFeeValue = await module.exports.getNetworkFee(coinData[i].coin_code, coinData[i].hot_receive_wallet_address, parseFloat(amountToBeSend), warmWalletData.receiveAddress.address);
                console.log("getFeeValue", getFeeValue);
                let size = getFeeValue.size; // in bytes
                console.log("size", size);
                let get_sizefor_tx = size / 1024; // in kb
                console.log("get_sizefor_tx", get_sizefor_tx)
                let amount_fee_rate = feesValue * get_sizefor_tx
                console.log("amount_fee_rate", amount_fee_rate);
                var exactSendAmount = parseFloat(amount) - parseFloat(getFeeValue.fee);
                exactSendAmount = parseFloat(exactSendAmount).toFixed(8);
                console.log(exactSendAmount)
                var feeRateValue = parseInt(amount_fee_rate);
                var sendTransaction = await module.exports.send(warmWalletData.receiveAddress.address, exactSendAmount, feeRateValue, coinData[i].coin_code, coinData[i].hot_receive_wallet_address);
                console.log("sendTransaction", sendTransaction)
                var transactionDetails = {
                  coin_id: coinData[i].id,
                  source_address: data.receiveAddress.address,
                  destination_address: warmWalletData.receiveAddress.address,
                  user_id: 36,
                  amount: parseFloat(exactSendAmount / 1e8).toFixed(8),
                  transaction_type: 'send',
                  is_executed: true,
                  transaction_id: sendTransaction.txid,
                  faldax_fee: 0,
                  actual_network_fees: parseFloat(sendTransaction.transfer.feeString / 1e8).toFixed(8),
                  estimated_network_fees: parseFloat(getFeeValue.fee / 1e8).toFixed(8),
                  is_done: true,
                  actual_amount: parseFloat(amount / 1e8).toFixed(8),
                  is_admin: true,
                  residual_amount: parseFloat(getFeeValue.fee / 1e8).toFixed(8) - parseFloat(sendTransaction.transfer.feeString / 1e8).toFixed(8)
                }
                console.log(transactionDetails)
                var value;
                await residualTransactionModel
                  .query()
                  .insert(transactionDetails).then(newRecord => {
                    console.log('New Record', newRecord);
                  });;

                var amountValue = parseFloat(exactSendAmount / 1e8).toFixed(8);
                var balanceUpdate = parseFloat(adminAddress.balance) + parseFloat(amountValue)
                console.log("balanceUpdate", balanceUpdate);
                var placedBalanceUpdate = parseFloat(adminAddress.placed_balance) + parseFloat(amountValue)
                var walletBalanceUpdate = await Wallet
                  .query()
                  .where('deleted_at', null)
                  .andWhere('coin_id', coinData[i].id)
                  .andWhere('user_id', 36)
                  .andWhere('is_admin', true)
                  .patch({
                    "balance": balanceUpdate,
                    "placed_balance": placedBalanceUpdate
                  })
              }
            }
          }
        }
      }
    }
  }

  async sendResidualSendFunds() {
    console.log("INSIDE RESIDUAL SEND FUNDS")
    var coinData = await Coins
      .query()
      .select('hot_send_wallet_address', 'coin_code', 'warm_wallet_address', 'id')
      .where('deleted_at', null)
      .andWhere('is_active', true)
      .orderBy('id', 'DESC');

    if (coinData && coinData != undefined && coinData.length > 0) {
      for (var i = 0; i < coinData.length; i++) {
        if (coinData[i].hot_send_wallet_address != null) {
          var data = await module.exports.getWalletData(coinData[i].hot_send_wallet_address, coinData[i].coin_code)
          console.log(data);
          var warmWalletData = await module.exports.getWalletData(coinData[i].warm_wallet_address, coinData[i].coin_code);
          var adminAddress = await Wallet
            .query()
            .first()
            .select()
            .where('deleted_at', null)
            .andWhere('coin_id', coinData[i].id)
            .andWhere('user_id', 36)
            .andWhere('is_admin', true)
            .orderBy('id', 'DESC');

          var thresholdValue;
          var feesValue;
          if (coinData[i].coin_code == 'tbtc') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tbtc_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tbtc_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'teth') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'teth_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'teth_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'txrp') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'txrp_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'txrp_static_fees')
              .orderBy('id', 'DESC');
          } else if (coinData[i].coin_code == 'tltc') {
            thresholdValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tltc_limit_wallet_transfer')
              .orderBy('id', 'DESC');
            feesValue = await AdminSettingModel
              .query()
              .first()
              .select('value')
              .where('deleted_at', null)
              .andWhere('slug', 'tltc_static_fees')
              .orderBy('id', 'DESC');
          }
          thresholdValue = thresholdValue.value;
          feesValue = feesValue.value;
          console.log(feesValue)
          console.log(coinData[i].coin_code + "    " + data);
          console.log(data.balance)
          if (data.balance && data.balance != undefined) {
            var amount = data.balance - feesValue;
            console.log(amount);
            if ((parseFloat(amount) >= thresholdValue)) {
              var amountToBeSend = parseFloat(amount / 1e8).toFixed(8)
              console.log(amountToBeSend);
              if (warmWalletData.receiveAddress.address != undefined && adminAddress.receive_address != undefined) {
                var getFeeValue = await module.exports.getNetworkFee(coinData[i].coin_code, coinData[i].hot_send_wallet_address, parseFloat(amountToBeSend), warmWalletData.receiveAddress.address);
                let size = getFeeValue.size; // in bytes
                let get_sizefor_tx = size / 1024; // in kb
                let amount_fee_rate = feesValue * get_sizefor_tx
                var exactSendAmount = parseFloat(amount) - parseFloat(getFeeValue.fee);
                exactSendAmount = parseFloat(exactSendAmount).toFixed(8);
                var feeRateValue = parseInt(amount_fee_rate);
                var sendTransaction = await module.exports.send(adminAddress.receive_address, exactSendAmount, feeRateValue, coinData[i].coin_code, coinData[i].hot_send_wallet_address);
                console.log(sendTransaction);
                var transactionDetails = {
                  coin_id: coinData[i].id,
                  source_address: data.receiveAddress.address,
                  destination_address: warmWalletData.receiveAddress.address,
                  user_id: 36,
                  amount: parseFloat(exactSendAmount / 1e8).toFixed(8),
                  transaction_type: 'send',
                  is_executed: true,
                  transaction_id: sendTransaction.txid,
                  faldax_fee: 0,
                  actual_network_fees: parseFloat(sendTransaction.transfer.feeString / 1e8).toFixed(8),
                  estimated_network_fees: parseFloat(getFeeValue.fee / 1e8).toFixed(8),
                  is_done: true,
                  actual_amount: parseFloat(exactSendAmount / 1e8).toFixed(8),
                  is_admin: true,
                  residual_amount: parseFloat(getFeeValue.fee / 1e8).toFixed(8) - parseFloat(sendTransaction.transfer.feeString / 1e8).toFixed(8)
                }
                await residualTransactionModel
                  .query()
                  .insert(transactionDetails);

                var amountValue = parseFloat(exactSendAmount / 1e8).toFixed(8);
                var balanceUpdate = parseFloat(adminAddress.balance) + parseFloat(amountValue)
                console.log("balanceUpdate", balanceUpdate);
                var placedBalanceUpdate = parseFloat(adminAddress.placed_balance) + parseFloat(amountValue)
                var walletBalanceUpdate = await Wallet
                  .query()
                  .where('deleted_at', null)
                  .andWhere('coin_id', coinData[i].id)
                  .andWhere('user_id', 36)
                  .andWhere('is_admin', true)
                  .patch({
                    "balance": balanceUpdate,
                    "placed_balance": placedBalanceUpdate
                  })
              }
            }
          }
        }
      }
    }
  }
}

module.exports = new CronController();