/*
 * Copyright TOADDLATERCCS and/or licensed to TOADDLATERCCS
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. TOADDLATERCCS this file to you under the Apache License,
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
package io.orqueio.bpm.spring.boot.starter.property;

import org.springframework.boot.context.properties.ConfigurationProperties;

import static io.orqueio.bpm.spring.boot.starter.property.OrqueioBpmProperties.joinOn;

@ConfigurationProperties("management")
public class ManagementProperties {

  private Health health = new Health();

  /**
   * @return the health
   */
  public Health getHealth() {
    return health;
  }

  /**
   * @param health the health to set
   */
  public void setHealth(Health health) {
    this.health = health;
  }

  @Override
  public String toString() {
    return "ManagementProperties [health=" + health + "]";
  }

  public static class Health {

    private Orqueio orqueio = new Orqueio();

    /**
     * @return the orqueio
     */
    public Orqueio getOrqueio() {
      return orqueio;
    }

    /**
     * @param orqueio the orqueio to set
     */
    public void setOrqueio(Orqueio orqueio) {
      this.orqueio = orqueio;
    }

    @Override
    public String toString() {
      return joinOn(this.getClass())
        .add("orqueio=" + orqueio)
        .toString();
    }

    public class Orqueio {
      private boolean enabled = true;

      /**
       * @return the enabled
       */
      public boolean isEnabled() {
        return enabled;
      }

      /**
       * @param enabled the enabled to set
       */
      public void setEnabled(boolean enabled) {
        this.enabled = enabled;
      }

      @Override
      public String toString() {
        return joinOn(this.getClass())
          .add("enabled=" + enabled)
          .toString();
      }

    }
  }

}
