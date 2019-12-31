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
      });
      return ("Done")
    } catch (error) {
      console.log(error)
    }
  }


  // Method for Bitcoin News Update
  async bitcoinNews() {
    try {
      request('https://news.bitcoin.com/feed/', async function (error, response, body) {

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
        return ("Done");
      })
    } catch (error) {
      console.log(error)
    }
  }

  // Method for Coin Telegraph News Update
  async coinTelegraph() {
    try {
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

        return ("Done");
      })
    } catch (error) {
      console.log(error)
    }
  }

  // Email Send To User
  async email(slug, user) {
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

  }

  async getDecryptData(keyValue) {
    var key = [63, 17, 35, 31, 99, 50, 42, 86, 89, 80, 47, 14, 12, 98, 44, 78];
    var iv = [45, 56, 89, 10, 98, 54, 13, 27, 82, 61, 53, 86, 67, 96, 94, 51]

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

    return decryptedText
  }

  async text(slug, user) {
    try {
      var account_sid = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_SID);
      var accountSid = account_sid; // Your Account SID from www.twilio.com/console
      var authToken = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_AUTH_TOKEN) // Your Auth Token from www.twilio.com/console
      var fromNumber = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_FROM_NUMBER)
      var user_id = inputs.user.id;

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
        to: inputs.user.phone_number, // Text this number
        from: fromNumber // From a valid Twilio number
      }).then((message) => {
        return (1);
      })
        .catch((err) => {
          console.log("ERROR >>>>>>>>>>>", err)
        })
    } catch (error) {
      console.log(error)
    }
  }

  // User Threshold Notification
  async checkTheresoldNotification() {
    try {
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

      return (1)
    } catch (error) {
      console.log(error)
    }
  }

  async deleteEvent(event_id) {
    try {
      var keyValue = process.env.ACCESS_TOKEN

      var decryptedText = await module
        .exports
        .getDecryptData(keyValue);

      var promise = await new Promise(async function (resolve, reject) {
        await request
          .delete(process.env.SIMPLEX_URL + "events/" + event_id, {
            headers: {
              'Authorization': 'ApiKey ' + decryptedText,
              'Content-Type': 'application/json'
            }
          }, function (err, res, body) {
            return (res.body)
          });
      })
      return promise;

    } catch (err) {
      console.log(err);
      await logger.error(err.message)
    }
  }

  async getEventData() {
    try {
      var keyValue = process.env.SIMPLEX_ACCESS_TOKEN

      var decryptedText = await module
        .exports
        .getDecryptData(keyValue);

      console.log("decryptedText", decryptedText)

      var promise = await new Promise(async function (resolve, reject) {
        await request
          .get(process.env.SIMPLEX_URL + 'events', {
            headers: {
              'Authorization': 'ApiKey ' + decryptedText,
              'Content-Type': 'application/json'
            }
          }, function (err, res, body) {
            console.log("err", err);
            console.log("res", res);
            console.log("body", body);
            resolve(JSON.parse(res.body));
          });
      })

      return promise;

    } catch (error) {
      // console.log(error);
    }
  }

  async getReferredData(trade_object, user_id, transaction_id) {
    try {
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
            addRefferalAddData.txid = inputs.transaction_id;
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
            addRefferalAddData.txid = inputs.transaction_id;
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
      return (1)
    } catch (error) {
      console.log(error);
    }
  }

  async checkPaymentStatus() {
    try {
      var data = await module
        .exports
        .getEventData();
      var tradeData = await SimplexTradeHistoryModel
        .query()
        .select()
        .where('deleted_at', null)
        .andWhere('trade_type', 3)
        .orderBy('id', 'DESC');

      for (var i = 0; i < tradeData.length; i++) {
        for (var j = 0; j < data.events.length; j++) {
          var payment_data = JSON.stringify(data.events[j].payment);
          payment_data = JSON.parse(payment_data);
          if (payment_data.id == tradeData[i].payment_id && payment_data.status == "pending_simplexcc_payment_to_partner") {
            var feesFaldax = await AdminSettingModel
              .query()
              .first()
              .select()
              .where('deleted_at', null)
              .andWhere('slug', 'simplex_faldax_fees')
              .orderBy('id', 'DESC')

            var coinData = await Coins
              .query()
              .first()
              .select()
              .where('deleted_at', null)
              .andWhere('is_active', true)
              .andWhere('coin', tradeData[i].currency)
              .orderBy('id', 'DESC');

            var walletData = await Wallet
              .query()
              .first()
              .select()
              .where('coin_id', coinData.id)
              .andWhere('deleted_at', null)
              .andWhere('receive_address', tradeData[i].address)
              .andWhere('user_id', tradeData[i].user_id)
              .orderBy('id', 'DESC');

            if (walletData != undefined) {
              var balanceData = parseFloat(walletData.balance) + (tradeData[i].fill_price)
              var placedBalanceData = parseFloat(walletData.placed_balance) + (tradeData[i].fill_price)
              var walletUpdate = await walletData
                .$query()
                .patch({
                  balance: balanceData,
                  placed_balance: placedBalanceData
                });

              var walletUpdated = await Wallet
                .query()
                .first()
                .select()
                .where('coin_id', coinData.id)
                .andWhere('deleted_at', null)
                .andWhere('is_admin', true)
                .andWhere('user_id', 36)
                .orderBy('id', 'DESC');

              if (walletUpdated != undefined) {
                var balance = parseFloat(walletUpdated.balance) + (tradeData[i].fill_price);
                var placed_balance = parseFloat(walletUpdated.placed_balance) + (tradeData[i].fill_price);
                var walletUpdated = await walletUpdated
                  .$query()
                  .patch({
                    balance: balance,
                    placed_balance: placed_balance
                  })
              }
            }
            if (tradeData[i].simplex_payment_status == 1) {
              var tradeHistoryData = await SimplexTradeHistoryModel
                .query()
                .select()
                .first()
                .where('id', tradeData[i].id)
                .patch({
                  simplex_payment_status: 2,
                  is_processed: true
                });

              let referredData = await module.exports.getReferredData(tradeHistoryData, tradeHistoryData.user_id, tradeData[i].id);

              await module.exports.deleteEvent(data.events[j].event_id)
            }
          } else if (payment_data.id == tradeData[i].payment_id) {
            if (payment_data.status == "pending_simplexcc_approval") {
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
            } else if (payment_data.status == "cancelled") {
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
    } catch (err) {
      console.log(err);
      await logger.error(err.message)
    }
  }

  async getMarketPrice(symbol) {
    try {
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

        return (body);
      });
    } catch (error) {
      console.log(error);
    }
  }

  async kycpicUpload(params) {
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

      } catch (error) {
        console.log('error', error);
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

  async kyccron() {
    try {
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
    }
  }

  async addPriceFromCoinmarketData() {
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

      } catch (error) {
        console.log('error', error);
      }
    })
  }

}

module.exports = new CronController();