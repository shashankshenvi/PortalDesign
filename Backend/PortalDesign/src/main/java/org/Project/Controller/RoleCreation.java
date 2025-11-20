package org.Project.Controller;

import org.Project.Entity.RoleMaster;
import org.Project.Service.RoleService;
import org.Project.dto.RoleDto;
import org.Project.dto.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/role/")
public class RoleCreation {

    @Autowired
    RoleService roleService;

    @PostMapping("roleCreation")
    public ResponseEntity<?> createRole(@RequestBody RoleDto role) {
        return roleService.createRole(role);
    }


    @GetMapping("getRoles")
    public ResponseEntity<?> getRoles() {
        return roleService.getRoles();
    }

    @PostMapping("approveRole")
    public ResponseEntity<?> approveRole(@RequestBody Map<String, Object> requestData) {
        String roleName = (String) requestData.get("roleName");
        String modifiedBy = (String) requestData.get("modifiedBy");
        String status = (String) requestData.get("status");
        Integer roleId = (Integer) requestData.get("roleId");
        return roleService.approveRole(roleName,roleId,modifiedBy,status);
    }

    @GetMapping("getPendingRoles")
    public ResponseEntity<?> getPendingRoles() {
        return roleService.getPendingRoles();
    }

    @PostMapping("updateRole")
    public ResponseEntity<?> updateRole(@RequestBody RoleDto role) {
        return roleService.updateRole(role);
    }

}
