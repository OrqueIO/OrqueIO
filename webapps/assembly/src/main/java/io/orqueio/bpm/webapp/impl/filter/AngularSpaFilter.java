/*
 * Copyright OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
package io.orqueio.bpm.webapp.impl.filter;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;

/**
 * Filter to set appropriate CSP headers for Angular applications.
 * This filter intercepts and overrides the strict CSP set by HttpHeaderSecurityFilter
 * to allow Angular's inline scripts and styles.
 */
public class AngularSpaFilter implements Filter {

  // CSP policy for Angular - allows scripts without nonce
  private static final String ANGULAR_CSP =
      "base-uri 'self';" +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
      "font-src 'self' https://fonts.gstatic.com;" +
      "default-src 'self';" +
      "img-src 'self' data:;" +
      "connect-src 'self';" +
      "form-action 'self';" +
      "frame-ancestors 'none';" +
      "object-src 'none'";

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    // No initialization required
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {

    HttpServletResponse httpResponse = (HttpServletResponse) response;

    // Wrap response to intercept and override CSP header set by HttpHeaderSecurityFilter
    HttpServletResponseWrapper wrappedResponse = new HttpServletResponseWrapper(httpResponse) {
      @Override
      public void setHeader(String name, String value) {
        if ("Content-Security-Policy".equalsIgnoreCase(name)) {
          // Replace strict CSP with Angular-compatible CSP
          super.setHeader(name, ANGULAR_CSP);
        } else {
          super.setHeader(name, value);
        }
      }

      @Override
      public void addHeader(String name, String value) {
        if ("Content-Security-Policy".equalsIgnoreCase(name)) {
          // Replace strict CSP with Angular-compatible CSP
          super.setHeader(name, ANGULAR_CSP);
        } else {
          super.addHeader(name, value);
        }
      }
    };

    chain.doFilter(request, wrappedResponse);
  }

  @Override
  public void destroy() {
    // No cleanup required
  }
}
