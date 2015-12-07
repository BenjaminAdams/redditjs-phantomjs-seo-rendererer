var phantom = require('phantom');
var express = require("express")
var http = require("http")
var port = process.env.PORT || 8005
var server = module.exports = express();
var request = require('request')

var rootUrl = 'https://redditjs.com'

server.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
});
server.enable('trust proxy');

server.get('/api/*', function(req, res) {

  getNonAuth(req, res)
});

server.get('/css/*', redirectStaticFile);
server.get('/js/*', redirectStaticFile);
server.get('/img/*', redirectStaticFile);
server.get('/favicon.ico', redirectStaticFile);

server.get('/*', function(req, res) {
  //console.log(req.path)

  getSource(req.path, function(data) {

    res.status(200).send(data);

  })
});

http.createServer(server).listen(port);

//getSource("/r/worldnews/comments/27yg8m/australian_government_grabs_360_million_from_idle/", function(data) {
//console.log('got data', data)
//})

function redirectStaticFile(req, res) {
  res.redirect(rootUrl + req.path)
}

function getSource(url, cb) {
  url = url.replace('//', '/')
  url = rtrim(url, '/')

  var fullUrl = rootUrl + url + '?reqAsBot'

  phantom.create("--web-security=false", "--ignore-ssl-errors=true", "--load-images=false", '--ssl-protocol=any', '--disk-cache=true', function(ph) {

    ph.createPage(function(page) {
      //console.log(page)

      // page.set('onResourceError', function(resourceError) {
      //   console.log('ERROR:', resourceError)
      // })

      console.log('loading: ', fullUrl)
      page.open(fullUrl, function(status) {
        //console.log("opened page= ", status);

        if (status === 'fail') {
          cb('failed to load url:' + url)
        } else {
          setTimeout(function() {
            page.evaluate(function() {
              return document.all[0].innerHTML;

            }, function(data) {
              cb(data)
              ph.exit();
            });
          }, 1500)
        }

      });

    });

  });
}

function changeHtml(html) {

  return html
}

function getNonAuth(req, res) {
  console.log('path before', req.path)
  var path = req.path
    //path = path.replace('//api', '/api')
    //path = path.replace('//api/', '')
  path = path.replace('api/', '')

  console.log('path=', path)

  // var url_parts = url.parse(req.url, true);
  // var urlStr = url_parts.query.url
  // var cookie = url_parts.query.cookie
  // var queryParams = url_parts.path.replace('/api/?url=', '');
  // queryParams = queryParams.replace(urlStr, '')

  // delete queryParams.url;
  // queryParams = this.ltrim(queryParams, '&');

  urlStr = 'http://api.reddit.com/' + path

  var options = {
    url: urlStr
  }

  request.get(options, function(error, response, body) {
    if (error) {
      if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
        return res.send(404)
      } else {
        return res.send(500)
      }
    }

    //console.log('body=', body)

    if (typeof response !== 'undefined' && (response.statusCode == 200 || response.statusCode == 304)) {
      return res.json(JSON.parse(body))
    } else {
      return res.send(404)
    }
  });

}

function rtrim(str, chr) {
  var rgxtrim = (!chr) ? new RegExp('\\s+$') : new RegExp(chr + '+$');
  return str.replace(rgxtrim, '');
}
