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
package io.orqueio.bpm.model.cmmn;

import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN10_NS;
import static io.orqueio.bpm.model.cmmn.impl.CmmnModelConstants.CMMN11_NS;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

import io.orqueio.bpm.model.cmmn.impl.CmmnParser;
import io.orqueio.bpm.model.cmmn.impl.instance.ApplicabilityRuleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ArtifactImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.AssociationImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.BindingRefinementExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.BodyImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileItemDefinitionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileItemImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileItemOnPartImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileItemStartTriggerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileItemTransitionStandardEventImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseFileModelImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CasePlanModel;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseRefExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseRoleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseRolesImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CaseTaskImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ChildrenImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CmmnElementImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ConditionExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.CriterionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DecisionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DecisionParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DecisionRefExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DecisionTaskImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DefaultControlImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DefinitionsImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DiscretionaryItemImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.DocumentationImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.EntryCriterionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.EventImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.EventListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ExitCriterionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ExtensionElementsImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.HumanTaskImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.IfPartImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ImportImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.InputCaseParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.InputDecisionParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.InputProcessParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.InputsCaseParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ItemControlImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ManualActivationRuleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.MilestoneImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.OnPartImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.OutputCaseParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.OutputDecisionParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.OutputProcessParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.OutputsCaseParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ParameterMappingImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanFragmentImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemControlImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemDefinitionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemOnPartImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemStartTriggerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanItemTransitionStandardEventImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PlanningTableImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ProcessImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ProcessParameterImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ProcessRefExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.ProcessTaskImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.PropertyImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.RelationshipImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.RepetitionRuleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.RequiredRuleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.RoleImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.SentryImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.SourceImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.StageImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.StartTriggerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TableItemImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TargetImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TaskImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TextAnnotationImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TextImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TimerEventImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TimerEventListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TimerExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.TransformationExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.UserEventImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.UserEventListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaCaseExecutionListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaExpressionImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaFieldImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaInImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaOutImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaScriptImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaStringImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaTaskListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaVariableListenerImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaVariableOnPartImpl;
import io.orqueio.bpm.model.cmmn.impl.instance.camunda.CamundaVariableTransitionEventImpl;
import io.orqueio.bpm.model.xml.Model;
import io.orqueio.bpm.model.xml.ModelBuilder;
import io.orqueio.bpm.model.xml.ModelException;
import io.orqueio.bpm.model.xml.ModelParseException;
import io.orqueio.bpm.model.xml.ModelValidationException;
import io.orqueio.bpm.model.xml.impl.instance.ModelElementInstanceImpl;
import io.orqueio.bpm.model.xml.impl.util.IoUtil;

/**
 * @author Roman Smirnov
 *
 */
public class Cmmn {

  /** the singleton instance of {@link Cmmn}. If you want to customize the behavior of Cmmn,
   * replace this instance with an instance of a custom subclass of {@link Cmmn}. */
  public static Cmmn INSTANCE = new Cmmn();

  /** the parser used by the Cmmn implementation. */
  private CmmnParser cmmnParser = new CmmnParser();
  private final ModelBuilder cmmnModelBuilder;

  /** The {@link Model}
   */
  private Model cmmnModel;

  /**
   * Allows reading a {@link CmmnModelInstance} from a File.
   *
   * @param file the {@link File} to read the {@link CmmnModelInstance} from
   * @return the model read
   * @throws CmmnModelException if the model cannot be read
   */
  public static CmmnModelInstance readModelFromFile(File file) {
    return INSTANCE.doReadModelFromFile(file);
  }

  /**
   * Allows reading a {@link CmmnModelInstance} from an {@link InputStream}
   *
   * @param stream the {@link InputStream} to read the {@link CmmnModelInstance} from
   * @return the model read
   * @throws ModelParseException if the model cannot be read
   */
  public static CmmnModelInstance readModelFromStream(InputStream stream) {
    return INSTANCE.doReadModelFromInputStream(stream);
  }

  /**
   * Allows writing a {@link CmmnModelInstance} to a File. It will be
   * validated before writing.
   *
   * @param file the {@link File} to write the {@link CmmnModelInstance} to
   * @param modelInstance the {@link CmmnModelInstance} to write
   * @throws CmmnModelException if the model cannot be written
   * @throws ModelValidationException if the model is not valid
   */
  public static void writeModelToFile(File file, CmmnModelInstance modelInstance) {
    INSTANCE.doWriteModelToFile(file, modelInstance);
  }

  /**
   * Allows writing a {@link CmmnModelInstance} to an {@link OutputStream}. It will be
   * validated before writing.
   *
   * @param stream the {@link OutputStream} to write the {@link CmmnModelInstance} to
   * @param modelInstance the {@link CmmnModelInstance} to write
   * @throws ModelException if the model cannot be written
   * @throws ModelValidationException if the model is not valid
   */
  public static void writeModelToStream(OutputStream stream, CmmnModelInstance modelInstance) {
    INSTANCE.doWriteModelToOutputStream(stream, modelInstance);
  }

  /**
   * Allows the conversion of a {@link CmmnModelInstance} to an {@link String}. It will
   * be validated before conversion.
   *
   * @param modelInstance  the model instance to convert
   * @return the XML string representation of the model instance
   */
  public static String convertToString(CmmnModelInstance modelInstance) {
    return INSTANCE.doConvertToString(modelInstance);
  }

  /**
   * Validate model DOM document
   *
   * @param modelInstance the {@link CmmnModelInstance} to validate
   * @throws ModelValidationException if the model is not valid
   */
  public static void validateModel(CmmnModelInstance modelInstance) {
    INSTANCE.doValidateModel(modelInstance);
  }

  /**
   * Allows creating an new, empty {@link CmmnModelInstance}.
   *
   * @return the empty model.
   */
  public static CmmnModelInstance createEmptyModel() {
    return INSTANCE.doCreateEmptyModel();
  }

  /**
   * Register known types of the Cmmn model
   */
  protected Cmmn() {
    cmmnModelBuilder = ModelBuilder.createInstance("CMMN Model");
    cmmnModelBuilder.alternativeNamespace(CMMN10_NS, CMMN11_NS);
    doRegisterTypes(cmmnModelBuilder);
    cmmnModel = cmmnModelBuilder.build();
  }

  protected CmmnModelInstance doReadModelFromFile(File file) {
    InputStream is = null;
    try {
      is = new FileInputStream(file);
      return doReadModelFromInputStream(is);

    } catch (FileNotFoundException e) {
      throw new CmmnModelException("Cannot read model from file "+file+": file does not exist.");

    } finally {
      IoUtil.closeSilently(is);

    }
  }

  protected CmmnModelInstance doReadModelFromInputStream(InputStream is) {
    return cmmnParser.parseModelFromStream(is);
  }

  protected void doWriteModelToFile(File file, CmmnModelInstance modelInstance) {
    OutputStream os = null;
    try {
      os = new FileOutputStream(file);
      doWriteModelToOutputStream(os, modelInstance);
    }
    catch (FileNotFoundException e) {
      throw new CmmnModelException("Cannot write model to file "+file+": file does not exist.");
    } finally {
      IoUtil.closeSilently(os);
    }
  }

  protected void doWriteModelToOutputStream(OutputStream os, CmmnModelInstance modelInstance) {
    // validate DOM document
    doValidateModel(modelInstance);
    // write XML
    IoUtil.writeDocumentToOutputStream(modelInstance.getDocument(), os);
  }

  protected String doConvertToString(CmmnModelInstance modelInstance) {
    // validate DOM document
    doValidateModel(modelInstance);
    // convert to XML string
    return IoUtil.convertXmlDocumentToString(modelInstance.getDocument());
  }

  protected void doValidateModel(CmmnModelInstance modelInstance) {
    cmmnParser.validateModel(modelInstance.getDocument());
  }

  protected CmmnModelInstance doCreateEmptyModel() {
    return cmmnParser.getEmptyModel();
  }

  protected void doRegisterTypes(ModelBuilder modelBuilder) {
    ArtifactImpl.registerType(modelBuilder);
    ApplicabilityRuleImpl.registerType(modelBuilder);
    AssociationImpl.registerType(modelBuilder);
    BindingRefinementExpressionImpl.registerType(modelBuilder);
    BodyImpl.registerType(modelBuilder);
    CaseFileImpl.registerType(modelBuilder);
    CaseFileItemDefinitionImpl.registerType(modelBuilder);
    CaseFileItemImpl.registerType(modelBuilder);
    CaseFileItemOnPartImpl.registerType(modelBuilder);
    CaseFileItemStartTriggerImpl.registerType(modelBuilder);
    CaseFileItemTransitionStandardEventImpl.registerType(modelBuilder);
    CaseFileModelImpl.registerType(modelBuilder);
    CaseImpl.registerType(modelBuilder);
    CaseParameterImpl.registerType(modelBuilder);
    CasePlanModel.registerType(modelBuilder);
    CaseRoleImpl.registerType(modelBuilder);
    CaseRolesImpl.registerType(modelBuilder);
    CaseRefExpressionImpl.registerType(modelBuilder);
    CaseTaskImpl.registerType(modelBuilder);
    ChildrenImpl.registerType(modelBuilder);
    CmmnElementImpl.registerType(modelBuilder);
    ConditionExpressionImpl.registerType(modelBuilder);
    CriterionImpl.registerType(modelBuilder);
    DecisionImpl.registerType(modelBuilder);
    DecisionParameterImpl.registerType(modelBuilder);
    DecisionRefExpressionImpl.registerType(modelBuilder);
    DecisionTaskImpl.registerType(modelBuilder);
    DefaultControlImpl.registerType(modelBuilder);
    DefinitionsImpl.registerType(modelBuilder);
    DiscretionaryItemImpl.registerType(modelBuilder);
    DocumentationImpl.registerType(modelBuilder);
    EntryCriterionImpl.registerType(modelBuilder);
    EventImpl.registerType(modelBuilder);
    EventListenerImpl.registerType(modelBuilder);
    ExitCriterionImpl.registerType(modelBuilder);
    ExpressionImpl.registerType(modelBuilder);
    ExtensionElementsImpl.registerType(modelBuilder);
    HumanTaskImpl.registerType(modelBuilder);
    IfPartImpl.registerType(modelBuilder);
    ImportImpl.registerType(modelBuilder);
    InputCaseParameterImpl.registerType(modelBuilder);
    InputProcessParameterImpl.registerType(modelBuilder);
    InputsCaseParameterImpl.registerType(modelBuilder);
    InputDecisionParameterImpl.registerType(modelBuilder);
    InputProcessParameterImpl.registerType(modelBuilder);
    ItemControlImpl.registerType(modelBuilder);
    ManualActivationRuleImpl.registerType(modelBuilder);
    MilestoneImpl.registerType(modelBuilder);
    ModelElementInstanceImpl.registerType(modelBuilder);
    OnPartImpl.registerType(modelBuilder);
    OutputCaseParameterImpl.registerType(modelBuilder);
    OutputProcessParameterImpl.registerType(modelBuilder);
    OutputsCaseParameterImpl.registerType(modelBuilder);
    OutputDecisionParameterImpl.registerType(modelBuilder);
    OutputProcessParameterImpl.registerType(modelBuilder);
    ParameterImpl.registerType(modelBuilder);
    ParameterMappingImpl.registerType(modelBuilder);
    PlanFragmentImpl.registerType(modelBuilder);
    PlanItemControlImpl.registerType(modelBuilder);
    PlanItemDefinitionImpl.registerType(modelBuilder);
    PlanItemImpl.registerType(modelBuilder);
    PlanItemOnPartImpl.registerType(modelBuilder);
    PlanItemStartTriggerImpl.registerType(modelBuilder);
    PlanItemTransitionStandardEventImpl.registerType(modelBuilder);
    PlanningTableImpl.registerType(modelBuilder);
    ProcessImpl.registerType(modelBuilder);
    ProcessParameterImpl.registerType(modelBuilder);
    ProcessRefExpressionImpl.registerType(modelBuilder);
    ProcessTaskImpl.registerType(modelBuilder);
    PropertyImpl.registerType(modelBuilder);
    RelationshipImpl.registerType(modelBuilder);
    RepetitionRuleImpl.registerType(modelBuilder);
    RequiredRuleImpl.registerType(modelBuilder);
    RoleImpl.registerType(modelBuilder);
    SentryImpl.registerType(modelBuilder);
    SourceImpl.registerType(modelBuilder);
    StageImpl.registerType(modelBuilder);
    StartTriggerImpl.registerType(modelBuilder);
    TableItemImpl.registerType(modelBuilder);
    TargetImpl.registerType(modelBuilder);
    TaskImpl.registerType(modelBuilder);
    TextAnnotationImpl.registerType(modelBuilder);
    TextImpl.registerType(modelBuilder);
    TimerEventImpl.registerType(modelBuilder);
    TimerEventListenerImpl.registerType(modelBuilder);
    TransformationExpressionImpl.registerType(modelBuilder);
    TimerExpressionImpl.registerType(modelBuilder);
    TransformationExpressionImpl.registerType(modelBuilder);
    UserEventImpl.registerType(modelBuilder);
    UserEventListenerImpl.registerType(modelBuilder);

    /** camunda extensions */
    CamundaCaseExecutionListenerImpl.registerType(modelBuilder);
    CamundaExpressionImpl.registerType(modelBuilder);
    CamundaFieldImpl.registerType(modelBuilder);
    CamundaInImpl.registerType(modelBuilder);
    CamundaOutImpl.registerType(modelBuilder);
    CamundaScriptImpl.registerType(modelBuilder);
    CamundaStringImpl.registerType(modelBuilder);
    CamundaTaskListenerImpl.registerType(modelBuilder);
    CamundaVariableListenerImpl.registerType(modelBuilder);
    CamundaVariableOnPartImpl.registerType(modelBuilder);
    CamundaVariableTransitionEventImpl.registerType(modelBuilder);
  }

  /**
   * @return the {@link Model} instance to use
   */
  public Model getCmmnModel() {
    return cmmnModel;
  }

  public ModelBuilder getCmmnModelBuilder() {
    return cmmnModelBuilder;
  }

  /**
   * @param cmmnModel the cmmnModel to set
   */
  public void setCmmnModel(Model cmmnModel) {
    this.cmmnModel = cmmnModel;
  }

}
