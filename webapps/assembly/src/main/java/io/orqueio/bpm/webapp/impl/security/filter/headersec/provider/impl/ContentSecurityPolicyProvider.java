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
package io.orqueio.bpm.webapp.impl.security.filter.headersec.provider.impl;

import io.orqueio.bpm.webapp.impl.security.filter.headersec.provider.HeaderSecurityProvider;
import io.orqueio.bpm.webapp.impl.util.ServletFilterUtil;

import javax.servlet.ServletContext;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

public class ContentSecurityPolicyProvider extends HeaderSecurityProvider {

  public static final String HEADER_NAME = "Content-Security-Policy";
  public static final String HEADER_NONCE_PLACEHOLDER = "$NONCE";

  // CSP for legacy AngularJS pages (with nonce)
  public static final String HEADER_DEFAULT_VALUE = ""
    + "base-uri 'self';"
    + "script-src " + HEADER_NONCE_PLACEHOLDER + " 'strict-dynamic' 'unsafe-eval' https: 'self' 'unsafe-inline';"
    + "style-src 'unsafe-inline' 'self';"
    + "default-src 'self';"
    + "img-src 'self' data:;"
    + "block-all-mixed-content;"
    + "form-action 'self';"
    + "frame-ancestors 'none';"
    + "object-src 'none';"
    + "sandbox allow-forms allow-scripts allow-same-origin allow-popups allow-downloads";

  // CSP for Angular SPA (no nonce required)
  public static final String HEADER_ANGULAR_VALUE = ""
    + "base-uri 'self';"
    + "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"
    + "font-src 'self' https://fonts.gstatic.com data:;"
    + "default-src 'self';"
    + "img-src 'self' data: blob:;"
    + "connect-src 'self';"
    + "form-action 'self';"
    + "frame-ancestors 'none';"
    + "object-src 'none'";

  public static final String DISABLED_PARAM = "contentSecurityPolicyDisabled";
  public static final String VALUE_PARAM = "contentSecurityPolicyValue";
  public static final String ATTR_CSP_FILTER_NONCE = "io.orqueio.bpm.csp.nonce";
  public static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

  @Override
  public Map<String, String> initParams() {
    initParams.put(VALUE_PARAM, null);
    initParams.put(DISABLED_PARAM, null);

    return initParams;
  }

  @Override
  public void parseParams() {
    String disabled = initParams.get(DISABLED_PARAM);

    if (ServletFilterUtil.isEmpty(disabled)) {
      setDisabled(false);

    } else {
      setDisabled(Boolean.parseBoolean(disabled));

    }

    String value = initParams.get(VALUE_PARAM);
    if (!ServletFilterUtil.isEmpty(value)) {
      value = normalizeString(value);
      setValue(value);

    } else {
      // Use Angular-compatible CSP by default (no nonce required)
      setValue(HEADER_ANGULAR_VALUE);

    }
  }

  protected String normalizeString(String value) {
    return value
      .trim()
      .replaceAll("\\s+", " "); // replaces [\t\n\x0B\f\r]
  }

  @Override
  public String getHeaderName() {
    return HEADER_NAME;
  }

  @Override
  public String getHeaderValue(final ServletContext servletContext) {
    // Check if the CSP contains nonce placeholder (legacy AngularJS)
    if (value.contains(HEADER_NONCE_PLACEHOLDER)) {
      final String nonce = generateNonce();
      servletContext.setAttribute(ATTR_CSP_FILTER_NONCE, nonce);
      return value.replaceAll("\\" + HEADER_NONCE_PLACEHOLDER, String.format("'nonce-%s'", nonce));
    }
    // Angular CSP - no nonce needed
    return value;
  }

  protected String generateNonce() {
    final byte[] bytes = new byte[20];
    ThreadLocalRandom.current().nextBytes(bytes);
    return ENCODER.encodeToString(bytes);
  }
}
