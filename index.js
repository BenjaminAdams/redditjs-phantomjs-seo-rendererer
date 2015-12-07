var phantom = require('phantom');
var express = require("express")
var http = require("http")
var port = process.env.PORT || 8005
var server = module.exports = express();
var request = require('request')
var cheerio = require('cheerio')

var rootUrl = 'https://redditjs.com'

server.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
});
server.enable('trust proxy');

server.get('/api/*', function(req, res) {
  getNonAuth(req, res);
});

server.get('/css/*', redirectStaticFile);
server.get('/js/*', redirectStaticFile);
server.get('/img/*', redirectStaticFile);
server.get('/fonts/*', sendBlank);
server.get('/favicon.ico', redirectStaticFile);

server.get('/*', function(req, res) {
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

function sendBlank(req, res) {
  res.status(200).send('')
}

function getSource(url, cb) {
  url = url.replace('//', '/')
  url = rtrim(url, '/')

  var attempts = 0;

  var fullUrl = rootUrl + url + '?reqAsBot=1'

  phantom.create("--web-security=false", "--ignore-ssl-errors=true", "--load-images=false", '--ssl-protocol=any', '--disk-cache=true', function(ph) {

    ph.createPage(function(page) {

      // page.set('onResourceError', function(resourceError) {
      //  console.log('ERROR:', resourceError)
      //})

      console.log('loading: ', fullUrl)
      page.open(fullUrl, function(status) {
        //console.log("opened page= ", status);

        if (status === 'fail') {
          cb('failed to load url:' + url)
          ph.exit();
        } else {

          evaluatePage(page, attempts, ph, cb)

        }

      });

    });

  });
}

function isItLoaded(data) {

  $ = cheerio.load(data);
  var minContentLength = 100
  var srLength = $('#siteTableContainer').text().length
  var thepostLength = $('.singlePagePost').text().length

  if ($('#siteTableContainer').length && srLength < minContentLength) {
    // console.log('still loading ', srLength)
    return false
  } else if ($('.singlePagePost').length && thepostLength < minContentLength) {
    //  console.log('still loading ', thepostLength)
    return false
  } else {
    //  console.log('DONE ', data.length)
    return true
  }

}

function evaluatePage(page, attempts, ph, cb) {

  setTimeout(function() {
    attempts++
    page.evaluate(function() {
      return document.all[0].innerHTML;
    }, function(data) {

      if (isItLoaded(data) === true || attempts > 10) {
        data = cleanHtml(data)
        cb(data)
        ph.exit();
      } else {
        evaluatePage(page, attempts, ph, cb)
      }

    });
  }, 250);
}

function cleanHtml(data) {
  data = data.replace('/js/app/init/main.min.js', '/js/app/config/config.js')
    //data = data.replace("https://ssl.google-analytics.com/ga.js", '/js/app/config/config.js', '')
  return data

}

function getNonAuth(req, res) {
  console.log('path before', req.path)
  var path = req.path
    //path = path.replace('//api', '/api')
    //path = path.replace('//api/', '')
  path = path.replace('api/', '')

  var urlStr = 'http://api.reddit.com/' + path

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

String.prototype.contains = function(it) {
  return this.indexOf(it) != -1;
};
