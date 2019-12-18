/* Common functions which can be used anywhere */
// Used for Response Output in JSON Format
var jsonFormat = async ( res, status, message, data, extra="" )=>{
    var output = {
        "status": status,
        "message": message,
        "data": data
    };
    if( extra != "" ){
      output.extra = extra;
    }
    res.status( status );
    return res.json( output );
}

// To Generate Random Alphanumberic String
var randomString = (length)=> {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

var SendEmail = async ( res, requestedData )=> {
    
    var template = requestedData.template;
    var email = requestedData.email;
    // var body = requestedData.body;
    var extraData = requestedData.extraData;
    var subject = requestedData.subject;   
    
    try{
        await res.mailer
        .send( template, {
            to: email,
            subject: process.env.MAIL_FROM_NAME + ': ' + subject,
            // body: body, 
            data : extraData,// All additional properties are also passed to the template as local variables.
            PROJECT_NAME: process.env.PROJECT_NAME,
            SITE_URL: process.env.SITE_URL
        }, function (err) {
            console.log(err);
            if (err) {
                return 0;                
            } else {
                return 1;
            }
        });
    }catch(err){
        console.log("EMail err:", err);
        return 0; 
    }
}


module.exports = {
  jsonFormat,
  randomString,
  SendEmail,  
}

