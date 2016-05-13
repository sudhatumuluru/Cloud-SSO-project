'use strict';

var logger = require('connect-logger');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var fs = require('fs');
var crypto = require('crypto');
var AuthenticationContext = require('adal-node').AuthenticationContext;

var sampleParameters = {
  tenant : 'daomaikhanh1988yahoo.onmicrosoft.com',
  authorityHostUrl : 'https://login.windows.net',
  clientId : '7c674ce8-0609-4820-88ff-bc897596df53',
  clientSecret: 'fQZYadWRMADdbs7FJUEDMhGN94hPNtdpA3smAKXaspI=',
  username : 'daomaikhanh1988@yahoo.com',
  password : ''
};

var authorityUrl = sampleParameters.authorityHostUrl + '/' + sampleParameters.tenant;
var redirectUri = 'https://cmpe282-project.herokuapp.com/getAToken';
var resource = '00000002-0000-0000-c000-000000000000';

var templateAuthzUrl = 'https://login.windows.net/' + sampleParameters.tenant + '/oauth2/authorize?response_type=code&client_id=<client_id>&redirect_uri=<redirect_uri>&state=<state>&resource=<resource>';


function createAuthorizationUrl(state) {
  var authorizationUrl = templateAuthzUrl.replace('<client_id>', sampleParameters.clientId);
  authorizationUrl = authorizationUrl.replace('<redirect_uri>',redirectUri);
  authorizationUrl = authorizationUrl.replace('<state>', state);
  authorizationUrl = authorizationUrl.replace('<resource>', resource);
  return authorizationUrl;
}

exports.router = {
  index: function(req, res) {
    console.log('redirect to user sign in');
    res.render('index');
  },

  // Clients get redirected here in order to create an OAuth authorize url and redirect them to AAD.
  // There they will authenticate and give their consent to allow this app access to
  // some resource they own.
  auth: function(req, res) {
    crypto.randomBytes(48, function(ex, buf) {
      var token = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');

      res.cookie('authstate', token);
      var authorizationUrl = createAuthorizationUrl(token);

      res.redirect(authorizationUrl);
    });
  },

  // After consent is granted AAD redirects here.  The ADAL library is invoked via the
  // AuthenticationContext and retrieves an access token that can be used to access the
  // user owned resource.
  getAToken: function(req, res) {
    if (req.cookies.authstate !== req.query.state) {
      res.send('error: state does not match');
    }
    var authenticationContext = new AuthenticationContext(authorityUrl);
    authenticationContext.acquireTokenWithAuthorizationCode(req.query.code, redirectUri, resource, sampleParameters.clientId, sampleParameters.clientSecret, function(err, response) {
      var message = '';
      if (err) {
        message = 'error: ' + err.message + '\n';
      }
      message += 'response: ' + JSON.stringify(response);
      if (err) { //display message error
        res.send(message);
        return;
      }
      // Later, if the access token is expired it can be refreshed.
      authenticationContext.acquireTokenWithRefreshToken(response.refreshToken, sampleParameters.clientId, sampleParameters.clientSecret, resource, function(refreshErr, refreshResponse) {
        if (refreshResponse.accessToken) {
          res.cookie('t', refreshResponse.accessToken);
          res.cookie('userId', refreshResponse.userId);
          res.redirect('/dashboard');
        }
      });
    });
  },

  dashboard: function(req, res) {
    var userId = req.cookies.userId;
    var t = req.cookies.t;
    if (!t || !userId) {
      res.redirect('/');
      return;
    }
    res.render('dashboard', {
      userEmail: userId
    });
  }

};
