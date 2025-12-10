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

'use strict';

var template = require('./login.html?raw');
var logo = require('svg-inline-loader?classPrefix&removeSVGTagAttrs=false!./logo.svg');

var Controller = [
  '$scope',
  '$rootScope',
  'Notifications',
  '$location',
  '$translate',
  'widgetLocalConf',
  '$sce',
  'configuration',
  '$http',
  'Views',
  'canonicalAppName',
  function(
    $scope,
    $rootScope,
    Notifications,
    $location,
    $translate,
    localConf,
    $sce,
    configuration,
    $http,
    views,
    canonicalAppName
  ) {
    $scope.logo = $sce.trustAsHtml(logo);
    $scope.status = 'INIT';
    $scope.appName = configuration.getAppName();

    $scope.loginPlugins = views.getProviders({
      component: `${canonicalAppName}.login`
    });

    if ($rootScope.authentication) {
      return $location.path('/');
    }

    $rootScope.showBreadcrumbs = false;

    // First login welcome message - disabled as orqueio-welcome is not always available
    // in all deployment modes (Spring Boot Run doesn't serve static resources by default)
    $scope.showFirstLogin = false;

    $translate('FIRST_LOGIN_INFO').then(function(string) {
      $scope.FirstLoginMessage = $sce.trustAsHtml(string);
    });

    $scope.dismissInfoBox = function() {
      $scope.showFirstLogin = false;
      localConf.set('firstVisit', false);
    };
  }
];

module.exports = [
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/login', {
      template: template,
      controller: Controller
    });
  }
];
