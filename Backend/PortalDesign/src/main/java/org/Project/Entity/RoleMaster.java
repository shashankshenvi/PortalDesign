package org.Project.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "TBL_ROLE_MASTER")
public class RoleMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ROLE_ID")
    Integer roleId;

    @Column(name = "ROLE_NAME", nullable = false)
    String roleName;

    @Column(name = "ROLE_DESC", nullable = false)
    String roleDesc;

    @Column(name = "CREATED_BY")
    String createdBy;

    @Column(name = "CREATED_DATE")
    LocalDateTime createdDate;

    @Column(name = "MODIFIED_BY")
    String modifiedBy;

    @Column(name = "MODIFIED_DATE")
    LocalDateTime modifiedDate;

    @Column(name = "ACTIVE_FLAG")
    Boolean activeFlag;
}
