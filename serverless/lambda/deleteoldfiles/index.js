let request = require('request');
let API_URL = 'https://1111111111.execute-api.eu-west-1.amazonaws.com';

let makeResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    isBase64Encoded: false,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: body
  };
}


let deleteOldFiles = async () => {
  return new Promise((resolve, reject) => {
    request.post({
      url: API_URL + '/sendcommand',
      json: true,
      body: {
        command: 'find /mnt/efs -maxdepth 1 -mmin +120 -type d -exec rm -r {} \\;',
        type: 'command'
      }
    }, (error, res, body) => {
      if (error) {
        console.error('Request failed:', error);
        reject();
      } else {
        if (res.statusCode != 200) {
          console.error('Error:', res.statusCode, JSON.stringify(body));
          reject();
        }
        let response = makeResponse(200, JSON.stringify({
          message: 'OK DELETED'
        }));
        resolve(response);
      }
    });
  })
}

let main = async () => {
  let response;
  response = await deleteOldFiles();
  return response;
}

module.exports.handler = async (event) => {
  return await main();
}
