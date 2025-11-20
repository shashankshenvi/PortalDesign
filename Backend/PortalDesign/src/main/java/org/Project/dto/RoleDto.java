package org.Project.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RoleDto {

    Integer roleId;
    String roleName;
    String roleDesc;
    String createdBy;
    LocalDateTime createdDate;
    String modifiedBy;
    LocalDateTime modifiedDate;
    Boolean activeFlag;
}
