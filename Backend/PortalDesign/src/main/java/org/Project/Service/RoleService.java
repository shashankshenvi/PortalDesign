package org.Project.Service;

import org.Project.dto.RoleDto;
import org.springframework.http.ResponseEntity;

public interface RoleService {

    ResponseEntity<?> createRole(RoleDto role);

    ResponseEntity<?> getRoles();

    ResponseEntity<?> approveRole(String roleName, Integer roleId, String modifiedBy, String status);

    ResponseEntity<?> getPendingRoles();

    ResponseEntity<?> updateRole(RoleDto role);
}
