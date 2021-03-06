/*
 * Copyright 2019 ThoughtWorks, Inc.
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

import {MithrilViewComponent} from "jsx/mithril-component";
import m from "mithril";
import {Pipelines, PipelineWithOrigin} from "models/new-environments/environment_pipelines";
import {Environments, EnvironmentWithOrigin} from "models/new-environments/environments";
import s from "underscore.string";
import {FlashMessage, MessageType} from "views/components/flash_message";
import {CheckboxField, HelpText, SearchField} from "views/components/forms/input_fields";
import {Modal, ModalState, Size} from "views/components/modal";
import {PipelinesViewModel} from "views/pages/new-environments/models/pipelines_view_model";
import styles from "./edit_pipelines.scss";

interface SelectAllNoneWidgetAttrs {
  pipelinesVM: PipelinesViewModel;
}

export class PipelineFilterWidget extends MithrilViewComponent<SelectAllNoneWidgetAttrs> {
  view(vnode: m.Vnode<SelectAllNoneWidgetAttrs>) {
    return <div class={styles.pipelineFilterWrapper}>
      <span>Pipelines</span>
      <div class={styles.searchFieldWrapper}>
        <SearchField label="pipeline-search" placeholder="pipeline name"
                     property={vnode.attrs.pipelinesVM.searchText}/>
      </div>
    </div>;
  }
}

interface PipelinesVMAttrs {
  pipelinesVM: PipelinesViewModel;
}

interface PipelineCheckboxListWidgetAttrs {
  readonly: boolean;
  title: string;
  pipelines: Pipelines;
  pipelineSelectedFn: (p: PipelineWithOrigin) => (p: boolean | undefined) => boolean | undefined;
}

export class PipelineCheckboxListWidget extends MithrilViewComponent<PipelineCheckboxListWidgetAttrs> {
  view(vnode: m.Vnode<PipelineCheckboxListWidgetAttrs>) {
    const pipelines = vnode.attrs.pipelines;

    if (pipelines.length === 0) {
      return;
    }

    return <div class={styles.pipelinesContainer} data-test-id={s.slugify(vnode.attrs.title)}>
      <div class={styles.header}>{vnode.attrs.title}</div>

      {
        pipelines.map((pipeline) => {
          return <div class={styles.pipelineCheckbox} data-test-id={`pipeline-checkbox-for-${pipeline.name()}`}>
            <CheckboxField label={pipeline.name()}
                           readonly={vnode.attrs.readonly}
                           property={vnode.attrs.pipelineSelectedFn(pipeline)}/>
          </div>;
        })
      }
    </div>;
  }
}

export class UnavailablePipelinesBecauseOfOtherEnvironmentWidget extends MithrilViewComponent<PipelinesVMAttrs> {
  view(vnode: m.Vnode<PipelinesVMAttrs>) {
    const pipelines = vnode.attrs.pipelinesVM.pipelinesDefinedInOtherEnvironment();
    if (pipelines.length === 0) {
      return;
    }

    const title = "Unavailable pipelines (Already associated with environments):";
    return <div class={styles.pipelinesContainer} data-test-id={s.slugify(title)}>
      <div class={styles.header}> {title} </div>
      <ul>
        {
          pipelines.map((pipeline) => {
            const environmentLink = <span data-test-id={`pipeline-list-item-for-${pipeline.name()}`}
                                          class={styles.link}>
              (ENVIRONMENT:
              <a href="#">
                {vnode.attrs.pipelinesVM.environments.findEnvironmentForPipeline(pipeline.name())!.name()}
              </a>
              )
            </span>;

            return <li>
              <span>{pipeline.name()}</span>
              <HelpText helpText={environmentLink}
                        helpTextId={`env-link-for-pipeline-${pipeline.name()}`}/>
            </li>;
          })
        }
      </ul>
    </div>;
  }
}

export class UnavailablePipelinesBecauseDefinedInConfigRepoWidget extends MithrilViewComponent<PipelinesVMAttrs> {
  view(vnode: m.Vnode<PipelinesVMAttrs>) {
    const pipelines = vnode.attrs.pipelinesVM.unassociatedPipelinesDefinedInConfigRepository();
    if (pipelines.length === 0) {
      return;
    }

    const title = "Unavailable pipelines (Defined in config repository):";
    return <div class={styles.pipelinesContainer} data-test-id={s.slugify(title)}>
      <div class={styles.header}>{title}</div>
      <ul>
        {
          pipelines.map((pipeline) => {
            const configRepoLink = <span data-test-id={`pipeline-list-item-for-${pipeline.name()}`} class={styles.link}>
              (CONFIG REPO:
              <a href="#">
                {pipeline.origin().id()}
              </a>
              )
            </span>;

            return <li>
              <span>{pipeline.name()}</span>
              <HelpText helpText={configRepoLink}
                        helpTextId={`config-repo-link-for-pipeline-${pipeline.name()}`}/>
            </li>;
          })
        }
      </ul>
    </div>;
  }
}

export class EditPipelinesModal extends Modal {
  readonly pipelinesVM: PipelinesViewModel;

  constructor(env: EnvironmentWithOrigin, environments: Environments) {
    super(Size.medium);
    this.modalState  = ModalState.LOADING;
    this.fixedHeight = true;
    this.pipelinesVM = new PipelinesViewModel(env, environments);
  }

  oninit() {
    super.oninit();
    this.pipelinesVM.fetchAllPipelines(() => {
      this.modalState = ModalState.OK;
    });
  }

  title(): string {
    return "Edit Pipelines Association";
  }

  body(): m.Children {
    let noPipelinesMsg: m.Child | undefined;
    if (this.pipelinesVM.filteredPipelines().length === 0) {
      noPipelinesMsg = <FlashMessage type={MessageType.info}
                                     message={`No pipelines matching search text '${this.pipelinesVM.searchText()}' found!`}/>;
    }

    return <div>
      <FlashMessage type={MessageType.alert} message={this.pipelinesVM.errorMessage()}/>
      <PipelineFilterWidget pipelinesVM={this.pipelinesVM}/>
      <div class={styles.allPipelinesWrapper}>
        {noPipelinesMsg}
        <PipelineCheckboxListWidget pipelines={this.pipelinesVM.availablePipelines()}
                                    title={"Available Pipelines:"}
                                    readonly={false}
                                    pipelineSelectedFn={this.pipelinesVM.pipelineSelectedFn.bind(this.pipelinesVM)}/>
        <PipelineCheckboxListWidget pipelines={this.pipelinesVM.configRepoEnvironmentPipelines()}
                                    title={"Pipelines associated with this environment in configuration repository:"}
                                    readonly={true}
                                    pipelineSelectedFn={this.pipelinesVM.pipelineSelectedFn.bind(this.pipelinesVM)}/>
        <UnavailablePipelinesBecauseOfOtherEnvironmentWidget pipelinesVM={this.pipelinesVM}/>
        <UnavailablePipelinesBecauseDefinedInConfigRepoWidget pipelinesVM={this.pipelinesVM}/>
      </div>
    </div>;
  }

}
