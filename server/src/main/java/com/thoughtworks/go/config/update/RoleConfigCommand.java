/*
 * Copyright 2018 ThoughtWorks, Inc.
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

package com.thoughtworks.go.config.update;

import com.thoughtworks.go.config.BasicCruiseConfig;
import com.thoughtworks.go.config.CruiseConfig;
import com.thoughtworks.go.config.Role;
import com.thoughtworks.go.config.commands.EntityConfigUpdateCommand;
import com.thoughtworks.go.server.domain.Username;
import com.thoughtworks.go.server.service.GoConfigService;
import com.thoughtworks.go.server.service.result.LocalizedOperationResult;
import com.thoughtworks.go.validation.RolesConfigUpdateValidator;

import static com.thoughtworks.go.i18n.LocalizedMessage.forbiddenToEdit;
import static com.thoughtworks.go.serverhealth.HealthStateType.forbidden;

abstract class RoleConfigCommand implements EntityConfigUpdateCommand<Role> {
    protected final GoConfigService goConfigService;
    protected final Role role;
    protected final Username currentUser;
    protected final LocalizedOperationResult result;
    protected Role preprocessedRole;

    public RoleConfigCommand(GoConfigService goConfigService, Role role, Username currentUser, LocalizedOperationResult result) {
        this.goConfigService = goConfigService;
        this.role = role;
        this.currentUser = currentUser;
        this.result = result;
    }

    @Override
    public void clearErrors() {
        BasicCruiseConfig.clearErrors(role);
    }

    @Override
    public Role getPreprocessedEntityConfig() {
        return preprocessedRole;
    }

    @Override
    public boolean canContinue(CruiseConfig cruiseConfig) {
        return isUserAuthorized();
    }

    @Override
    public boolean isValid(CruiseConfig preprocessedConfig) {
        preprocessedRole = preprocessedConfig.server().security().getRoles().findByNameAndType(role.getName(), role.getClass());

        if (!preprocessedRole.validateTree(RolesConfigUpdateValidator.validationContextWithSecurityConfig(preprocessedConfig))) {
            BasicCruiseConfig.copyErrors(preprocessedRole, role);
            return false;
        }

        return true;
    }

    final Role findExistingRole(CruiseConfig cruiseConfig) {
        return cruiseConfig.server().security().getRoles().findByName(role.getName());
    }

    @Override
    public final boolean isUserAuthorized() {
        if (goConfigService.isUserAdmin(currentUser)) {
            return true;
        }
        result.forbidden(forbiddenToEdit(), forbidden());
        return false;
    }

}
