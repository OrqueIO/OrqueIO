/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const $ = require('jquery');
module.exports = [
  '$scope',
  '$http',
  'AuthenticationService',
  'Notifications',
  '$translate',
  'Views',
  'canonicalAppName',
  'Uri',
  function(
    $scope,
    $http,
    AuthenticationService,
    Notifications,
    $translate,
    views,
    canonicalAppName,
    Uri
  ) {
    $scope.status = 'INIT';
    $scope.showRegisterLink = false;

    // Check for OAuth2 error in URL parameters
    // Use window.location.search because the param is before the hash fragment
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth2_error')) {
      Notifications.addError({
        status: $translate.instant('PAGE_LOGIN_OAUTH2_FAILED'),
        message: $translate.instant('PAGE_LOGIN_OAUTH2_ERROR_MSG'),
        scope: $scope,
        exclusive: true
      });
      // Clean up the URL parameter by redirecting without it
      if (window.history && window.history.replaceState) {
        var cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    // Set the register URL pointing to admin setup page (for initial user creation)
    // URL format: /app/admin/{engine}/setup/#/setup
    // - setup/ in path is required by ProcessEnginesFilter
    // - #/setup is required by AngularJS router in setup.js
    var engineMatch = window.location.pathname.match(/\/app\/\w+\/([^\/]+)/);
    var engineName = engineMatch ? engineMatch[1] : 'default';
    $scope.registerUrl =
      Uri.appUri(':appRoot') + '/app/admin/' + engineName + '/setup/#/setup';

    // Check if setup is required (no admin exists)
    var setupCheckUrl = Uri.appUri(':appRoot/api/oauth2/setup-required');
    $http
      .get(setupCheckUrl)
      .then(function(response) {
        $scope.showRegisterLink = response.data.setupRequired === true;
      })
      .catch(function() {
        // On error, hide the register link
        $scope.showRegisterLink = false;
      });

    // ensure focus on username input
    var autofocusField = $('form[name="signinForm"] [autofocus]')[0];
    if (autofocusField) {
      autofocusField.focus();
    }

    const loginDataPlugins = views.getProviders({
      component: `${canonicalAppName}.login.data`
    });

    $scope.login = function() {
      $scope.status = 'LOADING';
      const loginDataPromise = AuthenticationService.login(
        $scope.username,
        $scope.password
      );

      loginDataPlugins.forEach(loginDataPlugin => {
        loginDataPlugin.result &&
          loginDataPlugin.result(loginDataPromise, $scope);
      });

      return loginDataPromise
        .then(function() {
          $scope.status = 'DONE';
          Notifications.clearAll();
          $scope.$root.$broadcast('first-visit-info-box-dismissed');
        })
        .catch(function(error) {
          $scope.status = 'ERROR';
          delete $scope.username;
          delete $scope.password;

          Notifications.addError({
            status: $translate.instant('PAGE_LOGIN_FAILED'),
            message:
              (error.data && error.data.message) ||
              $translate.instant('PAGE_LOGIN_ERROR_MSG'),
            scope: $scope,
            exclusive: true
          });
        });
    };
  }
];
