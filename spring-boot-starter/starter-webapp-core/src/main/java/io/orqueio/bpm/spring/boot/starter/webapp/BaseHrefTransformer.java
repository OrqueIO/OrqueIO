/*
 * Copyright OrqueIO and/or licensed to OrqueIO
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. OrqueIO licenses this file to you under the Apache License,
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

package io.orqueio.bpm.spring.boot.starter.webapp;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.resource.ResourceTransformer;
import org.springframework.web.servlet.resource.ResourceTransformerChain;
import org.springframework.web.servlet.resource.TransformedResource;

/**
 * Rewrites the {@code <base href>} in {@code index.html} at request time so that
 * {@code server.servlet.context-path} is honoured regardless of how the webjar was built.
 */
public class BaseHrefTransformer implements ResourceTransformer {

  private static final String INDEX_HTML = "index.html";
  private static final String BASE_HREF_PATTERN = "<base href=\"[^\"]*\">";

  private final String applicationPath;

  public BaseHrefTransformer(String applicationPath) {
    this.applicationPath = applicationPath;
  }

  @Override
  @NonNull
  public Resource transform(@NonNull HttpServletRequest request,
                            @NonNull Resource resource,
                            @NonNull ResourceTransformerChain chain) throws IOException {
    resource = chain.transform(request, resource);

    if (!INDEX_HTML.equals(resource.getFilename())) {
      return resource;
    }

    String baseHref = request.getContextPath() + applicationPath + "/app/";
    String content = resource.getContentAsString(StandardCharsets.UTF_8);
    String rewritten = content.replaceFirst(BASE_HREF_PATTERN, "<base href=\"" + baseHref + "\">");

    return new TransformedResource(resource, rewritten.getBytes(StandardCharsets.UTF_8));
  }
}
