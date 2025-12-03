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

/**
 * OAuth2 Login Buttons Controller
 * Fetches the list of configured OAuth2 providers and displays login buttons
 */
module.exports = [
  '$scope',
  '$http',
  'Uri',
  function($scope, $http, Uri) {
    $scope.oauth2Providers = [];

    var providersUrl = Uri.appUri(':appRoot/api/oauth2/providers');

    console.log(
      'OAuth2 buttons controller initialized, fetching from:',
      providersUrl
    );

    $http
      .get(providersUrl)
      .then(function(response) {
        console.log('OAuth2 providers response:', response.data);
        $scope.oauth2Providers = response.data || [];
      })
      .catch(function(error) {
        console.error('OAuth2 providers fetch error:', error);
        $scope.oauth2Providers = [];
      });
  }
];
