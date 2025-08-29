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
package io.orqueio.bpm.engine.rest.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriInfo;
import io.orqueio.bpm.engine.BadUserRequestException;
import io.orqueio.bpm.engine.ProcessEngine;
import io.orqueio.bpm.engine.batch.Batch;
import io.orqueio.bpm.engine.exception.NullValueException;
import io.orqueio.bpm.engine.impl.util.EnsureUtil;
import io.orqueio.bpm.engine.management.SetJobRetriesByJobsAsyncBuilder;
import io.orqueio.bpm.engine.rest.JobRestService;
import io.orqueio.bpm.engine.rest.dto.CountResultDto;
import io.orqueio.bpm.engine.rest.dto.batch.BatchDto;
import io.orqueio.bpm.engine.rest.dto.runtime.JobDto;
import io.orqueio.bpm.engine.rest.dto.runtime.JobQueryDto;
import io.orqueio.bpm.engine.rest.dto.runtime.JobSuspensionStateDto;
import io.orqueio.bpm.engine.rest.dto.runtime.SetJobRetriesDto;
import io.orqueio.bpm.engine.rest.exception.InvalidRequestException;
import io.orqueio.bpm.engine.rest.sub.runtime.JobResource;
import io.orqueio.bpm.engine.rest.sub.runtime.impl.JobResourceImpl;
import io.orqueio.bpm.engine.rest.util.QueryUtil;
import io.orqueio.bpm.engine.runtime.Job;
import io.orqueio.bpm.engine.runtime.JobQuery;

public class JobRestServiceImpl extends AbstractRestProcessEngineAware
    implements JobRestService {

  public JobRestServiceImpl(String engineName, ObjectMapper objectMapper) {
    super(engineName, objectMapper);
  }

  @Override
  public JobResource getJob(String jobId) {
    return new JobResourceImpl(getProcessEngine(), jobId);
  }

  @Override
  public List<JobDto> getJobs(UriInfo uriInfo, Integer firstResult,
                              Integer maxResults) {
    JobQueryDto queryDto = new JobQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryJobs(queryDto, firstResult, maxResults);
  }

  @Override
  public List<JobDto> queryJobs(JobQueryDto queryDto, Integer firstResult,
                                Integer maxResults) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    JobQuery query = queryDto.toQuery(engine);

    List<Job> matchingJobs = QueryUtil.list(query, firstResult, maxResults);

    List<JobDto> jobResults = new ArrayList<>();
    for (Job job : matchingJobs) {
      JobDto resultJob = JobDto.fromJob(job);
      jobResults.add(resultJob);
    }
    return jobResults;
  }

  @Override
  public CountResultDto getJobsCount(UriInfo uriInfo) {
    JobQueryDto queryDto = new JobQueryDto(getObjectMapper(), uriInfo.getQueryParameters());
    return queryJobsCount(queryDto);
  }

  @Override
  public CountResultDto queryJobsCount(JobQueryDto queryDto) {
    ProcessEngine engine = getProcessEngine();
    queryDto.setObjectMapper(getObjectMapper());
    JobQuery query = queryDto.toQuery(engine);

    long count = query.count();
    CountResultDto result = new CountResultDto();
    result.setCount(count);

    return result;
  }

  @Override
  public BatchDto setRetries(SetJobRetriesDto setJobRetriesDto) {
    try {
      EnsureUtil.ensureNotNull("setJobRetriesDto", setJobRetriesDto);
      EnsureUtil.ensureNotNull("retries", setJobRetriesDto.getRetries());
    } catch (NullValueException e) {
      throw new InvalidRequestException(Status.BAD_REQUEST, e.getMessage());
    }
    JobQuery jobQuery = null;
    if (setJobRetriesDto.getJobQuery() != null) {
      JobQueryDto jobQueryDto = setJobRetriesDto.getJobQuery();
      jobQueryDto.setObjectMapper(getObjectMapper());
      jobQuery = jobQueryDto.toQuery(getProcessEngine());
    }

    try {
      SetJobRetriesByJobsAsyncBuilder builder = getProcessEngine().getManagementService()
          .setJobRetriesByJobsAsync(setJobRetriesDto.getRetries().intValue())
          .jobIds(setJobRetriesDto.getJobIds())
          .jobQuery(jobQuery);
      if(setJobRetriesDto.isDueDateSet()) {
        builder.dueDate(setJobRetriesDto.getDueDate());
      }
      Batch batch = builder.executeAsync();
      return BatchDto.fromBatch(batch);
    } catch (BadUserRequestException e) {
      throw new InvalidRequestException(Status.BAD_REQUEST, e.getMessage());
    }
  }

  @Override
  public void updateSuspensionState(JobSuspensionStateDto dto) {
    if (dto.getJobId() != null) {
      String message = "Either jobDefinitionId, processInstanceId, processDefinitionId or processDefinitionKey can be set to update the suspension state.";
      throw new InvalidRequestException(Status.BAD_REQUEST, message);
    }

    dto.updateSuspensionState(getProcessEngine());
  }

}
